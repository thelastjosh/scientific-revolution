import type { Express, Request, Response } from "express";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { networkTasks } from "@shared/schema";
import { getDb } from "../db";
import { getResendClient } from "./resend-client";
import { appendCommunicationEvent } from "../network-communication-service";
import { decodeTaskEmailRouteToken, tokenFromReplyLocalPart } from "../task-email-route-token";
import { resolveOrganizationIdForTask } from "../task-organization";
import { dispatchToOrgAgent } from "../network-dispatch-service";
import { getAgentByOrganizationId } from "../organization-agent-service";

function rawBodyUtf8(req: Request): string {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (raw && Buffer.isBuffer(raw)) return raw.toString("utf8");
  return JSON.stringify(req.body ?? {});
}

function parseMailbox(addr: string): string {
  const t = addr.trim();
  const m = t.match(/<([^>]+)>/);
  if (m?.[1]) return m[1].trim();
  return t;
}

function findRouteTokenInRecipients(addresses: string[]): string | null {
  for (const raw of addresses) {
    const email = parseMailbox(raw).toLowerCase();
    const at = email.lastIndexOf("@");
    if (at <= 0) continue;
    const local = email.slice(0, at);
    const tok = tokenFromReplyLocalPart(local);
    if (tok) return tok;
  }
  return null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function inboundBodyText(text: string | null | undefined, html: string | null | undefined): string {
  const t = text?.trim();
  if (t) return t.slice(0, 100_000);
  const h = html?.trim();
  if (h) return stripHtml(h).slice(0, 100_000);
  return "";
}

/**
 * Resend inbound webhook: `email.received` → fetch full message, route by Reply-To token, append timeline + task history.
 */
export function registerResendInboundWebhook(app: Express): void {
  app.post("/internal/webhooks/resend/inbound", async (req: Request, res: Response) => {
    const webhookSecret = process.env.RESEND_WEBHOOK_SIGNING_SECRET?.trim();
    if (!webhookSecret) {
      console.warn("[resend-inbound] RESEND_WEBHOOK_SIGNING_SECRET not set");
      return res.status(503).json({ message: "Inbound webhook not configured" });
    }

    const id = req.get("svix-id") ?? "";
    const timestamp = req.get("svix-timestamp") ?? "";
    const signature = req.get("svix-signature") ?? "";
    if (!id || !timestamp || !signature) {
      return res.status(400).json({ message: "Missing Svix signature headers" });
    }

    const payload = rawBodyUtf8(req);
    const resendForVerify = new Resend(process.env.RESEND_API_KEY ?? "");
    let event: { type: string; data: { email_id?: string } };
    try {
      event = resendForVerify.webhooks.verify({
        payload,
        headers: { id, timestamp, signature },
        webhookSecret,
      }) as { type: string; data: { email_id?: string } };
    } catch (e) {
      console.warn("[resend-inbound] verify failed", e);
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    if (event.type !== "email.received") {
      return res.status(200).json({ ok: true, ignored: event.type });
    }

    const emailId = event.data?.email_id;
    if (!emailId) {
      console.warn("[resend-inbound] email.received without email_id");
      return res.status(400).json({ message: "Missing email_id" });
    }

    const resend = getResendClient();
    if (!resend) {
      console.warn("[resend-inbound] RESEND_API_KEY not configured");
      return res.status(503).json({ message: "Resend API not configured" });
    }

    const full = await resend.emails.receiving.get(emailId);
    if (full.error || !full.data) {
      console.warn("[resend-inbound] receiving.get failed", full.error?.message);
      return res.status(502).json({ message: full.error?.message ?? "Failed to load inbound email" });
    }

    const msg = full.data;
    const toList = [...(msg.to ?? [])];
    const token = findRouteTokenInRecipients(toList);
    if (!token) {
      console.info("[resend-inbound] no routing token in recipients", { emailId, to: toList });
      return res.status(200).json({ ok: true, routed: false });
    }

    const decoded = decodeTaskEmailRouteToken(token);
    if (!decoded) {
      console.info("[resend-inbound] invalid or expired route token", { emailId });
      return res.status(200).json({ ok: true, routed: false });
    }

    const db = getDb();
    if (!db) {
      return res.status(503).json({ message: "Database not configured" });
    }

    const taskRows = await db.select().from(networkTasks).where(eq(networkTasks.id, decoded.taskId)).limit(1);
    const task = taskRows[0];
    if (!task || task.ownerUserId !== decoded.ownerUserId) {
      console.info("[resend-inbound] unknown task or owner mismatch", { emailId, taskId: decoded.taskId });
      return res.status(200).json({ ok: true, routed: false });
    }

    const orgId = await resolveOrganizationIdForTask(task);
    const body = inboundBodyText(msg.text, msg.html);
    const traceId = `inbound-${emailId}`;
    const dedupeKey = `resend:inbound:${emailId}`;

    if (orgId) {
      try {
        await appendCommunicationEvent({
          organizationId: orgId,
          traceId,
          dedupeKey,
          direction: "inbound",
          channel: "email",
          threadKey: `email:${msg.message_id}`,
          taskId: task.id,
          actorExternalHandle: msg.from,
          body: body || "(no body)",
          payload: { emailId, subject: msg.subject },
        });
      } catch (e) {
        console.error("[resend-inbound] appendCommunicationEvent", e);
      }
    }

    const hist = [
      ...(task.history ?? []),
      {
        kind: "email_reply_received",
        at: new Date().toISOString(),
        from: msg.from,
        subject: msg.subject,
        emailId,
      },
    ];
    const refs = [...(task.externalRefs ?? []), { system: "resend", id: `inbound:${emailId}` }];

    await db
      .update(networkTasks)
      .set({
        history: hist,
        externalRefs: refs,
        updatedAt: new Date(),
      })
      .where(eq(networkTasks.id, task.id));

    if (orgId) {
      const agent = await getAgentByOrganizationId(orgId);
      const manifest = agent?.capabilityManifest ?? [];
      if (agent && agent.status === "active" && manifest.includes("email")) {
        const snippet = body.slice(0, 4000);
        void dispatchToOrgAgent(orgId, {
          traceId: `task-email-${emailId}`,
          networkApiLevel: "1",
          dispatchKind: "task_update",
          organizationId: orgId,
          payload: {
            taskId: task.id,
            source: "resend_inbound",
            emailId,
            from: msg.from,
            subject: msg.subject,
            bodySnippet: snippet,
          },
        }, agent.signingSecret).then((r) => {
          if (!r.ok) console.info("[resend-inbound] agent dispatch", r.reason);
        });
      }
    }

    return res.status(200).json({ ok: true, routed: true, taskId: task.id });
  });
}

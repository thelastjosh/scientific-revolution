import { eq } from "drizzle-orm";
import { networkTasks } from "@shared/schema";
import { getDb } from "../db";
import { appendCommunicationEvent } from "../network-communication-service";
import { decodeTaskEmailRouteToken, tokenFromReplyLocalPart } from "../task-email-route-token";
import { resolveOrganizationIdForTask } from "../task-organization";
import { dispatchToOrgAgent } from "../network-dispatch-service";
import { getAgentByOrganizationId } from "../organization-agent-service";
import type { EmailProviderId } from "./email-provider";

export function parseMailbox(addr: string): string {
  const t = addr.trim();
  const m = t.match(/<([^>]+)>/);
  if (m?.[1]) return m[1].trim();
  return t;
}

export function findRouteTokenInRecipients(addresses: string[]): string | null {
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

export function inboundBodyText(text: string | null | undefined, html: string | null | undefined): string {
  const t = text?.trim();
  if (t) return t.slice(0, 100_000);
  const h = html?.trim();
  if (h) return stripHtml(h).slice(0, 100_000);
  return "";
}

export async function applyInboundTaskEmailReply(input: {
  provider: EmailProviderId;
  externalEmailId: string;
  from: string;
  subject: string | null | undefined;
  bodyText: string | null | undefined;
  bodyHtml: string | null | undefined;
  messageIdForThread: string;
  recipientAddresses: string[];
}): Promise<{ routed: boolean; taskId?: string }> {
  const token = findRouteTokenInRecipients(input.recipientAddresses);
  if (!token) {
    console.info(`[${input.provider}-inbound] no routing token in recipients`, {
      emailId: input.externalEmailId,
      to: input.recipientAddresses,
    });
    return { routed: false };
  }

  const decoded = decodeTaskEmailRouteToken(token);
  if (!decoded) {
    console.info(`[${input.provider}-inbound] invalid or expired route token`, {
      emailId: input.externalEmailId,
    });
    return { routed: false };
  }

  const db = getDb();
  if (!db) {
    throw new Error("Database not configured");
  }

  const taskRows = await db.select().from(networkTasks).where(eq(networkTasks.id, decoded.taskId)).limit(1);
  const task = taskRows[0];
  if (!task || task.ownerUserId !== decoded.ownerUserId) {
    console.info(`[${input.provider}-inbound] unknown task or owner mismatch`, {
      emailId: input.externalEmailId,
      taskId: decoded.taskId,
    });
    return { routed: false };
  }

  const orgId = await resolveOrganizationIdForTask(task);
  const body = inboundBodyText(input.bodyText, input.bodyHtml);
  const traceId = `inbound-${input.externalEmailId}`;
  const dedupeKey = `${input.provider}:inbound:${input.externalEmailId}`;

  if (orgId) {
    try {
      await appendCommunicationEvent({
        organizationId: orgId,
        traceId,
        dedupeKey,
        direction: "inbound",
        channel: "email",
        threadKey: `email:${input.messageIdForThread}`,
        taskId: task.id,
        actorExternalHandle: input.from,
        body: body || "(no body)",
        payload: { emailId: input.externalEmailId, subject: input.subject },
      });
    } catch (e) {
      console.error(`[${input.provider}-inbound] appendCommunicationEvent`, e);
    }
  }

  const hist = [
    ...(task.history ?? []),
    {
      kind: "email_reply_received",
      at: new Date().toISOString(),
      from: input.from,
      subject: input.subject,
      emailId: input.externalEmailId,
      provider: input.provider,
    },
  ];
  const refs = [
    ...(task.externalRefs ?? []),
    { system: input.provider, id: `inbound:${input.externalEmailId}` },
  ];

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
      void dispatchToOrgAgent(
        orgId,
        {
          traceId: `task-email-${input.externalEmailId}`,
          networkApiLevel: "1",
          dispatchKind: "task_update",
          organizationId: orgId,
          payload: {
            taskId: task.id,
            source: `${input.provider}_inbound`,
            emailId: input.externalEmailId,
            from: input.from,
            subject: input.subject,
            bodySnippet: snippet,
          },
        },
        agent.signingSecret,
      ).then((r) => {
        if (!r.ok) console.info(`[${input.provider}-inbound] agent dispatch`, r.reason);
      });
    }
  }

  return { routed: true, taskId: task.id };
}

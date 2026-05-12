import type { NetworkTask } from "@shared/schema";
import { emailEvents, networkTasks } from "@shared/schema";
import { getResendClient } from "./resend-client";
import { getCommTemplatesForOrg } from "../network-templates-service";
import { appendCommunicationEvent } from "../network-communication-service";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { encodeTaskEmailRouteToken, replyLocalPartFromToken } from "../task-email-route-token";
import {
  resolveOrganizationIdForTask,
  taskHandoffAlreadySent,
} from "../task-organization";

const HANDOFF_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function fromEmail(): string {
  return process.env.EMAIL_FROM?.trim() || "onboarding@scientific-revolution.local";
}

/** Domain for Message-Id / Reply-To (must match verified Resend domain). */
export function taskEmailDomain(): string {
  const explicit = process.env.TASK_EMAIL_DOMAIN?.trim();
  if (explicit) return explicit.replace(/^@+/, "");
  const from = fromEmail();
  const m = from.match(/<([^>]+)>/);
  const addr = m ? m[1]!.trim() : from.trim();
  const at = addr.lastIndexOf("@");
  if (at === -1) return "scientific-revolution.local";
  return addr.slice(at + 1);
}

function parseFirstEmailChannel(task: NetworkTask): string | null {
  const ch = task.deliveryChannels ?? [];
  const email = ch.find((c) => c.kind === "email" && typeof c.address === "string" && c.address.includes("@"));
  return email?.address.trim() ?? null;
}

function messageIdForTask(taskId: string): string {
  const host = taskEmailDomain();
  const stamp = Date.now().toString(36);
  return `<task-${taskId}-${stamp}@${host}>`;
}

async function logEmailEvent(input: {
  userId?: string | null;
  emailType: string;
  recipient: string;
  subject: string;
  status: "sent" | "failed" | "skipped";
  errorMessage?: string | null;
  payload?: Record<string, unknown>;
}) {
  const db = getDb();
  if (!db) return;
  try {
    await db.insert(emailEvents).values({
      userId: input.userId ?? null,
      inviteToken: null,
      emailType: input.emailType,
      recipient: input.recipient,
      subject: input.subject,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
      payload: input.payload ?? null,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Send task handoff email when task becomes open. Idempotent per taskHandoffAlreadySent.
 * Returns skip reason or sent result.
 */
export async function sendTaskHandoffEmailIfNeeded(input: {
  task: NetworkTask;
  previousStatus: string;
}): Promise<{ ok: true; skipped?: string } | { ok: false; reason: string }> {
  const { task, previousStatus } = input;
  if (task.status !== "open") {
    return { ok: true, skipped: "not_open" };
  }
  if (previousStatus === "open") {
    return { ok: true, skipped: "already_open" };
  }
  if (taskHandoffAlreadySent(task)) {
    return { ok: true, skipped: "already_sent" };
  }
  const to = parseFirstEmailChannel(task);
  if (!to) {
    return { ok: true, skipped: "no_email_channel" };
  }

  const orgId = await resolveOrganizationIdForTask(task);
  if (!orgId) {
    await logEmailEvent({
      userId: task.ownerUserId,
      emailType: "task_handoff",
      recipient: to,
      subject: task.title,
      status: "skipped",
      errorMessage: "no_organization_for_timeline",
      payload: { taskId: task.id },
    });
    return { ok: false, reason: "no_organization_for_timeline" };
  }

  const resend = getResendClient();
  const subject = `[Task] ${task.title}`;
  if (!resend) {
    await logEmailEvent({
      userId: task.ownerUserId,
      emailType: "task_handoff",
      recipient: to,
      subject,
      status: "skipped",
      errorMessage: "RESEND_API_KEY not configured",
      payload: { taskId: task.id },
    });
    return { ok: false, reason: "resend_not_configured" };
  }

  try {
    encodeTaskEmailRouteToken({
      taskId: task.id,
      ownerUserId: task.ownerUserId,
      exp: Date.now() + HANDOFF_TTL_MS,
    }); // throws if no secret
  } catch {
    await logEmailEvent({
      userId: task.ownerUserId,
      emailType: "task_handoff",
      recipient: to,
      subject,
      status: "skipped",
      errorMessage: "TASK_EMAIL_ROUTE_SECRET not configured",
      payload: { taskId: task.id },
    });
    return { ok: false, reason: "route_secret_missing" };
  }

  const token = encodeTaskEmailRouteToken({
    taskId: task.id,
    ownerUserId: task.ownerUserId,
    exp: Date.now() + HANDOFF_TTL_MS,
  });
  const domain = taskEmailDomain();
  const replyLocal = replyLocalPartFromToken(token);
  const replyTo = `${replyLocal}@${domain}`;
  const messageId = messageIdForTask(task.id);
  const templates = await getCommTemplatesForOrg(orgId);

  const html = `
    <p>${escapeHtml(templates.firstContactEmail.openingLine)}</p>
    <p><b>${escapeHtml(task.title)}</b></p>
    <p>${escapeHtml(task.description).replace(/\n/g, "<br/>")}</p>
    <p>${escapeHtml(templates.firstContactEmail.replyExpectation)}</p>
    <p style="font-size:12px;color:#666">Task ID: ${escapeHtml(task.id)}</p>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail(),
      to,
      subject,
      html,
      replyTo: [replyTo],
      headers: {
        "Message-ID": messageId,
      },
    });
    if (error) {
      await logEmailEvent({
        userId: task.ownerUserId,
        emailType: "task_handoff",
        recipient: to,
        subject,
        status: "failed",
        errorMessage: error.message,
        payload: { taskId: task.id },
      });
      return { ok: false, reason: error.message };
    }
    const resendId = data?.id ?? "unknown";
    const traceId = `handoff-${task.id}-${Date.now()}`;
    await appendCommunicationEvent({
      organizationId: orgId,
      traceId,
      dedupeKey: `resend:handoff:${resendId}`,
      direction: "outbound",
      channel: "email",
      threadKey: `email:${messageId.replace(/^<|>$/g, "")}`,
      taskId: task.id,
      actorExternalHandle: to,
      body: `Handoff: ${task.title}`,
      payload: { resendId, messageId, replyTo },
    });

    const db = getDb();
    if (db) {
      const refs = [...(task.externalRefs ?? []), { system: "resend", id: `handoff:${resendId}` }];
      const hist = [
        ...(task.history ?? []),
        {
          kind: "handoff_email_sent",
          at: new Date().toISOString(),
          to,
          resendId,
          messageId,
        },
      ];
      await db
        .update(networkTasks)
        .set({
          externalRefs: refs,
          history: hist,
          updatedAt: new Date(),
        })
        .where(eq(networkTasks.id, task.id));
    }

    await logEmailEvent({
      userId: task.ownerUserId,
      emailType: "task_handoff",
      recipient: to,
      subject,
      status: "sent",
      payload: { taskId: task.id, resendId },
    });
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message ?? "send_failed";
    await logEmailEvent({
      userId: task.ownerUserId,
      emailType: "task_handoff",
      recipient: to,
      subject,
      status: "failed",
      errorMessage: msg,
      payload: { taskId: task.id },
    });
    return { ok: false, reason: msg };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

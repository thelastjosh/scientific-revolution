import { and, asc, eq } from "drizzle-orm";
import { adminEvents, chatMessages, chatSessions, emailEvents, users } from "@shared/schema";
import { getDb } from "./db";
import { getResendClient } from "./email/resend-client";

function fromEmail(): string {
  return process.env.EMAIL_FROM?.trim() || "onboarding@scientific-revolution.local";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

export type AdminNotifyResult =
  | { ok: true; detail?: string }
  | { ok: false; reason: string; status?: number };

/**
 * Send a one-off test email to the member's login email (Resend).
 */
export async function adminSendTestEmail(input: {
  targetUserId: string;
  actorUserId: string;
  subject?: string;
  body?: string;
}): Promise<AdminNotifyResult> {
  const db = getDb();
  if (!db) return { ok: false, reason: "database_not_configured", status: 503 };

  const rows = await db.select().from(users).where(eq(users.id, input.targetUserId)).limit(1);
  const user = rows[0];
  if (!user) return { ok: false, reason: "user_not_found", status: 404 };

  const resend = getResendClient();
  if (!resend) {
    await logEmailEvent({
      userId: input.targetUserId,
      emailType: "admin_test",
      recipient: user.email,
      subject: input.subject ?? "[Sail] Admin test email",
      status: "skipped",
      errorMessage: "RESEND_API_KEY not configured",
    });
    return { ok: false, reason: "resend_not_configured" };
  }

  const subject = (input.subject?.trim() || "[Sail] Admin test email").slice(0, 200);
  const body =
    input.body?.trim() ||
    "This is a test message from the Sail admin console. If you received this, outbound email is working.";
  const html = `<p>${escapeHtml(body).replace(/\n/g, "<br/>")}</p>`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail(),
      to: user.email,
      subject,
      html,
    });
    if (error) {
      await logEmailEvent({
        userId: input.targetUserId,
        emailType: "admin_test",
        recipient: user.email,
        subject,
        status: "failed",
        errorMessage: error.message,
      });
      return { ok: false, reason: error.message };
    }
    await logEmailEvent({
      userId: input.targetUserId,
      emailType: "admin_test",
      recipient: user.email,
      subject,
      status: "sent",
      payload: { resendId: data?.id ?? null, actorUserId: input.actorUserId },
    });
    await db.insert(adminEvents).values({
      actorUserId: input.actorUserId,
      eventType: "admin_test_email",
      targetType: "user",
      targetId: input.targetUserId,
      payload: { subject, resendId: data?.id ?? null },
    });
    return { ok: true, detail: data?.id ?? "sent" };
  } catch (e) {
    const msg = (e as Error).message ?? "send_failed";
    await logEmailEvent({
      userId: input.targetUserId,
      emailType: "admin_test",
      recipient: user.email,
      subject,
      status: "failed",
      errorMessage: msg,
    });
    return { ok: false, reason: msg };
  }
}

/**
 * Append an assistant message to the member's primary workspace chat (visible on next dashboard load).
 */
export async function adminSendTestWorkspaceMessage(input: {
  targetUserId: string;
  actorUserId: string;
  body?: string;
}): Promise<AdminNotifyResult> {
  const db = getDb();
  if (!db) return { ok: false, reason: "database_not_configured", status: 503 };

  const userRows = await db.select().from(users).where(eq(users.id, input.targetUserId)).limit(1);
  if (!userRows[0]) return { ok: false, reason: "user_not_found", status: 404 };

  const wsRows = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.userId, input.targetUserId), eq(chatSessions.type, "workspace")))
    .orderBy(asc(chatSessions.createdAt))
    .limit(1);
  const ws = wsRows[0];
  if (!ws) {
    return { ok: false, reason: "no_workspace_session", status: 422 };
  }

  const text =
    input.body?.trim() ||
    "[Admin test] This is a test message from the operations console. It appears in your workspace chat.";

  await db.insert(chatMessages).values({
    sessionId: ws.id,
    role: "assistant",
    content: text.slice(0, 8000),
  });

  await db.insert(adminEvents).values({
    actorUserId: input.actorUserId,
    eventType: "admin_test_workspace_message",
    targetType: "user",
    targetId: input.targetUserId,
    payload: { sessionId: ws.id, preview: text.slice(0, 200) },
  });

  return { ok: true, detail: ws.id };
}

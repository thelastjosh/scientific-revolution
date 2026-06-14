import type { Express, Request, Response } from "express";
import { Resend } from "resend";
import { getResendClient } from "./resend-client";
import { applyInboundTaskEmailReply } from "./apply-inbound-task-email";

function rawBodyUtf8(req: Request): string {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (raw && Buffer.isBuffer(raw)) return raw.toString("utf8");
  return JSON.stringify(req.body ?? {});
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

    try {
      const result = await applyInboundTaskEmailReply({
        provider: "resend",
        externalEmailId: emailId,
        from: msg.from,
        subject: msg.subject,
        bodyText: msg.text,
        bodyHtml: msg.html,
        messageIdForThread: msg.message_id,
        recipientAddresses: toList,
      });
      return res.status(200).json({ ok: true, ...result });
    } catch (e) {
      const errMsg = (e as Error).message ?? "processing_failed";
      if (errMsg === "Database not configured") {
        return res.status(503).json({ message: errMsg });
      }
      console.error("[resend-inbound] processing error", e);
      return res.status(500).json({ message: errMsg });
    }
  });
}

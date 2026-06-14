import type { Express, Request, Response } from "express";
import { Webhook } from "svix";
import { serialization } from "agentmail";
import { getAgentMailClient } from "./agentmail-client";
import { applyInboundTaskEmailReply } from "./apply-inbound-task-email";

function rawBodyUtf8(req: Request): string {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (raw && Buffer.isBuffer(raw)) return raw.toString("utf8");
  return JSON.stringify(req.body ?? {});
}

const RECEIVED_EVENT_TYPES = new Set([
  "message.received",
  "message.received.spam",
  "message.received.blocked",
  "message.received.unauthenticated",
]);

/**
 * AgentMail inbound webhook: `message.received` → route by Reply-To token, append timeline + task history.
 */
export function registerAgentMailInboundWebhook(app: Express): void {
  app.post("/internal/webhooks/agentmail/inbound", async (req: Request, res: Response) => {
    const webhookSecret = process.env.AGENTMAIL_WEBHOOK_SIGNING_SECRET?.trim();
    if (!webhookSecret) {
      console.warn("[agentmail-inbound] AGENTMAIL_WEBHOOK_SIGNING_SECRET not set");
      return res.status(503).json({ message: "Inbound webhook not configured" });
    }

    const id = req.get("svix-id") ?? "";
    const timestamp = req.get("svix-timestamp") ?? "";
    const signature = req.get("svix-signature") ?? "";
    if (!id || !timestamp || !signature) {
      return res.status(400).json({ message: "Missing Svix signature headers" });
    }

    const payload = rawBodyUtf8(req);
    let event: Record<string, unknown>;
    try {
      const wh = new Webhook(webhookSecret);
      event = wh.verify(payload, {
        "svix-id": id,
        "svix-timestamp": timestamp,
        "svix-signature": signature,
      }) as Record<string, unknown>;
    } catch (e) {
      console.warn("[agentmail-inbound] verify failed", e);
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const eventType = String(event.event_type ?? "");
    if (!RECEIVED_EVENT_TYPES.has(eventType)) {
      return res.status(200).json({ ok: true, ignored: eventType });
    }

    let parsed;
    try {
      parsed = await serialization.events.MessageReceivedEvent.parse(event);
    } catch (e) {
      console.warn("[agentmail-inbound] parse failed", e);
      return res.status(400).json({ message: "Invalid message.received payload" });
    }
    if (!parsed.ok) {
      console.warn("[agentmail-inbound] parse invalid", parsed.errors);
      return res.status(400).json({ message: "Invalid message.received payload" });
    }

    const message = parsed.value.message;
    const emailId = message.messageId;
    const inboxId = message.inboxId;

    let bodyText = message.extractedText ?? message.text;
    let bodyHtml = message.extractedHtml ?? message.html;
    if (!bodyText && !bodyHtml) {
      const client = getAgentMailClient();
      if (client) {
        try {
          const full = await client.inboxes.messages.get(inboxId, emailId);
          bodyText = full.extractedText ?? full.text;
          bodyHtml = full.extractedHtml ?? full.html;
        } catch (e) {
          console.warn("[agentmail-inbound] messages.get failed", e);
        }
      }
    }

    try {
      const result = await applyInboundTaskEmailReply({
        provider: "agentmail",
        externalEmailId: emailId,
        from: message.from,
        subject: message.subject,
        bodyText,
        bodyHtml,
        messageIdForThread: emailId,
        recipientAddresses: message.to ?? [],
      });
      return res.status(200).json({ ok: true, ...result });
    } catch (e) {
      const msg = (e as Error).message ?? "processing_failed";
      if (msg === "Database not configured") {
        return res.status(503).json({ message: msg });
      }
      console.error("[agentmail-inbound] processing error", e);
      return res.status(500).json({ message: msg });
    }
  });
}

import type { ConnectorCredentialPayload, SendResult, TelegramCredentialPayload } from "@shared/connectors/types";
import type { networkTasks } from "@shared/schema";
import type { ConnectorAdapter, CommTemplates } from "../types";

function getBotToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

function parseTelegramPayload(raw: string): TelegramCredentialPayload | null {
  try {
    const j = JSON.parse(raw) as { chatId?: unknown };
    if (typeof j.chatId === "string" && /^-?\d{5,20}$/.test(j.chatId.trim())) {
      return { chatId: j.chatId.trim() };
    }
    if (typeof j.chatId === "number" && Number.isFinite(j.chatId)) {
      return { chatId: String(j.chatId) };
    }
  } catch {
    const t = raw.trim();
    if (/^-?\d{5,20}$/.test(t)) return { chatId: t };
  }
  return null;
}

export const telegramAdapter: ConnectorAdapter = {
  id: "telegram",

  parseCredentialRef(raw: string): ConnectorCredentialPayload | null {
    return parseTelegramPayload(raw);
  },

  validateSetup(payload: unknown) {
    const p = payload as { chatId?: unknown; accountLabel?: unknown };
    const chatId =
      typeof p?.chatId === "string"
        ? p.chatId.trim()
        : typeof p?.chatId === "number"
          ? String(p.chatId)
          : "";
    if (!/^-?\d{5,20}$/.test(chatId)) {
      return { ok: false as const, message: "Telegram chat ID must be a numeric ID (5–20 digits)." };
    }
    const normalized: TelegramCredentialPayload = { chatId };
    return { ok: true as const, normalized, address: chatId };
  },

  isPlatformConfigured(): boolean {
    return Boolean(getBotToken());
  },

  async sendText(input: { address: string; text: string }): Promise<SendResult> {
    const token = getBotToken();
    if (!token) return { ok: false, reason: "telegram_not_configured" };

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: input.address,
          text: input.text.slice(0, 4096),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        description?: string;
        result?: { message_id?: number };
      };
      if (!res.ok || !data.ok) {
        return { ok: false, reason: data.description ?? `telegram_http_${res.status}` };
      }
      const messageId = data.result?.message_id;
      if (messageId == null) return { ok: false, reason: "telegram_no_message_id" };
      return { ok: true, externalId: String(messageId) };
    } catch (e) {
      return { ok: false, reason: (e as Error).message ?? "telegram_send_failed" };
    }
  },

  formatHandoffMessage(task: typeof networkTasks.$inferSelect, templates: CommTemplates): string {
    const lines = [
      `[Task] ${task.title}`,
      "",
      templates.firstContactEmail.openingLine,
      "",
      task.description.trim(),
      "",
      templates.firstContactEmail.replyExpectation,
      "",
      "Note: replying in Telegram is not connected yet — use Sail workspace or email if configured.",
      "",
      `Task ID: ${task.id}`,
    ];
    return lines.join("\n").slice(0, 4096);
  },

  formatTestMessage(): string {
    return "This is a test message from Sail. If you received this, your Telegram connector is working.";
  },

  maskCredentialPreview(payload: ConnectorCredentialPayload): string {
    const chatId = (payload as TelegramCredentialPayload).chatId ?? "";
    if (chatId.length <= 4) return "chat ····";
    return `chat ····${chatId.slice(-4)}`;
  },
};

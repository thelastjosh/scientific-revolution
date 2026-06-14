export type EmailProviderId = "resend" | "agentmail";

function agentMailConfigured(): boolean {
  return Boolean(
    process.env.AGENTMAIL_API_KEY?.trim() && process.env.AGENTMAIL_INBOX_ID?.trim(),
  );
}

export function getEmailProvider(): EmailProviderId | null {
  const explicit = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (explicit === "agentmail") {
    return agentMailConfigured() ? "agentmail" : null;
  }
  if (explicit === "resend") {
    return process.env.RESEND_API_KEY?.trim() ? "resend" : null;
  }
  if (agentMailConfigured()) return "agentmail";
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  return null;
}

export function emailProviderConfigured(): boolean {
  return getEmailProvider() !== null;
}

export function emailNotConfiguredReason(): string {
  const provider = getEmailProvider();
  if (provider === "agentmail") return "agentmail_not_configured";
  if (provider === "resend") {
    return "RESEND_API_KEY not configured";
  }
  const explicit = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (explicit === "agentmail") {
    if (!process.env.AGENTMAIL_API_KEY?.trim()) return "AGENTMAIL_API_KEY not configured";
    if (!process.env.AGENTMAIL_INBOX_ID?.trim()) return "AGENTMAIL_INBOX_ID not configured";
  }
  return "EMAIL_PROVIDER not configured (set AGENTMAIL_API_KEY + AGENTMAIL_INBOX_ID, or RESEND_API_KEY)";
}

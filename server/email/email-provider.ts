export type EmailProviderId = "resend" | "agentmail";

export function getEmailProvider(): EmailProviderId | null {
  const explicit = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (explicit === "agentmail" || explicit === "resend") {
    return explicit;
  }
  if (process.env.AGENTMAIL_API_KEY?.trim()) return "agentmail";
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  return null;
}

export function emailProviderConfigured(): boolean {
  return getEmailProvider() !== null;
}

export function emailNotConfiguredReason(): string {
  const provider = getEmailProvider();
  if (provider === "agentmail") {
    if (!process.env.AGENTMAIL_API_KEY?.trim()) return "AGENTMAIL_API_KEY not configured";
    if (!process.env.AGENTMAIL_INBOX_ID?.trim()) return "AGENTMAIL_INBOX_ID not configured";
    return "agentmail_not_configured";
  }
  if (provider === "resend") {
    return "RESEND_API_KEY not configured";
  }
  return "EMAIL_PROVIDER not configured (set AGENTMAIL_API_KEY or RESEND_API_KEY)";
}

export type OnboardingBootstrap = {
  openingMessage: string;
  inviteFirstName: string | null;
};

export async function fetchOnboardingBootstrap(
  inviteToken?: string | null,
): Promise<OnboardingBootstrap> {
  const q = inviteToken
    ? `?invite=${encodeURIComponent(inviteToken)}`
    : "";
  const r = await fetch(`/api/onboarding/bootstrap${q}`);
  if (!r.ok) {
    throw new Error(`Bootstrap failed (${r.status})`);
  }
  return r.json() as Promise<OnboardingBootstrap>;
}

export async function postOnboardingChat(body: {
  inviteToken?: string | null;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<{ message: string }> {
  const r = await fetch("/api/onboarding/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as { message?: string };
  if (!r.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : `Chat failed (${r.status})`,
    );
  }
  return { message: data.message ?? "" };
}

export type OnboardingBootstrap = {
  openingMessage: string;
  inviteFirstName: string | null;
  inviteProfile: {
    token: string;
    firstName: string | null;
    email: string | null;
    description: string | null;
    researchSummary: string | null;
  } | null;
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

export type OnboardingContext = {
  persona: "invite_link" | "invite_no_link" | "general";
  inviteToken: string | null;
  inviteEmail: string | null;
  onboardingStep: string;
  summary: string | null;
  updatedAt: string;
};

export async function fetchOnboardingContext(): Promise<OnboardingContext | null> {
  const r = await fetch("/api/onboarding/context", { credentials: "include" });
  if (r.status === 401) return null;
  if (!r.ok) {
    throw new Error(`Onboarding context failed (${r.status})`);
  }
  const data = (await r.json()) as { context: OnboardingContext | null };
  return data.context;
}

export async function saveOnboardingContext(
  context: Omit<OnboardingContext, "updatedAt">,
): Promise<OnboardingContext> {
  const r = await fetch("/api/onboarding/context", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(context),
  });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    context?: OnboardingContext;
  };
  if (!r.ok || !data.context) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : `Save onboarding context failed (${r.status})`,
    );
  }
  return data.context;
}

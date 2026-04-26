type Persona = "invite_link" | "invite_no_link" | "general";

export type OnboardingContext = {
  persona: Persona;
  inviteToken: string | null;
  inviteEmail: string | null;
  onboardingStep: string;
  summary: string | null;
  updatedAt: string;
};

const byUser = new Map<string, OnboardingContext>();

export function getOnboardingContextForUser(
  userId: string,
): OnboardingContext | null {
  return byUser.get(userId) ?? null;
}

export function upsertOnboardingContextForUser(
  userId: string,
  context: Omit<OnboardingContext, "updatedAt">,
): OnboardingContext {
  const next: OnboardingContext = {
    ...context,
    updatedAt: new Date().toISOString(),
  };
  byUser.set(userId, next);
  return next;
}

import { eq } from "drizzle-orm";
import { onboardingContexts } from "@shared/schema";
import { getDb } from "./db";

type Persona = "invite_link" | "invite_no_link" | "general";

export type OnboardingContext = {
  persona: Persona;
  inviteToken: string | null;
  inviteEmail: string | null;
  onboardingStep: string;
  summary: string | null;
  updatedAt: string;
};

export async function getOnboardingContextForUser(
  userId: string,
): Promise<OnboardingContext | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(onboardingContexts)
    .where(eq(onboardingContexts.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    persona: row.persona as Persona,
    inviteToken: row.inviteToken ?? null,
    inviteEmail: row.inviteEmail ?? null,
    onboardingStep: row.onboardingStep,
    summary: row.summary ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertOnboardingContextForUser(
  userId: string,
  context: Omit<OnboardingContext, "updatedAt">,
): Promise<OnboardingContext> {
  const db = getDb();
  if (!db) {
    throw new Error("Database is not configured");
  }
  const rows = await db
    .insert(onboardingContexts)
    .values({
      userId,
      persona: context.persona,
      inviteToken: context.inviteToken,
      inviteEmail: context.inviteEmail,
      onboardingStep: context.onboardingStep,
      summary: context.summary,
    })
    .onConflictDoUpdate({
      target: onboardingContexts.userId,
      set: {
        persona: context.persona,
        inviteToken: context.inviteToken,
        inviteEmail: context.inviteEmail,
        onboardingStep: context.onboardingStep,
        summary: context.summary,
        updatedAt: new Date(),
      },
    })
    .returning();
  const row = rows[0]!;
  return {
    persona: row.persona as Persona,
    inviteToken: row.inviteToken ?? null,
    inviteEmail: row.inviteEmail ?? null,
    onboardingStep: row.onboardingStep,
    summary: row.summary ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

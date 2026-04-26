import { eq } from "drizzle-orm";
import { pickHomeOpeningMessage } from "@shared/onboarding-opening";
import type { OnboardingInvite } from "@shared/schema";
import { onboardingInvites } from "@shared/schema";
import { getDb } from "./db";

const MAX_TOKEN_LEN = 128;

/** In-memory invites when Postgres is unavailable (dev only). */
const memInvites = new Map<string, OnboardingInvite>();

export function normalizeInviteToken(raw: string | undefined | null): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t || t.length > MAX_TOKEN_LEN) return null;
  return t;
}

export async function getInviteByToken(
  token: string | null,
): Promise<OnboardingInvite | null> {
  if (!token) return null;
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(onboardingInvites)
      .where(eq(onboardingInvites.token, token))
      .limit(1);
    return rows[0] ?? null;
  }
  return memInvites.get(token) ?? null;
}

/** Dev-only: register an invite in memory when DB is off. */
export function memRegisterInvite(invite: OnboardingInvite): void {
  memInvites.set(invite.token, invite);
}

export function openingMessageFromInvite(_invite: OnboardingInvite | null): string {
  return pickHomeOpeningMessage();
}

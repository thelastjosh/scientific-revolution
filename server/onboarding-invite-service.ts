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
    try {
      const rows = await db
        .select()
        .from(onboardingInvites)
        .where(eq(onboardingInvites.token, token))
        .limit(1);
      return rows[0] ?? null;
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (
        err.code === "42703" &&
        typeof err.message === "string" &&
        (err.message.includes("creator_user_id") ||
          err.message.includes("organization_id") ||
          err.message.includes("inviter_relationship_label") ||
          err.message.includes("inviter_context_summary") ||
          err.message.includes("max_uses") ||
          err.message.includes("use_count") ||
          err.message.includes("expires_at") ||
          err.message.includes("revoked_at") ||
          err.message.includes("last_used_at"))
      ) {
        const rows = await db
          .select({
            token: onboardingInvites.token,
            firstName: onboardingInvites.firstName,
            email: onboardingInvites.email,
            description: onboardingInvites.description,
            researchSummary: onboardingInvites.researchSummary,
            createdAt: onboardingInvites.createdAt,
          })
          .from(onboardingInvites)
          .where(eq(onboardingInvites.token, token))
          .limit(1);
        const row = rows[0];
        if (!row) return null;
        return {
          ...row,
          creatorUserId: null,
          organizationId: null,
          inviterRelationshipLabel: null,
          inviterContextSummary: null,
          maxUses: null,
          useCount: 0,
          expiresAt: null,
          revokedAt: null,
          lastUsedAt: null,
        } as OnboardingInvite;
      }
      throw e;
    }
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

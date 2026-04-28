import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { onboardingInvites } from "@shared/schema";
import type { OnboardingInvite } from "@shared/schema";
import { getDb } from "./db";

const TOKEN_LEN = 18;

export type InviteValidity =
  | "valid"
  | "expired_time"
  | "exhausted_uses"
  | "revoked"
  | "not_found";

export function evaluateInviteValidity(invite: OnboardingInvite | null, now = new Date()): InviteValidity {
  if (!invite) return "not_found";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt && invite.expiresAt.getTime() <= now.getTime()) return "expired_time";
  if (typeof invite.maxUses === "number" && invite.maxUses >= 0 && invite.useCount >= invite.maxUses) {
    return "exhausted_uses";
  }
  return "valid";
}

export async function createInvite(input: {
  creatorUserId: string;
  organizationId?: string | null;
  inviterRelationshipLabel?: string | null;
  inviterContextSummary?: string | null;
  firstName?: string | null;
  email?: string | null;
  description?: string | null;
  researchSummary?: string | null;
  maxUses?: number | null;
  expiresAt?: Date | null;
}) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const token = nanoid(TOKEN_LEN);
  try {
    const rows = await db
      .insert(onboardingInvites)
      .values({
        token,
        creatorUserId: input.creatorUserId,
        organizationId: input.organizationId ?? null,
        inviterRelationshipLabel: input.inviterRelationshipLabel ?? null,
        inviterContextSummary: input.inviterContextSummary ?? null,
        firstName: input.firstName ?? null,
        email: input.email ?? null,
        description: input.description ?? null,
        researchSummary: input.researchSummary ?? null,
        maxUses: input.maxUses ?? null,
        expiresAt: input.expiresAt ?? null,
      })
      .returning();
    return rows[0]!;
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "42703") {
      const description =
        input.description ??
        input.inviterContextSummary ??
        (input.organizationId ? `Organization context: ${input.organizationId}` : null);
      const result = await db.execute(sql`
        insert into onboarding_invites (token, first_name, email, description, research_summary)
        values (${token}, ${input.firstName ?? null}, ${input.email ?? null}, ${description}, ${input.researchSummary ?? null})
        returning token, first_name as "firstName", email, description, research_summary as "researchSummary", created_at as "createdAt"
      `);
      const row = (result.rows[0] ?? null) as
        | {
            token: string;
            firstName: string | null;
            email: string | null;
            description: string | null;
            researchSummary: string | null;
            createdAt: Date;
          }
        | null;
      if (!row) {
        throw new Error("Failed to create invite");
      }
      return {
        ...row,
        creatorUserId: input.creatorUserId,
        organizationId: input.organizationId ?? null,
        inviterRelationshipLabel: input.inviterRelationshipLabel ?? null,
        inviterContextSummary: input.inviterContextSummary ?? null,
        maxUses: input.maxUses ?? null,
        useCount: 0,
        expiresAt: input.expiresAt ?? null,
        revokedAt: null,
        lastUsedAt: null,
      } as OnboardingInvite;
    }
    throw e;
  }
}

export async function listInvitesForCreator(creatorUserId: string) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  try {
    return await db
      .select()
      .from(onboardingInvites)
      .where(eq(onboardingInvites.creatorUserId, creatorUserId))
      .orderBy(asc(onboardingInvites.createdAt));
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "42703") {
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
        .orderBy(asc(onboardingInvites.createdAt));
      return rows.map(
        (row) =>
          ({
            ...row,
            creatorUserId: creatorUserId,
            organizationId: null,
            inviterRelationshipLabel: null,
            inviterContextSummary: row.description ?? null,
            maxUses: null,
            useCount: 0,
            expiresAt: null,
            revokedAt: null,
            lastUsedAt: null,
          }) as OnboardingInvite,
      );
    }
    throw e;
  }
}

export async function revokeInvite(token: string, creatorUserId: string) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  try {
    const rows = await db
      .update(onboardingInvites)
      .set({
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(onboardingInvites.token, token),
          or(eq(onboardingInvites.creatorUserId, creatorUserId), isNull(onboardingInvites.creatorUserId)),
        ),
      )
      .returning();
    return rows[0] ?? null;
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "42703") {
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
        creatorUserId: creatorUserId,
        organizationId: null,
        inviterRelationshipLabel: null,
        inviterContextSummary: row.description ?? null,
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


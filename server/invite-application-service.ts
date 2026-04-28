import { and, eq } from "drizzle-orm";
import {
  inviteRedemptions,
  onboardingInvites,
  onboardingContexts,
  organizationMembers,
} from "@shared/schema";
import { createUserEdge } from "./graph-service";
import { getDb } from "./db";
import { evaluateInviteValidity } from "./invite-lifecycle-service";
import type { OnboardingInvite } from "@shared/schema";

export async function applyInviteContextToUser(input: {
  inviteToken: string;
  userId: string;
  userEmail: string;
  onboardingStep: string;
  sessionId?: string | null;
}) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const inviteRows = await db
    .select()
    .from(onboardingInvites)
    .where(eq(onboardingInvites.token, input.inviteToken))
    .limit(1)
    .catch(async (e) => {
      const err = e as { code?: string };
      if (err.code !== "42703") throw e;
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
        .where(eq(onboardingInvites.token, input.inviteToken))
        .limit(1);
      return rows.map(
        (row) =>
          ({
            ...row,
            creatorUserId: null,
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
    });
  const invite = inviteRows[0] ?? null;
  const validity = evaluateInviteValidity(invite);
  if (!invite || validity !== "valid") {
    return { applied: false as const, validity, invite: null };
  }

  let existingRedemption: Array<{ id: string }> = [];
  try {
    existingRedemption = await db
      .select({ id: inviteRedemptions.id })
      .from(inviteRedemptions)
      .where(
        and(
          eq(inviteRedemptions.inviteToken, input.inviteToken),
          eq(inviteRedemptions.redeemerUserId, input.userId),
        ),
      )
      .limit(1);
  } catch (e) {
    const err = e as { code?: string };
    if (err.code !== "42P01" && err.code !== "42703") throw e;
  }

  if (!existingRedemption[0]) {
    try {
      await db.insert(inviteRedemptions).values({
        inviteToken: input.inviteToken,
        redeemerUserId: input.userId,
        redeemerEmail: input.userEmail,
        sessionId: input.sessionId ?? null,
      });
    } catch (e) {
      const err = e as { code?: string };
      if (err.code !== "42P01" && err.code !== "42703" && err.code !== "23505") throw e;
    }
    try {
      await db
        .update(onboardingInvites)
        .set({
          useCount: invite.useCount + 1,
          lastUsedAt: new Date(),
        })
        .where(eq(onboardingInvites.token, input.inviteToken));
    } catch (e) {
      const err = e as { code?: string };
      if (err.code !== "42703") throw e;
    }
  }

  if (invite.organizationId) {
    const membership = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, invite.organizationId),
          eq(organizationMembers.userId, input.userId),
        ),
      )
      .limit(1);
    if (!membership[0]) {
      await db.insert(organizationMembers).values({
        organizationId: invite.organizationId,
        userId: input.userId,
        role: "member",
      });
    }
  }

  if (invite.creatorUserId && invite.creatorUserId !== input.userId) {
    await createUserEdge(
      invite.creatorUserId,
      input.userId,
      "invite",
      invite.inviterRelationshipLabel ?? null,
    );
  }

  await db
    .insert(onboardingContexts)
    .values({
      userId: input.userId,
      persona: "invite_link",
      inviteToken: invite.token,
      inviteEmail: invite.email ?? null,
      onboardingStep: input.onboardingStep,
      summary:
        invite.inviterContextSummary ??
        invite.description ??
        "Invite-based onboarding context applied.",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: onboardingContexts.userId,
      set: {
        persona: "invite_link",
        inviteToken: invite.token,
        inviteEmail: invite.email ?? null,
        onboardingStep: input.onboardingStep,
        summary:
          invite.inviterContextSummary ??
          invite.description ??
          "Invite-based onboarding context applied.",
        updatedAt: new Date(),
      },
    });

  return { applied: true as const, validity: "valid" as const, invite };
}


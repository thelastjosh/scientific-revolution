import { eq } from "drizzle-orm";
import { organizations } from "@shared/schema";
import { getDb } from "./db";

/**
 * Sail-owned copy snippets for external comms (agents fetch via signed internal API).
 * Extend with CMS or org markdown later.
 */
export async function getCommTemplatesForOrg(organizationId: string) {
  const db = getDb();
  let orgName = organizationId;
  if (db) {
    const rows = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (rows[0]?.name) orgName = rows[0].name;
  }
  return {
    organizationId,
    brandName: orgName,
    productName: "Sail",
    firstContactEmail: {
      subjectPattern: `[${orgName}] Update regarding your task`,
      openingLine: `You are receiving this message because ${orgName} uses Sail to coordinate work.`,
      replyExpectation: "Reply to this email to add context or ask questions. Replies are reviewed by your contact.",
    },
    coldInboundAutoReplySnippet:
      "We received your message. If you were trying to reach a Sail workspace, use the secure link we sent separately to connect this address to your account.",
    trustFooter:
      "If you did not expect this message, you can ignore it or contact your organization administrator.",
  };
}

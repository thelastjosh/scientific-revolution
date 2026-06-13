/**
 * Idempotent seed for agentic dashboard:
 * - users / organizations
 * - workspace sessions/messages
 * - editable tasks
 * - admin support entities
 *
 * Default password for all seeded users: Demo2026!SR
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { hashPassword } from "../server/auth";
import { getDb } from "../server/db";
import {
  adminEvents,
  channelCredentials,
  chatMessages,
  chatSessions,
  networkTasks,
  onboardingContexts,
  organizationMembers,
  organizations,
  postTaskSurveys,
  userContextEntries,
  users,
} from "../shared/schema";

async function main() {
  const db = getDb();
  if (!db) {
    console.error("DATABASE_URL (or POSTGRES_URL) is not set.");
    process.exit(1);
  }

  const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(networkTasks);
  if (c > 0) {
    console.log("Seed skipped: network_tasks already has rows.");
    return;
  }

  const passwordHash = await hashPassword("Demo2026!SR");

  await db.transaction(async (tx) => {
    await tx.insert(organizations).values([
      {
        id: "public-ai",
        name: "Public AI",
        description:
          "A nonprofit movement to spread the benefits and mitigate the harms of AI through intrinsically motivated, public-interest work.",
      },
      {
        id: "unicef",
        name: "UNICEF",
        description:
          "UNICEF works in over 190 countries to save children’s lives, defend their rights, and help them fulfill their potential.",
      },
    ]);

    const userRows = await tx
      .insert(users)
      .values([
        {
          email: "alice@public-ai.test",
          passwordHash,
          firstName: "Alice",
          lastName: "Chen",
          bio: "ML reliability and evaluation; coordinates volunteer cohorts for Public AI.",
          skillMarkdown:
            "machine learning, evaluation rubrics, AI safety onboarding, React dashboards, volunteer coordination",
          role: "member",
        },
        {
          email: "marcus@unicef.test",
          passwordHash,
          firstName: "Marcus",
          lastName: "Okonkwo",
          bio: "Field data systems; focuses on child health and education programs in East Africa.",
          skillMarkdown:
            "PostgreSQL, ETL pipelines, data hygiene, grants reporting, financial systems, field data, UNICEF programs",
          role: "member",
        },
        {
          email: "demo@scientific-revolution.test",
          passwordHash,
          firstName: "Demo",
          lastName: "User",
          bio: "Seeded account for Pathway A onboarding-to-workspace handoff demos.",
          role: "admin",
        },
      ])
      .returning({ id: users.id, email: users.email });

    const byEmail = Object.fromEntries(userRows.map((u) => [u.email, u.id])) as Record<string, string>;

    await tx.insert(organizationMembers).values([
      { organizationId: "public-ai", userId: byEmail["alice@public-ai.test"]!, role: "coordinator" },
      { organizationId: "public-ai", userId: byEmail["demo@scientific-revolution.test"]!, role: "member" },
      { organizationId: "unicef", userId: byEmail["marcus@unicef.test"]!, role: "field" },
      { organizationId: "unicef", userId: byEmail["demo@scientific-revolution.test"]!, role: "volunteer" },
    ]);

    await tx.insert(onboardingContexts).values({
      userId: byEmail["demo@scientific-revolution.test"]!,
      persona: "general",
      onboardingStep: "workspace_ready",
      summary: "Graduated from onboarding chat.",
    });

    const workspaceRows = await tx
      .insert(chatSessions)
      .values({
        userId: byEmail["demo@scientific-revolution.test"]!,
        type: "workspace",
        title: "Workspace",
        activeIntent: "task_ingest",
      })
      .returning({ id: chatSessions.id });
    const workspaceId = workspaceRows[0]!.id;

    await tx.insert(chatMessages).values([
      {
        sessionId: workspaceId,
        role: "assistant",
        content: "Welcome to your workspace. Paste a source document and I will extract task drafts.",
      },
      {
        sessionId: workspaceId,
        role: "user",
        content: "I need tasks extracted from yesterday's planning transcript.",
      },
    ]);

    await tx.insert(networkTasks).values([
      {
        id: "T-500101",
        ownerUserId: byEmail["demo@scientific-revolution.test"]!,
        organizationId: "public-ai",
        sourceSessionId: workspaceId,
        title: "Draft evaluation rubric for AI safety onboarding volunteers",
        description:
          "From planning transcript: produce a concise rubric and send to team for edits.",
        rawSourceDoc: "Planning transcript excerpt ...",
        extractedBy: "workspace_chat",
        status: "open",
        history: [{ type: "created", via: "seed", at: new Date().toISOString() }],
      },
      {
        id: "T-500102",
        ownerUserId: byEmail["demo@scientific-revolution.test"]!,
        organizationId: "unicef",
        sourceSessionId: workspaceId,
        title: "Summarize outreach blockers from partner meeting",
        description:
          "Extract concrete blockers and next actions for UNICEF outreach partners.",
        rawSourceDoc: "Partner meeting notes ...",
        extractedBy: "workspace_chat",
        status: "draft",
        history: [{ type: "created", via: "seed", at: new Date().toISOString() }],
      },
      {
        id: "T-500103",
        ownerUserId: byEmail["demo@scientific-revolution.test"]!,
        organizationId: "unicef",
        sourceSessionId: workspaceId,
        title: "Clean up grants data pipeline in PostgreSQL",
        description:
          "Stabilize financial reporting and grants data hygiene. ETL fixes, PostgreSQL documentation, and reliability for UNICEF program data.",
        rawSourceDoc: "Grants system audit notes — need SQL and data hygiene help.",
        extractedBy: "seed",
        status: "draft",
        history: [{ type: "created", via: "seed", matchmaking_demo: true, at: new Date().toISOString() }],
      },
    ]);

    await tx.insert(channelCredentials).values([
      {
        userId: byEmail["demo@scientific-revolution.test"]!,
        provider: "gmail",
        accountLabel: "Demo Gmail",
        credentialRef: "vault://gmail/demo",
        status: "active",
      },
      {
        userId: byEmail["demo@scientific-revolution.test"]!,
        provider: "slack",
        accountLabel: "Demo Slack",
        credentialRef: "vault://slack/demo",
        status: "active",
      },
    ]);

    await tx.insert(userContextEntries).values([
      {
        userId: byEmail["demo@scientific-revolution.test"]!,
        source: "email",
        title: "Partner follow-up thread",
        content: "Context snapshot from email thread used to draft tasks.",
      },
      {
        userId: byEmail["demo@scientific-revolution.test"]!,
        source: "slack",
        title: "Weekly planning sync notes",
        content: "Key points from Slack planning channel.",
      },
    ]);

    await tx.insert(postTaskSurveys).values([
      {
        taskId: "T-500101",
        userId: byEmail["demo@scientific-revolution.test"]!,
        status: "pending",
      },
    ]);

    await tx.insert(adminEvents).values([
      {
        actorUserId: byEmail["demo@scientific-revolution.test"]!,
        eventType: "seed.bootstrap",
        targetType: "system",
        targetId: "initial",
        payload: { note: "Initial seed for agentic dashboard rebuild." },
      },
    ]);
  });

  console.log("Seed complete. Login examples (password Demo2026!SR):");
  console.log("  - demo@scientific-revolution.test");
  console.log("  - alice@public-ai.test");
  console.log("  - marcus@unicef.test");
  console.log("");
  console.log("Matchmaking demo (after migrate): npm run matchmaking:demo");
  console.log("  Uses draft task T-500103 → should propose marcus@unicef.test");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

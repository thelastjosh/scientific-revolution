/**
 * End-to-end matchmaking flow tester (local dev).
 *
 * Usage:
 *   npm run matchmaking:demo              # reset + submit default demo task
 *   npm run matchmaking:demo -- status  # show matchmaking status
 *   npm run matchmaking:demo -- accept <token>
 *   npm run matchmaking:demo -- decline <token>
 *
 * Requires DATABASE_URL and seeded data (npm run db:seed).
 * Email is skipped automatically in dev without RESEND_API_KEY.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { networkTasks, users } from "../shared/schema";

import {
  acceptMatchProposal,
  declineMatchProposal,
  getTaskMatchmakingStatus,
  runMatchmakingDemo,
} from "../server/matchmaking/runner";

const DEMO_TASK = {
  id: "T-500103",
  organizationId: "unicef",
  title: "Clean up grants data pipeline in PostgreSQL",
  description:
    "Stabilize financial reporting and grants data hygiene. ETL fixes, PostgreSQL documentation, and reliability for UNICEF program data.",
  rawSourceDoc: "Grants system audit notes — need SQL and data hygiene help.",
};

const DEFAULT_TASK_ID = DEMO_TASK.id;
const DEMO_OWNER_EMAIL = "demo@scientific-revolution.test";

async function ensureDemoTask(ownerUserId: string, taskId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not set");

  const existing = await db
    .select({ id: networkTasks.id })
    .from(networkTasks)
    .where(eq(networkTasks.id, taskId))
    .limit(1);
  if (existing[0]) return;

  await db.insert(networkTasks).values({
    id: taskId,
    ownerUserId,
    organizationId: DEMO_TASK.organizationId,
    title: DEMO_TASK.title,
    description: DEMO_TASK.description,
    rawSourceDoc: DEMO_TASK.rawSourceDoc,
    extractedBy: "seed",
    status: "draft",
    history: [{ type: "created", via: "matchmaking-demo", at: new Date().toISOString() }],
  });
  console.log(`Created demo task ${taskId} (was missing from seed).`);
}

async function ensureDemoCandidateProfiles(): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db
    .update(users)
    .set({
      skillMarkdown:
        "PostgreSQL, ETL pipelines, data hygiene, grants reporting, financial systems, field data, UNICEF programs",
    })
    .where(eq(users.email, "marcus@unicef.test"));
}

function usage() {
  console.log(`
Matchmaking demo — test the full flow locally

  npm run matchmaking:demo [-- taskId]
  npm run matchmaking:demo -- status [taskId]
  npm run matchmaking:demo -- accept <token>
  npm run matchmaking:demo -- decline <token>

Default task: ${DEFAULT_TASK_ID} (seeded draft, should match marcus@unicef.test)

After submit, open the offer page URL in a browser or run accept/decline with the token.
Set APP_BASE_URL=http://localhost:5000 if your dev server uses another host.
`);
}

async function resolveOwnerId(): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not set");
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_OWNER_EMAIL))
    .limit(1);
  const owner = rows[0];
  if (!owner) {
    throw new Error(`Demo user ${DEMO_OWNER_EMAIL} not found. Run: npm run db:seed`);
  }
  return owner.id;
}

function printSubmitResult(result: Awaited<ReturnType<typeof runMatchmakingDemo>>) {
  if (!result.ok) {
    console.error("Failed:", result.message);
    process.exit(1);
  }
  console.log("\n--- Matchmaking demo result ---\n");
  console.log(`Task:     ${result.taskId} — ${result.taskTitle}`);
  console.log(`Decision: ${result.decision}`);
  console.log(`Run ID:   ${result.runId}`);
  if (result.reasons.length > 0) {
    console.log(`Reasons:  ${result.reasons.join("; ")}`);
  }
  if (result.decision === "propose" && result.urls) {
    console.log(`Candidate: ${result.candidateEmail ?? "(unknown)"}`);
    if (result.emailSkipped) {
      console.log("Email:    skipped (dev mode — open URLs below)\n");
    }
    console.log(`Offer page:  ${result.urls.offerPage}`);
    console.log(`Accept:      ${result.urls.acceptPage}`);
    console.log(`Decline:     ${result.urls.declinePage}`);
    const token = result.urls.offerPage.split("/").pop()?.split("?")[0];
    if (token) {
      console.log(`\nCLI accept:  npm run matchmaking:demo -- accept ${token}`);
      console.log(`CLI decline: npm run matchmaking:demo -- decline ${token}`);
    }
  } else if (result.decision === "wait") {
    console.log("\nNo match proposed — task stays draft. Try updating candidate profiles or task text.");
  }
  console.log("");
}

async function cmdSubmit(taskId: string) {
  const ownerUserId = await resolveOwnerId();
  await ensureDemoCandidateProfiles();
  await ensureDemoTask(ownerUserId, taskId);
  const result = await runMatchmakingDemo({ taskId, ownerUserId, reset: true });
  printSubmitResult(result);
}

async function cmdStatus(taskId: string) {
  const status = await getTaskMatchmakingStatus(taskId);
  console.log(JSON.stringify(status, null, 2));
}

async function cmdAccept(token: string) {
  const result = await acceptMatchProposal({ token });
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log(`Accepted. Task ${result.taskId} is now open with assignee set.`);
}

async function cmdDecline(token: string) {
  const result = await declineMatchProposal({ token });
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log(`Declined. Task ${result.taskId}.`);
  if (result.rerun?.pendingProposal) {
    console.log("Rerun proposed a new match — check status or run submit again.");
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const cmd = args[0];
  if (!cmd || cmd.startsWith("T-")) {
    const taskId = cmd?.startsWith("T-") ? cmd : DEFAULT_TASK_ID;
    await cmdSubmit(taskId);
    return;
  }

  switch (cmd) {
    case "status":
      await cmdStatus(args[1] ?? DEFAULT_TASK_ID);
      break;
    case "accept":
      if (!args[1]) {
        console.error("Usage: npm run matchmaking:demo -- accept <token>");
        process.exit(1);
      }
      await cmdAccept(args[1]);
      break;
    case "decline":
      if (!args[1]) {
        console.error("Usage: npm run matchmaking:demo -- decline <token>");
        process.exit(1);
      }
      await cmdDecline(args[1]);
      break;
    default:
      usage();
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

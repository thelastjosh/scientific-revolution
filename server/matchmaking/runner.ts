import { randomBytes } from "crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import type {
  MatchmakingInput,
  MatchmakingOutput,
  MatchmakingProposalSummary,
  MatchmakingRunSummary,
  MatchmakingTrigger,
  TaskMatchmakingStatus,
} from "@shared/matchmaking";
import type { NetworkTask } from "@shared/schema";
import {
  matchmakingProposals,
  matchmakingRuns,
  networkTasks,
  organizationMembers,
  organizations,
  users,
} from "@shared/schema";
import { getDb } from "../db";
import { getActiveMatchmaker } from "./registry";
import {
  sendTaskMatchOfferEmail,
  matchOfferUrls,
  shouldSkipMatchOfferEmail,
} from "../email/task-match-offer-email";
import { sendTaskHandoffEmailIfNeeded } from "../email/task-handoff-email";

const PROPOSAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RERUN_ON_DECLINE = process.env.MATCHMAKER_RERUN_ON_DECLINE !== "false";

function confidenceToStored(confidence: number): number {
  return Math.round(Math.max(0, Math.min(1, confidence)) * 1000);
}

function confidenceFromStored(stored: number): number {
  return stored / 1000;
}

function excerpt(text: string | null | undefined, maxLen = 500): string | null {
  if (!text) return null;
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

function runToSummary(row: typeof matchmakingRuns.$inferSelect): MatchmakingRunSummary {
  return {
    id: row.id,
    taskId: row.taskId,
    moduleId: row.moduleId,
    moduleVersion: row.moduleVersion,
    decision: row.decision,
    proposedUserId: row.proposedUserId ?? null,
    confidence: confidenceFromStored(row.confidence),
    reasons: row.reasons ?? [],
    trigger: row.trigger,
    createdAt: row.createdAt.toISOString(),
  };
}

function proposalToSummary(row: typeof matchmakingProposals.$inferSelect): MatchmakingProposalSummary {
  return {
    id: row.id,
    taskId: row.taskId,
    runId: row.runId,
    candidateUserId: row.candidateUserId,
    status: row.status,
    expiresAt: row.expiresAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadCandidates(): Promise<MatchmakingInput["candidates"]> {
  const db = getDb();
  if (!db) return [];

  const userRows = await db.select().from(users);
  const memberRows = await db.select().from(organizationMembers);

  const orgsByUser = new Map<string, string[]>();
  for (const m of memberRows) {
    const list = orgsByUser.get(m.userId) ?? [];
    list.push(m.organizationId);
    orgsByUser.set(m.userId, list);
  }

  return userRows.map((u) => ({
    userId: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    bio: u.bio ?? null,
    skillMarkdown: u.skillMarkdown ?? null,
    organizationIds: orgsByUser.get(u.id) ?? [],
  }));
}

async function loadExcludedUserIds(taskId: string): Promise<string[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({ candidateUserId: matchmakingProposals.candidateUserId })
    .from(matchmakingProposals)
    .where(
      and(
        eq(matchmakingProposals.taskId, taskId),
        inArray(matchmakingProposals.status, ["declined"]),
      ),
    );
  return rows.map((r) => r.candidateUserId);
}

async function getPendingProposal(taskId: string) {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(matchmakingProposals)
    .where(
      and(eq(matchmakingProposals.taskId, taskId), eq(matchmakingProposals.status, "pending")),
    )
    .orderBy(desc(matchmakingProposals.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

async function buildInput(
  task: NetworkTask,
  trigger: MatchmakingTrigger,
): Promise<MatchmakingInput> {
  const module = getActiveMatchmaker();
  const candidates = await loadCandidates();
  const excludedUserIds = await loadExcludedUserIds(task.id);

  let organizationDisplayName: string | null = null;
  if (task.organizationId) {
    const db = getDb();
    if (db) {
      const orgRows = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, task.organizationId))
        .limit(1);
      organizationDisplayName = orgRows[0]?.name ?? null;
    }
  }

  return {
    moduleId: module.id,
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      organizationId: task.organizationId ?? null,
      ownerUserId: task.ownerUserId,
      rawSourceDocExcerpt: excerpt(task.rawSourceDoc),
    },
    candidates,
    excludedUserIds,
    context: {
      submittedAt: new Date().toISOString(),
      organizationDisplayName,
    },
  };
}

async function persistRun(
  task: NetworkTask,
  input: MatchmakingInput,
  output: MatchmakingOutput,
  trigger: MatchmakingTrigger,
): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const rows = await db
    .insert(matchmakingRuns)
    .values({
      taskId: task.id,
      moduleId: output.moduleId,
      moduleVersion: output.moduleVersion,
      decision: output.decision,
      proposedUserId: output.proposedUserId ?? null,
      confidence: confidenceToStored(output.confidence),
      reasons: output.reasons,
      scores: output.scores ?? null,
      inputSnapshot: {
        taskId: task.id,
        taskTitle: task.title,
        organizationId: task.organizationId,
        candidateCount: input.candidates.length,
        excludedCount: input.excludedUserIds.length,
        moduleId: input.moduleId,
      },
      trigger,
    })
    .returning({ id: matchmakingRuns.id });

  return rows[0]!.id;
}

function generateProposalToken(): string {
  return randomBytes(32).toString("hex");
}

async function createProposal(input: {
  taskId: string;
  runId: string;
  candidateUserId: string;
}): Promise<typeof matchmakingProposals.$inferSelect> {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const expiresAt = new Date(Date.now() + PROPOSAL_TTL_MS);
  const rows = await db
    .insert(matchmakingProposals)
    .values({
      taskId: input.taskId,
      runId: input.runId,
      candidateUserId: input.candidateUserId,
      token: generateProposalToken(),
      expiresAt,
    })
    .returning();
  return rows[0]!;
}

export async function getTaskMatchmakingStatus(taskId: string): Promise<TaskMatchmakingStatus> {
  const db = getDb();
  if (!db) {
    return { latestRun: null, pendingProposal: null, waitingForMatch: false };
  }

  const [runRows, pending] = await Promise.all([
    db
      .select()
      .from(matchmakingRuns)
      .where(eq(matchmakingRuns.taskId, taskId))
      .orderBy(desc(matchmakingRuns.createdAt))
      .limit(1),
    getPendingProposal(taskId),
  ]);

  const latestRun = runRows[0] ? runToSummary(runRows[0]) : null;
  const pendingProposal = pending ? proposalToSummary(pending) : null;
  const waitingForMatch =
    latestRun?.decision === "wait" && !pendingProposal;

  return { latestRun, pendingProposal, waitingForMatch };
}

export async function runMatchmakingForTask(input: {
  task: NetworkTask;
  trigger: MatchmakingTrigger;
}): Promise<{
  output: MatchmakingOutput;
  runId: string;
  proposal: MatchmakingProposalSummary | null;
}> {
  const matchInput = await buildInput(input.task, input.trigger);
  const module = getActiveMatchmaker();
  const output = module.run(matchInput);
  const runId = await persistRun(input.task, matchInput, output, input.trigger);

  if (output.decision !== "propose" || !output.proposedUserId) {
    return { output, runId, proposal: null };
  }

  const proposalRow = await createProposal({
    taskId: input.task.id,
    runId,
    candidateUserId: output.proposedUserId,
  });

  const db = getDb();
  if (db) {
    const candidateRows = await db
      .select()
      .from(users)
      .where(eq(users.id, output.proposedUserId))
      .limit(1);
    const candidate = candidateRows[0];
    if (candidate) {
      await sendTaskMatchOfferEmail({
        task: input.task,
        proposal: proposalRow,
        candidate,
        reasons: output.reasons,
        organizationDisplayName: matchInput.context.organizationDisplayName ?? null,
      });
    }
  }

  return {
    output,
    runId,
    proposal: proposalToSummary(proposalRow),
  };
}

export async function submitTaskForMatching(input: {
  taskId: string;
  ownerUserId: string;
}): Promise<
  | { ok: true; decision: "wait"; runId: string; status: TaskMatchmakingStatus }
  | { ok: true; decision: "propose"; runId: string; status: TaskMatchmakingStatus }
  | { ok: false; status: number; message: string }
> {
  const db = getDb();
  if (!db) return { ok: false, status: 503, message: "Database is not configured" };

  const taskRows = await db
    .select()
    .from(networkTasks)
    .where(
      and(eq(networkTasks.id, input.taskId), eq(networkTasks.ownerUserId, input.ownerUserId)),
    )
    .limit(1);
  const task = taskRows[0];
  if (!task) return { ok: false, status: 404, message: "Task not found" };
  if (task.status !== "draft") {
    return { ok: false, status: 400, message: "Only draft tasks can be submitted for matching" };
  }

  const pending = await getPendingProposal(task.id);
  if (pending) {
    return { ok: false, status: 409, message: "A match proposal is already pending for this task" };
  }

  const { output, runId } = await runMatchmakingForTask({ task, trigger: "submit" });
  const status = await getTaskMatchmakingStatus(task.id);

  if (output.decision === "propose") {
    return { ok: true, decision: "propose", runId, status };
  }
  return { ok: true, decision: "wait", runId, status };
}

export async function acceptMatchProposal(input: {
  token: string;
}): Promise<
  | { ok: true; taskId: string }
  | { ok: false; status: number; message: string }
> {
  const db = getDb();
  if (!db) return { ok: false, status: 503, message: "Database is not configured" };

  const proposalRows = await db
    .select()
    .from(matchmakingProposals)
    .where(eq(matchmakingProposals.token, input.token))
    .limit(1);
  const proposal = proposalRows[0];
  if (!proposal) return { ok: false, status: 404, message: "Offer not found" };
  if (proposal.status !== "pending") {
    return { ok: false, status: 400, message: `Offer already ${proposal.status}` };
  }
  if (proposal.expiresAt.getTime() < Date.now()) {
    await db
      .update(matchmakingProposals)
      .set({ status: "expired", respondedAt: new Date() })
      .where(eq(matchmakingProposals.id, proposal.id));
    return { ok: false, status: 410, message: "Offer has expired" };
  }

  const taskRows = await db
    .select()
    .from(networkTasks)
    .where(eq(networkTasks.id, proposal.taskId))
    .limit(1);
  const task = taskRows[0];
  if (!task) return { ok: false, status: 404, message: "Task not found" };

  const previousStatus = task.status;
  const hist = [
    ...(task.history ?? []),
    {
      kind: "match_accepted",
      at: new Date().toISOString(),
      candidateUserId: proposal.candidateUserId,
      proposalId: proposal.id,
    },
  ];

  const updatedRows = await db
    .update(networkTasks)
    .set({
      assigneeUserId: proposal.candidateUserId,
      status: "open",
      history: hist,
      updatedAt: new Date(),
    })
    .where(eq(networkTasks.id, task.id))
    .returning();
  const updated = updatedRows[0]!;

  await db
    .update(matchmakingProposals)
    .set({
      status: "accepted",
      respondedAt: new Date(),
      responseSource: "link",
    })
    .where(eq(matchmakingProposals.id, proposal.id));

  try {
    await sendTaskHandoffEmailIfNeeded({ task: updated, previousStatus });
  } catch (e) {
    console.error("[match-accept-handoff]", e);
  }

  return { ok: true, taskId: task.id };
}

export async function declineMatchProposal(input: {
  token: string;
}): Promise<
  | { ok: true; taskId: string; rerun: TaskMatchmakingStatus | null }
  | { ok: false; status: number; message: string }
> {
  const db = getDb();
  if (!db) return { ok: false, status: 503, message: "Database is not configured" };

  const proposalRows = await db
    .select()
    .from(matchmakingProposals)
    .where(eq(matchmakingProposals.token, input.token))
    .limit(1);
  const proposal = proposalRows[0];
  if (!proposal) return { ok: false, status: 404, message: "Offer not found" };
  if (proposal.status !== "pending") {
    return { ok: false, status: 400, message: `Offer already ${proposal.status}` };
  }

  await db
    .update(matchmakingProposals)
    .set({
      status: "declined",
      respondedAt: new Date(),
      responseSource: "link",
    })
    .where(eq(matchmakingProposals.id, proposal.id));

  const taskRows = await db
    .select()
    .from(networkTasks)
    .where(eq(networkTasks.id, proposal.taskId))
    .limit(1);
  const task = taskRows[0];
  if (!task) return { ok: true, taskId: proposal.taskId, rerun: null };

  const hist = [
    ...(task.history ?? []),
    {
      kind: "match_declined",
      at: new Date().toISOString(),
      candidateUserId: proposal.candidateUserId,
      proposalId: proposal.id,
    },
  ];
  await db
    .update(networkTasks)
    .set({ history: hist, updatedAt: new Date() })
    .where(eq(networkTasks.id, task.id));

  let rerun: TaskMatchmakingStatus | null = null;
  if (RERUN_ON_DECLINE && task.status === "draft") {
    await runMatchmakingForTask({ task, trigger: "rerun" });
    rerun = await getTaskMatchmakingStatus(task.id);
  }

  return { ok: true, taskId: proposal.taskId, rerun };
}

export async function getProposalByToken(token: string) {
  const db = getDb();
  if (!db) return null;

  const proposalRows = await db
    .select()
    .from(matchmakingProposals)
    .where(eq(matchmakingProposals.token, token))
    .limit(1);
  const proposal = proposalRows[0];
  if (!proposal) return null;

  const [taskRows, candidateRows, runRows] = await Promise.all([
    db.select().from(networkTasks).where(eq(networkTasks.id, proposal.taskId)).limit(1),
    db.select().from(users).where(eq(users.id, proposal.candidateUserId)).limit(1),
    db.select().from(matchmakingRuns).where(eq(matchmakingRuns.id, proposal.runId)).limit(1),
  ]);

  const task = taskRows[0];
  const candidate = candidateRows[0];
  const run = runRows[0];
  if (!task || !candidate) return null;

  return {
    proposal: proposalToSummary(proposal),
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      organizationId: task.organizationId ?? null,
    },
    candidate: {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
    },
    reasons: run?.reasons ?? [],
  };
}

/** Dev/demo: clear pending proposals and return task to draft for re-testing. */
export async function resetTaskMatchmakingForDemo(taskId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  await db
    .update(matchmakingProposals)
    .set({ status: "expired", respondedAt: new Date() })
    .where(
      and(eq(matchmakingProposals.taskId, taskId), eq(matchmakingProposals.status, "pending")),
    );

  const taskRows = await db
    .select()
    .from(networkTasks)
    .where(eq(networkTasks.id, taskId))
    .limit(1);
  const task = taskRows[0];
  if (!task) return;

  await db
    .update(networkTasks)
    .set({
      status: "draft",
      assigneeUserId: null,
      updatedAt: new Date(),
      history: [
        ...(task.history ?? []),
        { kind: "matchmaking_demo_reset", at: new Date().toISOString() },
      ],
    })
    .where(eq(networkTasks.id, taskId));
}

export async function getPendingProposalDetails(taskId: string) {
  const db = getDb();
  if (!db) return null;

  const proposal = await getPendingProposal(taskId);
  if (!proposal) return null;

  const candidateRows = await db
    .select()
    .from(users)
    .where(eq(users.id, proposal.candidateUserId))
    .limit(1);
  const candidate = candidateRows[0];
  if (!candidate) return null;

  return {
    proposal: proposalToSummary(proposal),
    token: proposal.token,
    candidate: {
      email: candidate.email,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
    },
    urls: matchOfferUrls(proposal.token),
  };
}

export async function runMatchmakingDemo(input: {
  taskId: string;
  ownerUserId: string;
  reset?: boolean;
}): Promise<
  | {
      ok: true;
      decision: "wait" | "propose";
      runId: string;
      taskId: string;
      taskTitle: string;
      reasons: string[];
      candidateEmail?: string;
      urls?: ReturnType<typeof matchOfferUrls>;
      emailSkipped?: boolean;
    }
  | { ok: false; message: string }
> {
  if (input.reset !== false) {
    await resetTaskMatchmakingForDemo(input.taskId);
  }

  const result = await submitTaskForMatching({
    taskId: input.taskId,
    ownerUserId: input.ownerUserId,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  const db = getDb();
  const taskRows = db
    ? await db.select().from(networkTasks).where(eq(networkTasks.id, input.taskId)).limit(1)
    : [];
  const taskTitle = taskRows[0]?.title ?? input.taskId;

  const runRows = db
    ? await db
        .select()
        .from(matchmakingRuns)
        .where(eq(matchmakingRuns.id, result.runId))
        .limit(1)
    : [];
  const reasons = runRows[0]?.reasons ?? [];

  if (result.decision === "wait") {
    return {
      ok: true,
      decision: "wait",
      runId: result.runId,
      taskId: input.taskId,
      taskTitle,
      reasons,
    };
  }

  const pending = await getPendingProposalDetails(input.taskId);
  return {
    ok: true,
    decision: "propose",
    runId: result.runId,
    taskId: input.taskId,
    taskTitle,
    reasons,
    candidateEmail: pending?.candidate.email,
    urls: pending?.urls,
    emailSkipped: shouldSkipMatchOfferEmail(),
  };
}

import { desc, eq, sql } from "drizzle-orm";
import { matchmakingProposals, matchmakingRuns } from "@shared/schema";
import { getDb } from "../db";

export type MatchmakingMetrics = {
  totals: {
    runs: number;
    proposeRuns: number;
    waitRuns: number;
    proposals: number;
    acceptedProposals: number;
    declinedProposals: number;
    pendingProposals: number;
    expiredProposals: number;
  };
  rates: {
    matchRate: number;
    waitRate: number;
    acceptRate: number;
    declineRate: number;
  };
  byModule: Array<{
    moduleId: string;
    moduleVersion: string;
    runs: number;
    proposeRuns: number;
    waitRuns: number;
    avgConfidence: number;
  }>;
  daily: Array<{
    date: string;
    runs: number;
    proposeRuns: number;
    waitRuns: number;
    accepted: number;
  }>;
};

export async function getMatchmakingMetrics(): Promise<MatchmakingMetrics> {
  const db = getDb();
  if (!db) {
    return {
      totals: {
        runs: 0,
        proposeRuns: 0,
        waitRuns: 0,
        proposals: 0,
        acceptedProposals: 0,
        declinedProposals: 0,
        pendingProposals: 0,
        expiredProposals: 0,
      },
      rates: { matchRate: 0, waitRate: 0, acceptRate: 0, declineRate: 0 },
      byModule: [],
      daily: [],
    };
  }

  const [runRows, proposalRows] = await Promise.all([
    db.select().from(matchmakingRuns).orderBy(desc(matchmakingRuns.createdAt)),
    db.select().from(matchmakingProposals).orderBy(desc(matchmakingProposals.createdAt)),
  ]);

  const totals = {
    runs: runRows.length,
    proposeRuns: runRows.filter((r) => r.decision === "propose").length,
    waitRuns: runRows.filter((r) => r.decision === "wait").length,
    proposals: proposalRows.length,
    acceptedProposals: proposalRows.filter((p) => p.status === "accepted").length,
    declinedProposals: proposalRows.filter((p) => p.status === "declined").length,
    pendingProposals: proposalRows.filter((p) => p.status === "pending").length,
    expiredProposals: proposalRows.filter((p) => p.status === "expired").length,
  };

  const responded =
    totals.acceptedProposals + totals.declinedProposals + totals.expiredProposals;

  const rates = {
    matchRate: totals.runs > 0 ? totals.proposeRuns / totals.runs : 0,
    waitRate: totals.runs > 0 ? totals.waitRuns / totals.runs : 0,
    acceptRate: totals.proposals > 0 ? totals.acceptedProposals / totals.proposals : 0,
    declineRate: responded > 0 ? totals.declinedProposals / responded : 0,
  };

  const moduleMap = new Map<
    string,
    { moduleId: string; moduleVersion: string; runs: number; proposeRuns: number; waitRuns: number; confidenceSum: number }
  >();
  for (const r of runRows) {
    const key = `${r.moduleId}::${r.moduleVersion}`;
    const entry = moduleMap.get(key) ?? {
      moduleId: r.moduleId,
      moduleVersion: r.moduleVersion,
      runs: 0,
      proposeRuns: 0,
      waitRuns: 0,
      confidenceSum: 0,
    };
    entry.runs++;
    if (r.decision === "propose") entry.proposeRuns++;
    else entry.waitRuns++;
    entry.confidenceSum += r.confidence / 1000;
    moduleMap.set(key, entry);
  }

  const byModule = Array.from(moduleMap.values()).map((m) => ({
    moduleId: m.moduleId,
    moduleVersion: m.moduleVersion,
    runs: m.runs,
    proposeRuns: m.proposeRuns,
    waitRuns: m.waitRuns,
    avgConfidence: m.runs > 0 ? m.confidenceSum / m.runs : 0,
  }));

  const dailyMap = new Map<
    string,
    { date: string; runs: number; proposeRuns: number; waitRuns: number; accepted: number }
  >();
  for (const r of runRows) {
    const date = r.createdAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(date) ?? {
      date,
      runs: 0,
      proposeRuns: 0,
      waitRuns: 0,
      accepted: 0,
    };
    entry.runs++;
    if (r.decision === "propose") entry.proposeRuns++;
    else entry.waitRuns++;
    dailyMap.set(date, entry);
  }
  for (const p of proposalRows) {
    if (p.status !== "accepted" || !p.respondedAt) continue;
    const date = p.respondedAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(date) ?? {
      date,
      runs: 0,
      proposeRuns: 0,
      waitRuns: 0,
      accepted: 0,
    };
    entry.accepted++;
    dailyMap.set(date, entry);
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return { totals, rates, byModule, daily };
}

export async function listMatchmakingRuns(input: { limit?: number; offset?: number }) {
  const db = getDb();
  if (!db) return { runs: [], total: 0 };

  const limit = Math.min(input.limit ?? 50, 200);
  const offset = input.offset ?? 0;

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(matchmakingRuns)
      .orderBy(desc(matchmakingRuns.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(matchmakingRuns),
  ]);

  return {
    runs: rows.map((r) => ({
      id: r.id,
      taskId: r.taskId,
      moduleId: r.moduleId,
      moduleVersion: r.moduleVersion,
      decision: r.decision,
      proposedUserId: r.proposedUserId ?? null,
      confidence: r.confidence / 1000,
      reasons: r.reasons ?? [],
      trigger: r.trigger,
      createdAt: r.createdAt.toISOString(),
    })),
    total: countRows[0]?.count ?? 0,
  };
}

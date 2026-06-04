export type MatchmakingMetricsPayload = {
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

export type MatchmakingRunRow = {
  id: string;
  taskId: string;
  moduleId: string;
  moduleVersion: string;
  decision: "wait" | "propose";
  proposedUserId: string | null;
  confidence: number;
  reasons: string[];
  trigger: string;
  createdAt: string;
};

export async function fetchMatchmakingMetrics(): Promise<MatchmakingMetricsPayload> {
  const r = await fetch("/api/admin/matchmaking/metrics", { credentials: "include" });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    metrics?: MatchmakingMetricsPayload;
  };
  if (!r.ok || !data.metrics) {
    throw new Error(data.message ?? `Matchmaking metrics failed (${r.status})`);
  }
  return data.metrics;
}

export async function fetchMatchmakingRuns(input?: {
  limit?: number;
  offset?: number;
}): Promise<{ runs: MatchmakingRunRow[]; total: number }> {
  const params = new URLSearchParams();
  if (input?.limit != null) params.set("limit", String(input.limit));
  if (input?.offset != null) params.set("offset", String(input.offset));
  const qs = params.toString();
  const r = await fetch(`/api/admin/matchmaking/runs${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    runs?: MatchmakingRunRow[];
    total?: number;
  };
  if (!r.ok || !Array.isArray(data.runs)) {
    throw new Error(data.message ?? `Matchmaking runs failed (${r.status})`);
  }
  return { runs: data.runs, total: data.total ?? data.runs.length };
}

export type MatchmakingDemoResult = {
  decision: "wait" | "propose";
  runId: string;
  taskId: string;
  taskTitle: string;
  reasons: string[];
  candidateEmail?: string;
  urls?: {
    offerPage: string;
    acceptPage: string;
    declinePage: string;
    acceptApi: string;
    declineApi: string;
  };
  emailSkipped?: boolean;
};

export async function postMatchmakingDemo(input?: {
  taskId?: string;
  reset?: boolean;
}): Promise<MatchmakingDemoResult> {
  const r = await fetch("/api/admin/matchmaking/demo", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
  });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    demo?: MatchmakingDemoResult;
  };
  if (!r.ok || !data.demo) {
    throw new Error(data.message ?? `Matchmaking demo failed (${r.status})`);
  }
  return data.demo;
}

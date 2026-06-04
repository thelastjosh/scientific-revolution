import { z } from "zod";

export const matchmakingDecisionSchema = z.enum(["wait", "propose"]);
export type MatchmakingDecision = z.infer<typeof matchmakingDecisionSchema>;

export const matchmakingTriggerSchema = z.enum(["submit", "rerun", "benchmark"]);
export type MatchmakingTrigger = z.infer<typeof matchmakingTriggerSchema>;

export const matchmakingProposalStatusSchema = z.enum([
  "pending",
  "accepted",
  "declined",
  "expired",
]);
export type MatchmakingProposalStatus = z.infer<typeof matchmakingProposalStatusSchema>;

export type MatchmakingTaskSnapshot = {
  id: string;
  title: string;
  description: string;
  organizationId: string | null;
  ownerUserId: string;
  rawSourceDocExcerpt?: string | null;
};

export type MatchmakingCandidate = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  skillMarkdown: string | null;
  organizationIds: string[];
};

export type MatchmakingInput = {
  moduleId: string;
  task: MatchmakingTaskSnapshot;
  candidates: MatchmakingCandidate[];
  excludedUserIds: string[];
  context: {
    submittedAt: string;
    organizationDisplayName?: string | null;
  };
};

export type MatchmakingOutput = {
  decision: MatchmakingDecision;
  proposedUserId?: string;
  confidence: number;
  reasons: string[];
  scores?: Record<string, number>;
  moduleId: string;
  moduleVersion: string;
};

export type MatchmakingRunSummary = {
  id: string;
  taskId: string;
  moduleId: string;
  moduleVersion: string;
  decision: MatchmakingDecision;
  proposedUserId: string | null;
  confidence: number;
  reasons: string[];
  trigger: MatchmakingTrigger;
  createdAt: string;
};

export type MatchmakingProposalSummary = {
  id: string;
  taskId: string;
  runId: string;
  candidateUserId: string;
  status: MatchmakingProposalStatus;
  expiresAt: string;
  respondedAt: string | null;
  createdAt: string;
};

export type TaskMatchmakingStatus = {
  latestRun: MatchmakingRunSummary | null;
  pendingProposal: MatchmakingProposalSummary | null;
  waitingForMatch: boolean;
};

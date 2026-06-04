import type { MatchmakingInput, MatchmakingOutput } from "@shared/matchmaking";

export const RULES_V01_ID = "rules-v0.1";
export const RULES_V01_VERSION = "0.1.0";

const MIN_SCORE = 0.12;
const MIN_MARGIN = 0.03;
const ORG_BOOST = 0.15;

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "need",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "we",
  "you",
  "they",
  "he",
  "she",
  "i",
  "my",
  "your",
  "our",
  "their",
]);

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
  return new Set(tokens);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const t of Array.from(a)) {
    if (b.has(t)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function runRulesV01(input: MatchmakingInput): MatchmakingOutput {
  const excluded = new Set([...input.excludedUserIds, input.task.ownerUserId]);
  const eligible = input.candidates.filter((c) => !excluded.has(c.userId));

  const taskText = [
    input.task.title,
    input.task.description,
    input.task.rawSourceDocExcerpt ?? "",
  ].join(" ");
  const taskTokens = tokenize(taskText);

  const scores: Record<string, number> = {};
  const scoreDetails: Record<string, string[]> = {};

  for (const candidate of eligible) {
    const profileText = [candidate.bio ?? "", candidate.skillMarkdown ?? ""].join(" ");
    const profileTokens = tokenize(profileText);
    let score = jaccard(taskTokens, profileTokens);
    const reasons: string[] = [];

    if (score > 0) {
      reasons.push(`skill overlap score ${score.toFixed(2)}`);
    }

    if (
      input.task.organizationId &&
      candidate.organizationIds.includes(input.task.organizationId)
    ) {
      score += ORG_BOOST;
      reasons.push(`same organization (+${ORG_BOOST})`);
    }

    scores[candidate.userId] = score;
    scoreDetails[candidate.userId] = reasons;
  }

  const ranked = eligible
    .map((c) => ({ userId: c.userId, score: scores[c.userId] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return {
      decision: "wait",
      confidence: 0,
      reasons: ["No eligible candidates after exclusions"],
      scores,
      moduleId: RULES_V01_ID,
      moduleVersion: RULES_V01_VERSION,
    };
  }

  const top = ranked[0]!;
  const second = ranked[1]?.score ?? 0;
  const margin = top.score - second;

  if (top.score < MIN_SCORE || margin < MIN_MARGIN) {
    const reasons = [
      top.score < MIN_SCORE
        ? `Top score ${top.score.toFixed(2)} below threshold ${MIN_SCORE}`
        : `Margin ${margin.toFixed(2)} below threshold ${MIN_MARGIN}`,
    ];
    if (ranked.length > 1) {
      reasons.push(`Best candidate score: ${top.score.toFixed(2)}`);
    }
    return {
      decision: "wait",
      confidence: clamp(top.score, 0, 1),
      reasons,
      scores,
      moduleId: RULES_V01_ID,
      moduleVersion: RULES_V01_VERSION,
    };
  }

  const candidateReasons = scoreDetails[top.userId] ?? [];
  const candidate = eligible.find((c) => c.userId === top.userId);
  const reasons = [
    `Selected ${candidate?.firstName ?? "candidate"} ${candidate?.lastName ?? ""}`.trim(),
    `Score ${top.score.toFixed(2)} (margin ${margin.toFixed(2)})`,
    ...candidateReasons.slice(0, 2),
  ];

  return {
    decision: "propose",
    proposedUserId: top.userId,
    confidence: clamp(top.score, 0, 1),
    reasons,
    scores,
    moduleId: RULES_V01_ID,
    moduleVersion: RULES_V01_VERSION,
  };
}

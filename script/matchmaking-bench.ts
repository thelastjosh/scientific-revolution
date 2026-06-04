import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { MatchmakingCandidate, MatchmakingInput, MatchmakingTaskSnapshot } from "../shared/matchmaking";
import { listMatchmakers, getMatchmaker } from "../server/matchmaking/registry";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIXTURES = join(ROOT, "benchmark/matchmaking/fixtures");
const OUT_DIR = join(ROOT, "benchmark/matchmaking/out");

type ExpectedLabel = {
  decision: "wait" | "propose";
  proposedUserId?: string;
};

type BenchResult = {
  taskId: string;
  moduleId: string;
  moduleVersion: string;
  decision: string;
  proposedUserId?: string;
  confidence: number;
  reasons: string[];
  labelMatch?: boolean;
};

function loadCandidates(): MatchmakingCandidate[] {
  return JSON.parse(readFileSync(join(FIXTURES, "candidates.json"), "utf8")) as MatchmakingCandidate[];
}

function loadTasks(): MatchmakingTaskSnapshot[] {
  const dir = join(FIXTURES, "tasks");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as MatchmakingTaskSnapshot);
}

function loadExpected(taskId: string): ExpectedLabel | null {
  const path = join(FIXTURES, "expected", `${taskId}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ExpectedLabel;
  } catch {
    return null;
  }
}

function parseArgs(): { moduleFilter?: string } {
  const idx = process.argv.indexOf("--module");
  if (idx === -1) return {};
  return { moduleFilter: process.argv[idx + 1] };
}

function labelMatches(output: BenchResult, label: ExpectedLabel): boolean {
  if (output.decision !== label.decision) return false;
  if (label.decision === "propose" && label.proposedUserId) {
    return output.proposedUserId === label.proposedUserId;
  }
  return true;
}

function main() {
  const { moduleFilter } = parseArgs();
  const candidates = loadCandidates();
  const tasks = loadTasks();
  const modules = moduleFilter
    ? [getMatchmaker(moduleFilter)].filter(Boolean)
    : listMatchmakers();

  if (modules.length === 0) {
    console.error("No matchmaker modules found");
    process.exit(1);
  }

  const results: BenchResult[] = [];
  const moduleStats = new Map<
    string,
    { runs: number; propose: number; wait: number; labeled: number; correct: number }
  >();

  for (const mod of modules) {
    if (!mod) continue;
    const stats = { runs: 0, propose: 0, wait: 0, labeled: 0, correct: 0 };
    moduleStats.set(mod.id, stats);

    for (const task of tasks) {
      const input: MatchmakingInput = {
        moduleId: mod.id,
        task,
        candidates,
        excludedUserIds: [task.ownerUserId],
        context: { submittedAt: new Date().toISOString() },
      };
      const output = mod.run(input);
      const label = loadExpected(task.id);
      const row: BenchResult = {
        taskId: task.id,
        moduleId: output.moduleId,
        moduleVersion: output.moduleVersion,
        decision: output.decision,
        proposedUserId: output.proposedUserId,
        confidence: output.confidence,
        reasons: output.reasons,
      };
      if (label) {
        row.labelMatch = labelMatches(row, label);
        stats.labeled++;
        if (row.labelMatch) stats.correct++;
      }
      stats.runs++;
      if (output.decision === "propose") stats.propose++;
      else stats.wait++;
      results.push(row);
    }
  }

  const disagreement: string[] = [];
  if (modules.length > 1) {
    for (const task of tasks) {
      const taskResults = results.filter((r) => r.taskId === task.id);
      const decisions = new Set(taskResults.map((r) => `${r.decision}:${r.proposedUserId ?? ""}`));
      if (decisions.size > 1) {
        disagreement.push(task.id);
      }
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `${timestamp}.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    moduleFilter: moduleFilter ?? null,
    results,
    moduleStats: Object.fromEntries(moduleStats),
    disagreementTasks: disagreement,
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 2));

  console.log(`\nMatchmaking benchmark — ${results.length} runs\n`);
  console.log("| Module | Runs | Propose | Wait | Labeled | Correct |");
  console.log("|--------|------|---------|------|---------|---------|");
  for (const [id, s] of moduleStats) {
    console.log(
      `| ${id} | ${s.runs} | ${s.propose} | ${s.wait} | ${s.labeled} | ${s.correct} |`,
    );
  }
  if (disagreement.length > 0) {
    console.log(`\nModule disagreement on tasks: ${disagreement.join(", ")}`);
  }
  console.log(`\nWrote ${outPath}\n`);
}

main();

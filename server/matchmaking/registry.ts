import type { MatchmakingInput, MatchmakingOutput } from "@shared/matchmaking";
import { RULES_V01_ID, RULES_V01_VERSION, runRulesV01 } from "./modules/rules-v0.1";

export type Matchmaker = {
  id: string;
  version: string;
  run(input: MatchmakingInput): MatchmakingOutput;
};

const REGISTRY: Matchmaker[] = [
  {
    id: RULES_V01_ID,
    version: RULES_V01_VERSION,
    run: runRulesV01,
  },
];

const byId = new Map<string, Matchmaker>();
for (const m of REGISTRY) {
  byId.set(m.id, m);
}

export function listMatchmakers(): Matchmaker[] {
  return REGISTRY.slice();
}

export function getMatchmaker(id: string): Matchmaker | undefined {
  return byId.get(id);
}

export function getActiveMatchmakerId(): string {
  return process.env.MATCHMAKER_MODULE_ID?.trim() || RULES_V01_ID;
}

export function getActiveMatchmaker(): Matchmaker {
  const id = getActiveMatchmakerId();
  const mod = getMatchmaker(id);
  if (!mod) {
    throw new Error(`Unknown matchmaker module: ${id}`);
  }
  return mod;
}

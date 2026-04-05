import { asc, eq } from "drizzle-orm";
import type { UiExperiment, UiExperimentVariant } from "@shared/schema";
import { uiExperiments } from "@shared/schema";
import {
  UI_EXPERIMENT_DEFINITIONS,
  type UiExperimentDefinition,
} from "@shared/ui-experiment-keys";
import { getDb } from "./db";

const mem = new Map<string, UiExperiment>();

function definitionToRow(def: UiExperimentDefinition): UiExperiment {
  return {
    key: def.key,
    enabled: def.enabled,
    variant: def.variant,
    label: def.label,
    updatedAt: new Date(),
  };
}

function seedMemIfEmpty() {
  if (mem.size > 0) return;
  for (const def of UI_EXPERIMENT_DEFINITIONS) {
    mem.set(def.key, definitionToRow(def));
  }
}

async function ensureDbSeeded() {
  const db = getDb();
  if (!db) return;
  for (const def of UI_EXPERIMENT_DEFINITIONS) {
    await db
      .insert(uiExperiments)
      .values({
        key: def.key,
        enabled: def.enabled,
        variant: def.variant,
        label: def.label,
      })
      .onConflictDoNothing();
  }
}

export async function listUiExperiments(): Promise<UiExperiment[]> {
  const db = getDb();
  if (db) {
    await ensureDbSeeded();
    return db.select().from(uiExperiments).orderBy(asc(uiExperiments.key));
  }
  seedMemIfEmpty();
  return Array.from(mem.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export async function updateUiExperiment(
  key: string,
  patch: { enabled?: boolean; variant?: UiExperimentVariant },
): Promise<UiExperiment | undefined> {
  const db = getDb();
  if (db) {
    await ensureDbSeeded();
    const existing = await db
      .select()
      .from(uiExperiments)
      .where(eq(uiExperiments.key, key))
      .limit(1);
    if (!existing[0]) return undefined;
    const next = {
      enabled: patch.enabled ?? existing[0].enabled,
      variant: patch.variant ?? existing[0].variant,
      updatedAt: new Date(),
    };
    const rows = await db
      .update(uiExperiments)
      .set(next)
      .where(eq(uiExperiments.key, key))
      .returning();
    return rows[0];
  }
  seedMemIfEmpty();
  const row = mem.get(key);
  if (!row) return undefined;
  const updated: UiExperiment = {
    ...row,
    enabled: patch.enabled ?? row.enabled,
    variant: (patch.variant ?? row.variant) as UiExperiment["variant"],
    updatedAt: new Date(),
  };
  mem.set(key, updated);
  return updated;
}

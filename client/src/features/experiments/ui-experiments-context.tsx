import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { UiExperimentVariant } from "@shared/schema";
import {
  UI_EXPERIMENT_DEFINITIONS,
} from "@shared/ui-experiment-keys";
import { fetchUiExperiments } from "@/lib/ui-experiments-api";

export type UiExperimentState = {
  key: string;
  enabled: boolean;
  variant: UiExperimentVariant;
  label: string;
};

type Ctx = {
  byKey: Record<string, UiExperimentState>;
  isLoading: boolean;
  error: Error | null;
};

const UiExperimentsContext = createContext<Ctx | null>(null);

function buildState(
  rows: import("@shared/schema").UiExperiment[] | undefined,
): Record<string, UiExperimentState> {
  const out: Record<string, UiExperimentState> = {};
  for (const def of UI_EXPERIMENT_DEFINITIONS) {
    out[def.key] = {
      key: def.key,
      enabled: def.enabled,
      variant: def.variant,
      label: def.label,
    };
  }
  if (!rows) return out;
  for (const row of rows) {
    out[row.key] = {
      key: row.key,
      enabled: row.enabled,
      variant: row.variant as UiExperimentVariant,
      label: row.label,
    };
  }
  return out;
}

export function UiExperimentsProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ui-experiments"],
    queryFn: fetchUiExperiments,
    staleTime: 30_000,
    retry: 1,
  });

  const value = useMemo<Ctx>(
    () => ({
      byKey: buildState(data),
      isLoading,
      error: error instanceof Error ? error : null,
    }),
    [data, isLoading, error],
  );

  return (
    <UiExperimentsContext.Provider value={value}>
      {children}
    </UiExperimentsContext.Provider>
  );
}

export function useUiExperimentsContext(): Ctx {
  const ctx = useContext(UiExperimentsContext);
  if (!ctx) {
    throw new Error("useUiExperimentsContext must be used within UiExperimentsProvider");
  }
  return ctx;
}

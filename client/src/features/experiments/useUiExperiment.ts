import type { UiExperimentVariant } from "@shared/schema";
import { UI_EXPERIMENT_DEFINITIONS } from "@shared/ui-experiment-keys";
import { useUiExperimentsContext } from "./ui-experiments-context";

export function useUiExperiment(key: string): {
  enabled: boolean;
  variant: UiExperimentVariant;
  label: string;
  isLoading: boolean;
} {
  const { byKey, isLoading } = useUiExperimentsContext();
  const def = UI_EXPERIMENT_DEFINITIONS.find((d) => d.key === key);
  const row = byKey[key];
  return {
    enabled: row?.enabled ?? def?.enabled ?? true,
    variant: row?.variant ?? def?.variant ?? "control",
    label: row?.label ?? def?.label ?? key,
    isLoading,
  };
}

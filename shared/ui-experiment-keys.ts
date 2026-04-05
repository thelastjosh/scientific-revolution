import type { UiExperimentVariant } from "./schema";

export type UiExperimentDefinition = {
  key: string;
  label: string;
  enabled: boolean;
  variant: UiExperimentVariant;
};

/** Canonical keys + defaults; DB/mem store seeds from this list. */
export const UI_EXPERIMENT_DEFINITIONS: readonly UiExperimentDefinition[] = [
  {
    key: "dashboard.calendar_sheet",
    label: "Dashboard: Calendar sheet (synchronous events)",
    enabled: true,
    variant: "control",
  },
  {
    key: "dashboard.global_status",
    label: "Dashboard: Global status board",
    enabled: true,
    variant: "control",
  },
  {
    key: "dashboard.invite_sheet",
    label: "Dashboard: Invite sheet",
    enabled: true,
    variant: "control",
  },
  {
    key: "dashboard.task_card_layout",
    label: "A/B: Task card density (spacious vs compact)",
    enabled: true,
    variant: "control",
  },
] as const;

export function defaultExperimentsRecord(): Record<
  string,
  Omit<UiExperimentDefinition, "label"> & { label: string }
> {
  const out: Record<
    string,
    Omit<UiExperimentDefinition, "label"> & { label: string }
  > = {};
  for (const d of UI_EXPERIMENT_DEFINITIONS) {
    out[d.key] = { ...d };
  }
  return out;
}

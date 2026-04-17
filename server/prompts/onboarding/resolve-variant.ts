/**
 * Which onboarding system-prompt variant to use. Wire to experiments or env;
 * default is stable for production.
 */
export type OnboardingPromptVariantId = "control" | "variant_b";

const VALID = new Set<OnboardingPromptVariantId>(["control", "variant_b"]);

/**
 * Resolved from `ONBOARDING_SYSTEM_PROMPT_VARIANT` (server env).
 * Values: `control` | `variant_b` (aliases: `b` → variant_b).
 * Later you can replace this with a lookup from `ui_experiments` or invite metadata.
 */
export function resolveOnboardingPromptVariant(): OnboardingPromptVariantId {
  const raw = process.env.ONBOARDING_SYSTEM_PROMPT_VARIANT?.trim().toLowerCase();
  if (!raw) return "control";
  if (raw === "b" || raw === "variant_b") return "variant_b";
  if (VALID.has(raw as OnboardingPromptVariantId)) {
    return raw as OnboardingPromptVariantId;
  }
  return "control";
}

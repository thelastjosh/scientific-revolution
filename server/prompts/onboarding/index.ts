/**
 * Onboarding Anthropic system prompt — edit variants in ./variants.ts, assembly here.
 * A/B: set ONBOARDING_SYSTEM_PROMPT_VARIANT=variant_b (see .env.example).
 */
export { assembleOnboardingSystemPrompt } from "./assemble-system-prompt";
export { formatInviteContextBlock } from "./format-invite-block";
export {
  resolveOnboardingPromptVariant,
  type OnboardingPromptVariantId,
} from "./resolve-variant";
export { ONBOARDING_SYSTEM_VARIANT_BASE } from "./variants";

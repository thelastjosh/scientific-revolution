import type { OnboardingInvite } from "@shared/schema";
import { formatInviteContextBlock } from "./format-invite-block";
import type { OnboardingPromptVariantId } from "./resolve-variant";
import { ONBOARDING_SYSTEM_VARIANT_BASE } from "./variants";

/**
 * Full Anthropic system string for onboarding chat. Single assembly point for logging/tests.
 */
export function assembleOnboardingSystemPrompt(
  invite: OnboardingInvite | null,
  openingLine: string,
  variant: OnboardingPromptVariantId,
): string {
  const base = ONBOARDING_SYSTEM_VARIANT_BASE[variant];
  const inviteBlock = formatInviteContextBlock(invite);

  return [
    base,
    "",
    inviteBlock,
    "",
    `The user was already shown this exact greeting (do not repeat it, do not echo it as your whole reply): "${openingLine}"`,
    "Wait for their first reply before asking substantive onboarding questions.",
    "Keep every reply as short and curt as possible: prefer answers that are just one short sentence, or short bullet lines with a few words each. Avoid preamble, hedging, and repetition. Only go longer if the user explicitly asks for detail.",
  ].join("\n");
}

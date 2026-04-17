# Onboarding system prompts

## Files

| File | Purpose |
|------|---------|
| `variants.ts` | **Edit here first.** Per-variant static instructions (persona, tone, onboarding strategy). |
| `format-invite-block.ts` | How invite + research fields are rendered into the prompt (shared by all variants). |
| `assemble-system-prompt.ts` | Combines variant base + invite block + opening-line rule. |
| `resolve-variant.ts` | Chooses `control` vs `variant_b` (env today; DB/experiments later). |

## A/B testing

1. Tune copy in `variants.ts` (`control` vs `variant_b`).
2. Set server env: `ONBOARDING_SYSTEM_PROMPT_VARIANT=variant_b` (or `control`).
3. For per-user assignment, extend `resolveOnboardingPromptVariant()` to read `ui_experiments` or invite metadata.

## Rules (product)

- The opening line is **never** model-generated; it is assembled server-side and passed in as context so the model does not repeat it. Anonymous: `How can you help?`. With a first name: `Good morning|afternoon|evening, Name.` (UTC hour) or `Hi there, Name.` late night.

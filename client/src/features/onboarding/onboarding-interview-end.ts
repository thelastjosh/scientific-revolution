/**
 * After several interview turns, show an in-chat profile preview when the
 * assistant’s reply looks like a wrap-up / handoff (conservative; avoids
 * showing on the first few turns).
 */
const WRAP_UP_PATTERNS = [
  /profile (so far|summary|sketch|preview|snapshot)/i,
  /here['']?s (a |your )?(quick |brief )?(recap|summary|overview|sketch)/i,
  /quick recap/i,
  /that covers|that should cover|we['']?re good for now/i,
  /next step|next move|for next steps/i,
  /move on to|we can (?:wrap|move on|continue)/i,
  /you['']?re (?:all )?set|good place to (?:stop|pause)/i,
];

function interviewFlowStarted(
  userTurns: { text: string }[],
  helpPrompt: string,
): boolean {
  return userTurns.some(
    (t) =>
      t.text.trim() === "Continue interview" || t.text.trim() === helpPrompt,
  );
}

export function shouldShowInChatProfilePreview(
  assistantText: string,
  allUserMessages: { text: string }[],
  helpMeOnboardPrompt: string,
): boolean {
  const trimmed = assistantText.trim();
  if (trimmed.length < 24) return false;

  const userTurns = allUserMessages;
  if (userTurns.length < 2) return false;
  if (!interviewFlowStarted(userTurns, helpMeOnboardPrompt)) return false;
  if (!WRAP_UP_PATTERNS.some((p) => p.test(trimmed))) return false;
  return true;
}

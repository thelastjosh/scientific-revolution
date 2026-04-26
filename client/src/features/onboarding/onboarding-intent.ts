const HIGH_CONFIDENCE_PATTERNS = [
  /\bhelp me onboard\b/i,
  /\bonboard me\b/i,
  /\bget me started\b/i,
  /\bget started\b/i,
  /\bcreate account\b/i,
  /\bsign ?up\b/i,
  /\blog ?in\b/i,
  /\bsign ?in\b/i,
  /\binvite\b/i,
  /\binvite code\b/i,
  /\binvite link\b/i,
];

const INVITE_PARAM_PATTERN = /[?&]invite=([^&]+)/i;

export function shouldShowOnboardingBlock(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  if (INVITE_PARAM_PATTERN.test(normalized)) return true;
  return HIGH_CONFIDENCE_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** Title-scale decay: early messages use large type, converging to body size. */

const MAX_REM = 3.25;
const MIN_REM = 1;
/** Messages until we're effectively at minimum size */
const DECAY_STEPS = 14;

export function messageFontRem(messageIndex: number): number {
  if (messageIndex <= 0) return MAX_REM;
  const t = Math.min(messageIndex / DECAY_STEPS, 1);
  return MAX_REM - t * (MAX_REM - MIN_REM);
}

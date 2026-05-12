import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function signNetworkBody(secret: string, timestampMs: string, rawBodyUtf8: string): string {
  return createHmac("sha256", secret).update(`${timestampMs}.${rawBodyUtf8}`).digest("hex");
}

export function verifyNetworkSignature(
  secret: string,
  timestampMs: string,
  rawBodyUtf8: string,
  signatureHex: string,
): boolean {
  const ts = Number(timestampMs);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_CLOCK_SKEW_MS) {
    return false;
  }
  const expected = signNetworkBody(secret, timestampMs, rawBodyUtf8);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signatureHex.trim(), "hex");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

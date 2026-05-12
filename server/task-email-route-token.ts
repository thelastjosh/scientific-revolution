import { createHmac, timingSafeEqual } from "node:crypto";

export type TaskRoutePayload = {
  taskId: string;
  ownerUserId: string;
  exp: number;
};

function secret(): string {
  return process.env.TASK_EMAIL_ROUTE_SECRET?.trim() || "";
}

/** Base64url without padding issues for email local-part (use URL-safe chars only). */
function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = 4 - (s.length % 4);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + (pad < 4 ? "=".repeat(pad) : "");
  return Buffer.from(b64, "base64");
}

/**
 * Opaque token for Reply-To routing: payload.signature (HMAC-SHA256 of payload JSON).
 */
export function encodeTaskEmailRouteToken(input: TaskRoutePayload): string {
  const s = secret();
  if (!s) throw new Error("TASK_EMAIL_ROUTE_SECRET is not configured");
  const payloadJson = JSON.stringify(input);
  const payloadB64 = b64url(Buffer.from(payloadJson, "utf8"));
  const sig = createHmac("sha256", s).update(payloadB64).digest();
  const sigB64 = b64url(sig);
  return `${payloadB64}.${sigB64}`;
}

export function decodeTaskEmailRouteToken(token: string): TaskRoutePayload | null {
  const s = secret();
  if (!s) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;
  const expectedSig = createHmac("sha256", s).update(payloadB64).digest();
  let provided: Buffer;
  try {
    provided = b64urlDecode(sigB64);
  } catch {
    return null;
  }
  if (expectedSig.length !== provided.length) return null;
  try {
    if (!timingSafeEqual(expectedSig, provided)) return null;
  } catch {
    return null;
  }
  let parsed: TaskRoutePayload;
  try {
    parsed = JSON.parse(b64urlDecode(payloadB64).toString("utf8")) as TaskRoutePayload;
  } catch {
    return null;
  }
  if (!parsed.taskId || !parsed.ownerUserId || typeof parsed.exp !== "number") return null;
  if (Date.now() > parsed.exp) return null;
  return parsed;
}

/** Local-part for Reply-To: reply-{token} (token is base64url.base64url with single middle dot). */
export function replyLocalPartFromToken(token: string): string {
  return `reply-${token}`;
}

export function tokenFromReplyLocalPart(localPart: string): string | null {
  const prefix = "reply-";
  if (!localPart.startsWith(prefix)) return null;
  return localPart.slice(prefix.length) || null;
}

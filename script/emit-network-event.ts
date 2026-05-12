/**
 * Emit a signed append-event to a local Sail server (smoke test for federated gateway).
 *
 * Usage:
 *   SAIL_BASE=http://127.0.0.1:5000 \
 *   AGENT_SIGNING_SECRET=... \
 *   ORG_ID=public-ai \
 *   npx tsx script/emit-network-event.ts
 */
import { createHmac } from "node:crypto";

const BASE = (process.env.SAIL_BASE || "http://127.0.0.1:5000").replace(/\/$/, "");
const SECRET = process.env.AGENT_SIGNING_SECRET || "";
const ORG = process.env.ORG_ID || "public-ai";

function sign(ts: string, body: string) {
  return createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");
}

async function main() {
  if (!SECRET) {
    console.error("Set AGENT_SIGNING_SECRET");
    process.exit(1);
  }
  const bodyObj = {
    organizationId: ORG,
    traceId: `script-${Date.now()}`,
    dedupeKey: `script-${Date.now()}`,
    direction: "inbound" as const,
    channel: "telegram",
    threadKey: "telegram:stub-thread",
    body: "Smoke test from script/emit-network-event.ts",
    actorExternalHandle: "@stub",
  };
  const raw = JSON.stringify(bodyObj);
  const ts = String(Date.now());
  const sig = sign(ts, raw);
  const res = await fetch(`${BASE}/internal/network/append-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sail-Timestamp": ts,
      "X-Sail-Signature": sig,
    },
    body: raw,
  });
  const text = await res.text();
  console.log(res.status, text);
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

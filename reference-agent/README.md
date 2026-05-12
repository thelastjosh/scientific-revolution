# Reference agent stub

Minimal **Node** HTTP server that implements `POST /v1/network/dispatch` for testing Sail’s dispatch + HMAC path without OpenClaw or another full runtime.

## Run

1. Register the agent in Sail (admin UI or API) with `baseUrl` `http://127.0.0.1:47123` and set status **active**.
2. Copy the `signingSecret` from the create response (or after `rotate-secret`).
3. Start the stub:

```bash
export AGENT_SIGNING_SECRET='paste-secret-here'
export AGENT_STUB_PORT=47123
node reference-agent/stub-server.mjs
```

4. From Sail (as admin), call `POST /api/admin/network/agents/:organizationId/ping` or use the dispatch service in code.

If `AGENT_SIGNING_SECRET` is unset, the stub accepts any signature (dev convenience only).

## Simulate Telegram-style event (via Sail API)

With the server running and the org agent registered, use `curl` to call Sail’s **append-event** (replace `BASE`, `ORG`, body fields, and signatures—generate signature with the same rule as [server/network-agent/hmac.ts](../server/network-agent/hmac.ts)):

```bash
BODY='{"organizationId":"public-ai","traceId":"t1","dedupeKey":"tg-demo-1","direction":"inbound","channel":"telegram","threadKey":"tg:123","body":"Hello from stub user"}'
TS=$(node -e "console.log(Date.now())")
SIG=$(node -e "const c=require('crypto');const s=process.env.AGENT_SIGNING_SECRET;const b=process.env.BODY;const t=process.env.TS;console.log(c.createHmac('sha256',s).update(t+'.'+b).digest('hex'))")
# export BODY, TS, AGENT_SIGNING_SECRET first, then curl - use script/emit-network-event.ts instead for reliability
```

Prefer **`npm run network:emit-test`** (see [script/emit-network-event.ts](../script/emit-network-event.ts)) after exporting `SAIL_BASE`, `AGENT_SIGNING_SECRET`, and `ORG_ID`.

## Production

Replace this stub with your real multi-tenant agent (e.g. OpenClaw) implementing the same **dispatch** path and calling Sail’s **internal** routes with the org signing secret.

# scientific-revolution
Project management

## Architecture

- [SPECIFICATION.md](SPECIFICATION.md) — product direction and surfaces.
- [ARCHITECTURE-AGENT-GATEWAY.md](ARCHITECTURE-AGENT-GATEWAY.md) — federated org agent registry and Sail ↔ agent network contract.

## Environment (task email / Resend)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Send handoff email and call `emails.receiving.get` for inbound bodies. |
| Outbound `From` | Fixed to **`support@sourceful.org`** in [`server/email/from-address.ts`](server/email/from-address.ts) (must be a verified sender/domain in Resend). |
| `TASK_EMAIL_DOMAIN` | Optional explicit domain for `Message-ID` and `Reply-To` addresses (defaults to `sourceful.org` from the outbound address). |
| `TASK_EMAIL_ROUTE_SECRET` | HMAC secret for opaque Reply-To routing tokens. |
| `RESEND_WEBHOOK_SIGNING_SECRET` | Svix signing secret from the Resend webhook (`whsec_…`) for `POST /internal/webhooks/resend/inbound`. |

**Resend inbound:** Enable receiving on your domain in Resend, then add a webhook that posts `email.received` to your deployed `https://<host>/internal/webhooks/resend/inbound` with the signing secret above.

**Optional agent fan-out:** If the org has an **active** gateway agent whose `capability_manifest` includes `email`, an inbound reply triggers a `task_update` dispatch after the event is recorded.

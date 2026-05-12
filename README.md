# scientific-revolution
Project management

## Architecture

- [SPECIFICATION.md](SPECIFICATION.md) — product direction and surfaces.
- [ARCHITECTURE-AGENT-GATEWAY.md](ARCHITECTURE-AGENT-GATEWAY.md) — federated org agent registry and Sail ↔ agent network contract.

## Environment (task email / Resend)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Send handoff email and call `emails.receiving.get` for inbound bodies. |
| `EMAIL_FROM` | Verified sender (e.g. `Sail <tasks@yourdomain.com>`). Domain used for Reply-To when `TASK_EMAIL_DOMAIN` is unset. |
| `TASK_EMAIL_DOMAIN` | Optional explicit domain for `Message-ID` and `Reply-To` addresses (defaults to host part of `EMAIL_FROM`). |
| `TASK_EMAIL_ROUTE_SECRET` | HMAC secret for opaque Reply-To routing tokens. |
| `RESEND_WEBHOOK_SIGNING_SECRET` | Svix signing secret from the Resend webhook (`whsec_…`) for `POST /internal/webhooks/resend/inbound`. |

**Resend inbound:** Enable receiving on your domain in Resend, then add a webhook that posts `email.received` to your deployed `https://<host>/internal/webhooks/resend/inbound` with the signing secret above.

**Optional agent fan-out:** If the org has an **active** gateway agent whose `capability_manifest` includes `email`, an inbound reply triggers a `task_update` dispatch after the event is recorded.

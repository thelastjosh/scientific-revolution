# Connectors

Pluggable outbound messaging integrations backed by `channel_credentials`.

## Add a new connector

1. Add the id to `CONNECTOR_IDS` in [`shared/connectors/types.ts`](../../shared/connectors/types.ts).
2. Implement `ConnectorAdapter` in `adapters/<id>-adapter.ts`.
3. Register catalog + adapter in [`registry.ts`](registry.ts).
4. Set `status: "available"` and `capabilities.outboundSend: true` when ready to send.
5. Document env vars in root `README.md` and `.env.example`.

Shared orchestration (CRUD, test send, task handoff) lives in `connector-service.ts` and `task-handoff-service.ts` — adapters should not duplicate that logic.

## Credential storage

- `channel_credentials.provider` = connector id
- `credential_ref` = JSON string validated by the adapter
- One row per `(user_id, provider)` (unique index)

## Telegram (reference)

- Env: `TELEGRAM_BOT_TOKEN`
- Credential: `{ "chatId": "<numeric>" }`

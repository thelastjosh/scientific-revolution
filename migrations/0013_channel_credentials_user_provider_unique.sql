-- One connector row per user per provider (e.g. single Telegram link).
CREATE UNIQUE INDEX IF NOT EXISTS "channel_credentials_user_provider_uidx"
  ON "channel_credentials" ("user_id", "provider");

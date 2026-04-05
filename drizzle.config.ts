import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl } from "./shared/database-url";
import { poolConfigFromUrl } from "./shared/pg-pool";

config();

// drizzle-kit needs a URL for some commands; use DATABASE_URL / POSTGRES_URL or a non-connecting placeholder for generate.
const rawUrl = getDatabaseUrl();
const databaseUrl = rawUrl
  ? poolConfigFromUrl(rawUrl).connectionString
  : "postgresql://127.0.0.1:5432/scientific_revolution_placeholder";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});

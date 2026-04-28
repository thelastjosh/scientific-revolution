import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl } from "./shared/database-url";
import { poolConfigFromUrl } from "./shared/pg-pool";

config();

// drizzle-kit should always target POSTGRES_URL (via shared/database-url).
const rawUrl = getDatabaseUrl();
const databaseUrl = poolConfigFromUrl(rawUrl).connectionString;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});

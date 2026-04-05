import { defineConfig } from "drizzle-kit";

// drizzle-kit needs a URL for some commands; use DATABASE_URL or a non-connecting placeholder for generate.
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://127.0.0.1:5432/scientific_revolution_placeholder";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});

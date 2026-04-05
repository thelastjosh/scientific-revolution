import "dotenv/config";
import pg from "pg";
import { getDatabaseUrl } from "../shared/database-url";
import { poolConfigFromUrl } from "../shared/pg-pool";

const url = getDatabaseUrl();
if (!url) {
  console.error(
    "DATABASE_URL or POSTGRES_URL is not set. Add one to .env (Supabase: Project Settings → Database → Connection string, URI).",
  );
  process.exit(1);
}

const pool = new pg.Pool(poolConfigFromUrl(url));
try {
  const r = await pool.query(
    "select 1 as ok, current_database() as database, version() as version",
  );
  const row = r.rows[0] as { ok: number; database: string; version: string };
  console.log("Supabase/Postgres OK:", {
    ok: row.ok,
    database: row.database,
    version: row.version.split("\n")[0],
  });
} finally {
  await pool.end();
}

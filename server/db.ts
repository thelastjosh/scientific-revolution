import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { getDatabaseUrl } from "@shared/database-url";
import { poolConfigFromUrl } from "@shared/pg-pool";
import * as schema from "@shared/schema";

let pool: pg.Pool | undefined;

export function getDb() {
  const url = getDatabaseUrl();
  if (!url) {
    return undefined;
  }
  if (!pool) {
    pool = new pg.Pool(poolConfigFromUrl(url));
  }
  return drizzle(pool, { schema });
}

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

let pool: pg.Pool | undefined;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return undefined;
  }
  if (!pool) {
    pool = new pg.Pool({ connectionString: url });
  }
  return drizzle(pool, { schema });
}

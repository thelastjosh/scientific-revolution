import type { PoolConfig } from "pg";

/**
 * Hosted Postgres (Supabase pooler, Neon, Vercel, etc.) often needs relaxed TLS in Node.
 * `pg` parses the connection string *after* Pool options, so `ssl: { rejectUnauthorized: false }`
 * is ignored when the URI has `sslmode=require`. Setting `sslmode=no-verify` in the URL is reliable.
 */
function useRelaxedSsl(connectionString: string): boolean {
  if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false") {
    return true;
  }
  return /supabase|neon\.tech|vercel-storage/i.test(connectionString);
}

function connectionStringWithSslNoVerify(connectionString: string): string {
  try {
    const u = new URL(connectionString);
    u.searchParams.set("sslmode", "no-verify");
    return u.href;
  } catch {
    const sep = connectionString.includes("?") ? "&" : "?";
    return `${connectionString}${sep}sslmode=no-verify`;
  }
}

export function poolConfigFromUrl(connectionString: string): PoolConfig {
  if (useRelaxedSsl(connectionString)) {
    return { connectionString: connectionStringWithSslNoVerify(connectionString) };
  }
  return { connectionString };
}

/**
 * Postgres connection string. Vercel and some Supabase templates use POSTGRES_URL;
 * we accept DATABASE_URL or POSTGRES_URL (DATABASE_URL wins if both are set).
 */
export function getDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  const u = raw?.trim();
  return u || undefined;
}

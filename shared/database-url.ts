/**
 * Postgres connection string. Vercel and some Supabase templates use POSTGRES_URL;
 * we accept DATABASE_URL or POSTGRES_URL (POSTGRES_URL wins if both are set).
 * If both are present but point to different DBs, throw a clear error.
 */
export function getDatabaseUrl(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;
  const postgresUrl = process.env.POSTGRES_URL?.trim() || undefined;

  if (databaseUrl && postgresUrl && databaseUrl !== postgresUrl) {
    throw new Error(
      'Conflicting DB env vars: DATABASE_URL and POSTGRES_URL differ. Use one canonical DB URL (recommended: POSTGRES_URL).',
    );
  }

  return postgresUrl ?? databaseUrl;
}

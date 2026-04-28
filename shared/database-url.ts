/**
 * Canonical Postgres connection string.
 * We intentionally require POSTGRES_URL to avoid runtime/migration drift.
 * DATABASE_URL may exist in some environments, but is treated only as a
 * consistency check against POSTGRES_URL.
 */
export function getDatabaseUrl(): string | undefined {
  const postgresUrl = process.env.POSTGRES_URL?.trim() || undefined;
  const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;

  if (!postgresUrl) {
    throw new Error(
      "POSTGRES_URL is required. Set POSTGRES_URL to the canonical database connection string.",
    );
  }

  if (databaseUrl && databaseUrl !== postgresUrl) {
    throw new Error(
      "Conflicting DB env vars: DATABASE_URL and POSTGRES_URL differ. Keep POSTGRES_URL canonical or make DATABASE_URL match exactly.",
    );
  }

  return postgresUrl;
}

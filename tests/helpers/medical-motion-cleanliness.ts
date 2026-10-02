import { createRequire } from "node:module";

/** Test-only direct transport. Never falls back to a remote database or psql. */
export function cleanlinessTarget(value: string | undefined) {
  let url: URL;
  try { url = new URL(value!); } catch { throw Error("ISOLATED_DATABASE_GUARD_FAILED"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.pathname !== "/organheal_ownership_test_step3c" || url.search || url.hash) {
    throw Error("ISOLATED_DATABASE_GUARD_FAILED");
  }
  return {
    host: url.hostname, port: Number(url.port || 5432),
    database: url.pathname.slice(1), user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password), ssl: false,
    connectionTimeoutMillis: 5000, statement_timeout: 7000, query_timeout: 10000,
  };
}

export async function finalDatabaseCleanliness() {
  const target = cleanlinessTarget(process.env.ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL);
  const { Client } = createRequire(import.meta.url)("pg");
  const client = new Client(target);
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const result = await client.query(
      "SELECT (SELECT count(*) FROM public.background_jobs)::text AS jobs, " +
      "(SELECT count(*) FROM public.medical_motion_artifacts)::text AS artifacts",
    );
    await client.query("COMMIT");
    const row = result.rows[0];
    if (!row || !/^\d+$/.test(row.jobs) || !/^\d+$/.test(row.artifacts)) {
      throw Error("INVALID_CLEANLINESS_RESULT");
    }
    return { jobs: Number(row.jobs), artifacts: Number(row.artifacts) };
  } catch {
    // Never propagate driver diagnostics containing private connection details.
    throw Error("ISOLATED_CLEANLINESS_FAILED");
  } finally {
    await client.end().catch(() => {});
  }
}

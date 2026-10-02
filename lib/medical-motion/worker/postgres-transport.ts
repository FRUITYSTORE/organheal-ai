import { Client, Query, type QueryArrayConfig } from "pg";

export function isolatedPostgresTarget(env: NodeJS.ProcessEnv) {
  let url: URL;
  try { url = new URL(env.ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL!); }
  catch { throw Error("INVALID_ISOLATED_DATABASE"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.pathname !== "/organheal_ownership_test_step3c" || url.search || url.hash) {
    throw Error("INVALID_ISOLATED_DATABASE");
  }
  return { url, config: {
    host: url.hostname, port: Number(url.port || 5432),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    database: url.pathname.slice(1), ssl: false,
    connectionTimeoutMillis: 5000, statement_timeout: 7000,
    application_name: "organheal-isolated-motion", options: "-c standard_conforming_strings=on",
  } };
}

/** One connection per call preserves session-local roles and multi-statement transactions.
 * Rows remain PostgreSQL text, matching the former unaligned CLI contract. */
export async function isolatedPostgresQuery(env: NodeJS.ProcessEnv, input: string, onLocked?: () => void) {
  const { config } = isolatedPostgresTarget(env);
  const client = new Client(config);
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let output = "", notified = false;
  client.on("error", () => {}); // No raw driver diagnostics escape this boundary.
  try {
    return await Promise.race([
      (async () => {
        await client.connect();
        const marker = onLocked ? /select\s+'(?:JOB_LOCKED|PUBLICATION_LOCKED|OWNERSHIP_LOCK_HELD)'\s*;/i.exec(input) : null;
        const boundary = marker ? marker.index + marker[0].length : input.length;
        const chunks = marker ? [input.slice(0, boundary), input.slice(boundary)] : [input];
        for (const text of chunks.filter(value => value.trim())) await new Promise<void>((resolve, reject) => {
          const config: QueryArrayConfig = { text, rowMode: "array", types: { getTypeParser: () => (value: string) => value } };
          const query = new Query(config);
          query.on("row", (row: unknown[]) => {
            output += row.map(value => value === null ? "" : String(value)).join("|") + "\n";
            if (output.length > 2 * 1024 * 1024) { reject(Error("ISOLATED_DATABASE_RESPONSE_INVALID")); void client.end(); }
            if (onLocked && !notified && /(?:JOB_LOCKED|PUBLICATION_LOCKED|OWNERSHIP_LOCK_HELD)/.test(output)) {
              notified = true; onLocked();
            }
          });
          query.on("error", reject);
          query.on("end", () => resolve());
          client.query(query);
        });
        return output.trim();
      })(),
      new Promise<never>((_, reject) => {
        deadline = setTimeout(() => { reject(Error("ISOLATED_DATABASE_TIMEOUT")); void client.end(); }, 10000);
      }),
    ]);
  } catch (error) {
    const raw = error as { code?: string; message?: string };
    const code = raw.code && /^[0-9A-Z]{5}$/.test(raw.code) ? raw.code : undefined;
    const category = raw.message === "ISOLATED_DATABASE_TIMEOUT" || code === "57014" ? "ISOLATED_DATABASE_TIMEOUT" :
      raw.message === "ISOLATED_DATABASE_RESPONSE_INVALID" ? raw.message : code ? "ISOLATED_DATABASE_RPC_FAILED" : "ISOLATED_DATABASE_UNAVAILABLE";
    throw Object.assign(Error(category), { code });
  } finally {
    if (deadline) clearTimeout(deadline);
    await client.end().catch(() => {});
  }
}

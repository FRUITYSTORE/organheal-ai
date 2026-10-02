import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
export class LocalPostgresError extends Error {
  constructor(readonly code?: string) { super("Local context PostgreSQL assertion failed."); }
}
export function configuration() {
  let url: URL;
  const executable = process.env.ORGANHEAL_TEST_PSQL;
  try { url = new URL(process.env.ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL!); } catch { throw new Error("Local context test configuration unavailable."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/organheal_ownership_test_step3c" || !executable || !existsSync(executable)) {
    throw new Error("Local context database safety guard failed.");
  }
  return { url, executable };
}
export function sql(input: string, onLocked?: () => void): Promise<string> {
  const { url, executable } = configuration();
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ["-X", "-w", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-h", url.hostname,
      "-p", url.port || "5432", "-U", decodeURIComponent(url.username), "-d", url.pathname.slice(1)],
    { env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password), PGOPTIONS: "-c statement_timeout=7000", PGCONNECT_TIMEOUT: "5" }, windowsHide: true });
    let output = "", notified = false, code: string | undefined;
    child.stdout.on("data", chunk => {
      output += String(chunk);
      if (onLocked && !notified && output.includes("JOB_LOCKED")) { notified = true; onLocked(); }
    });
    child.stderr.on("data", chunk => {
      // sqlstate-only diagnostics: retain an allow-listed code, never text.
      code = String(chunk).match(/ERROR:\s+([0-9A-Z]{5})\b/)?.[1] ?? code;
    });
    child.on("error", () => reject(new Error("Local PostgreSQL client unavailable.")));
    child.on("close", exitCode => exitCode === 0 ? resolve(output.trim()) : reject(new LocalPostgresError(code)));
    child.stdin.end("set standard_conforming_strings=on;\n" + input);
  });
}

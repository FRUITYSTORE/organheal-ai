// Optional operational acceptance: no rendering, clinical data or diagnostic logs.
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runBlenderProcess } from "../lib/medical-motion/render/blender-process.ts";

const executable = process.env.BLENDER_PATH ?? "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe";
await access(executable);
const version = await runBlenderProcess(executable, ["--version"], 10_000);
if (version.outcome !== "closed" || version.exitCode !== 0 || !version.stdout.includes("Blender 5.2.1")) throw new Error("Expected Blender 5.2.1 unavailable.");
const root = await mkdtemp(path.join(tmpdir(), "organheal-cancel-"));
const ready = path.join(root, "ready");
const controller = new AbortController();
let safeToClean = false;
try {
  // Only an ephemeral readiness marker; no output path or diagnostics persist.
  const expression = `import pathlib,time; pathlib.Path(${JSON.stringify(ready)}).write_text('ready'); time.sleep(60)`;
  const task = runBlenderProcess(executable, ["--background", "--factory-startup", "--python-expr", expression], 20_000, controller.signal);
  const deadline = Date.now() + 12_000;
  let started = false;
  while (Date.now() < deadline) {
    try { started = (await readFile(ready, "utf8")) === "ready"; } catch { /* wait for controlled fixture */ }
    if (started) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  const cancelledAt = Date.now(); controller.abort();
  const result = await task; safeToClean = result.terminationConfirmed;
  if (!started || result.outcome !== "cancelled" || !safeToClean) throw new Error("Real Blender cancellation acceptance failed.");
  console.log(JSON.stringify({ blender: "5.2.1", fixtureStarted: true, outcome: result.outcome,
    directChildTerminationConfirmed: true, cancellationMs: Date.now() - cancelledAt, renderingPerformed: false }));
} finally {
  controller.abort();
  if (safeToClean) await rm(root, { recursive: true, force: true });
}

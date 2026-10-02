import "server-only";
import { mkdir, lstat, realpath, statfs, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ARTIFACT_MAX_BYTES } from "../artifacts/repository";

/** Startup probes own only their UUID files. Invocation cleanup remains renderer-owned. */
export async function verifyWorkerWorkspace(env: Readonly<Record<string,string|undefined>>, concurrency: number) {
  const roots = [tmpdir(), env.MEDICAL_MOTION_OUTPUT_ROOT ?? path.join(tmpdir(), "organheal-render-output")];
  for (const root of new Set(roots)) {
    if (!path.isAbsolute(root)) throw Error("WORKSPACE_UNAVAILABLE");
    await mkdir(root, { recursive: true, mode: 0o700 });
    if ((await lstat(root)).isSymbolicLink()) throw Error("WORKSPACE_UNAVAILABLE");
    const resolved = await realpath(root);
    // Maximum artifact per slot plus 64 MiB startup reserve. This is a
    // preflight floor, not a guarantee of sufficient space for every render.
    const disk = await statfs(resolved);
    if (disk.bavail * disk.bsize < concurrency * ARTIFACT_MAX_BYTES + 64 * 1024 * 1024) throw Error("WORKSPACE_UNAVAILABLE");
    const probe = path.join(resolved, `.worker-probe-${randomUUID()}`);
    await writeFile(probe, "probe", { flag: "wx", mode: 0o600 });
    await unlink(probe);
  }
}

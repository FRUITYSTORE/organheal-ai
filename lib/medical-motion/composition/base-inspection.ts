import "server-only";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createArtifactOwnership, discardArtifact } from "../render/artifact-output";
import type { ArtifactRecord } from "../artifacts/repository";
import type { PrivateArtifactStorage } from "../artifacts/storage";
import { inspectMedia, type FfmpegRuntime } from "./ffmpeg-runtime";
import { CompositionError } from "./specification";
/** Trusted actual duration from immutable storage bytes, not client/AI hints. */
export async function inspectApprovedBase(base: ArtifactRecord, storage: PrivateArtifactStorage, runtime: FfmpegRuntime, signal: AbortSignal, hint: number) {
  const stored = await storage.read(base.id, signal);
  if (!stored || stored.bytes.length !== base.byteSize || createHash("sha256").update(stored.bytes).digest("hex") !== base.sha256)
    throw new CompositionError("COMPOSITION_INVALID");
  if (base.media === "still") return hint;
  const owner = await createArtifactOwnership("base.mp4", "video");
  try { await writeFile(owner.outputPath, stored.bytes, { flag: "wx", mode: 0o600 });
    return (await inspectMedia(runtime, owner.outputPath, owner.directory, signal)).duration;
  } finally { await discardArtifact(owner); }
}

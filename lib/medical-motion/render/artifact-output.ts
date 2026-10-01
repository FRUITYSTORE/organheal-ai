import { lstat, mkdir, mkdtemp, open, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { RenderMedia } from "../contracts/scene";
import type { OutputDimensions } from "./dimension-policy";

export type ArtifactOwnership = Readonly<{ root: string; directory: string; outputPath: string; media: RenderMedia }>;

/** The legacy outputPath argument is now a filename, never a destination.
 * Capability matching still uses the original argument; only server code allocates paths. */
export function validArtifactName(name: unknown, media: RenderMedia): name is string {
  return typeof name === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}\.(png|mp4)$/.test(name) &&
    !name.includes("..") && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i.test(name) &&
    name.endsWith(media === "still" ? ".png" : ".mp4");
}

export async function createArtifactOwnership(name: string, media: RenderMedia): Promise<ArtifactOwnership> {
  if (!validArtifactName(name, media)) throw new Error("Invalid artifact filename.");
  // Trusted server configuration, not request input. Successful artifacts remain
  // for the caller; retention/storage is outside this renderer's current scope.
  const configured = process.env.MEDICAL_MOTION_OUTPUT_ROOT?.trim() || path.join(tmpdir(), "organheal-render-output");
  if (!path.isAbsolute(configured)) throw new Error("Output root must be absolute.");
  await mkdir(configured, { recursive: true, mode: 0o700 });
  const info = await lstat(configured);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Unsafe output root.");
  const root = await realpath(configured);
  // Atomic exclusive directory creation supplies invocation identity, even for
  // simultaneous requests with the same scene/signature/filename.
  const directory = await mkdtemp(path.join(root, "invocation-"), { encoding: "utf8" });
  const outputPath = path.join(directory, name);
  return Object.freeze({ root, directory, outputPath, media });
}

async function assertOwnership(owner: ArtifactOwnership) {
  if (path.dirname(owner.directory) !== owner.root || path.dirname(owner.outputPath) !== owner.directory ||
      !validArtifactName(path.basename(owner.outputPath), owner.media)) throw new Error("Invalid artifact ownership.");
  const directory = await lstat(owner.directory);
  if (!directory.isDirectory() || directory.isSymbolicLink() || await realpath(owner.directory) !== owner.directory) {
    throw new Error("Artifact location changed.");
  }
}

/** Only invocation-owned partial files are removed; cleanup cannot replace a failure. */
export async function discardArtifact(owner: ArtifactOwnership): Promise<void> {
  try {
    await assertOwnership(owner);
    await rm(owner.directory, { recursive: true, force: true });
  } catch { /* Preserve the original error; operational cleanup failures remain deferred observability. */ }
}

export async function validateArtifact(owner: ArtifactOwnership, dimensions: OutputDimensions):
  Promise<{ ok: true; byteSize: number } | { ok: false; message: string }> {
  try {
    await assertOwnership(owner);
    const info = await lstat(owner.outputPath);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.size <= 0 ||
        path.dirname(await realpath(owner.outputPath)) !== owner.directory) throw new Error("Invalid artifact file.");
    const file = await open(owner.outputPath, "r");
    try {
      const read = async (position: number, count: number) => {
        const data = Buffer.alloc(count);
        const { bytesRead } = await file.read(data, 0, count, position);
        if (bytesRead !== count) throw new Error("Truncated artifact.");
        return data;
      };
      if (owner.media === "still") {
        const header = await read(0, 33);
        if (!header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
            header.readUInt32BE(8) !== 13 || header.toString("ascii", 12, 16) !== "IHDR" ||
            header.readUInt32BE(16) !== dimensions.width || header.readUInt32BE(20) !== dimensions.height) {
          throw new Error("Wrong PNG identity/dimensions.");
        }
        let position = 8, chunks = 0, imageData = false, ended = false;
        while (position < info.size) {
          if (++chunks > 10_000) throw new Error("Too many PNG chunks.");
          const chunk = await read(position, 8);
          const size = chunk.readUInt32BE(0), type = chunk.toString("ascii", 4, 8);
          if (size > info.size - position - 12) throw new Error("Truncated PNG chunk.");
          if (type === "IDAT") imageData = true;
          if (type === "IEND") {
            if (size !== 0 || position + 12 !== info.size ||
                !(await read(position + 8, 4)).equals(Buffer.from([174, 66, 96, 130]))) throw new Error("Invalid PNG ending.");
            ended = true;
          }
          position += size + 12;
        }
        if (!imageData || !ended) throw new Error("Incomplete PNG.");
        // Existing project dependency: decode the full PNG, not just its header.
        await sharp(owner.outputPath, { failOn: "warning", limitInputPixels: dimensions.width * dimensions.height })
          .raw().toBuffer();
      } else {
        // Bounded top-level ISO-BMFF validation only. Codec/dimensions/timing
        // remain operationally tested, not claimed here without a media probe.
        let position = 0, boxes = 0, foundType = false, foundMovie = false, foundData = false;
        const children = async (start: number, end: number) => {
          const entries: { type: string; start: number; end: number }[] = [];
          while (start < end) {
            if (++boxes > 10_000 || end - start < 8) throw new Error("Invalid movie box.");
            const header = await read(start, 8);
            const size = header.readUInt32BE(0);
            // Production Blender's movie metadata uses ordinary sized boxes;
            // unsupported extended/fragmented metadata fails explicitly.
            if (size < 8 || size > end - start) throw new Error("Invalid movie metadata.");
            entries.push({ type: header.toString("ascii", 4, 8), start: start + 8, end: start + size });
            start += size;
          }
          return entries;
        };
        while (position < info.size) {
          if (++boxes > 10_000) throw new Error("Too many container boxes.");
          const header = await read(position, 8);
          let size = header.readUInt32BE(0), headerSize = 8;
          const type = header.toString("ascii", 4, 8);
          if (size === 1) {
            const extended = (await read(position + 8, 8)).readBigUInt64BE();
            if (extended > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Invalid box size.");
            size = Number(extended); headerSize = 16;
          } else if (size === 0) size = info.size - position;
          if (size < headerSize || size > info.size - position) throw new Error("Truncated container.");
          if (type === "ftyp") {
            if (foundType || position !== 0 || size - headerSize < 8 || size - headerSize > 4096 || (size - headerSize) % 4 !== 0) {
              throw new Error("Invalid container signature.");
            }
            const brands = await read(position + headerSize, size - headerSize);
            const allowed = new Set(["isom", "iso2", "mp41", "mp42"]);
            foundType = allowed.has(brands.toString("ascii", 0, 4));
            for (let i = 8; i < brands.length; i += 4) foundType ||= allowed.has(brands.toString("ascii", i, i + 4));
          }
          if (type === "moov") {
            if (foundMovie) throw new Error("Duplicate movie metadata.");
            const entries = await children(position + headerSize, position + size);
            const header = entries.find((entry) => entry.type === "mvhd");
            const tracks = entries.filter((entry) => entry.type === "trak");
            if (!header || header.end - header.start < 20 || tracks.length !== 1) throw new Error("Missing movie/video track.");
            const media = (await children(tracks[0].start, tracks[0].end)).find((entry) => entry.type === "mdia");
            if (!media) throw new Error("Missing track metadata.");
            const handler = (await children(media.start, media.end)).find((entry) => entry.type === "hdlr");
            if (!handler || handler.end - handler.start < 12 || (await read(handler.start + 8, 4)).toString("ascii") !== "vide") {
              throw new Error("Not a video-only MP4.");
            }
            foundMovie = true;
          }
          if (type === "mdat") foundData ||= size > headerSize;
          position += size;
        }
        if (!foundType || !foundMovie || !foundData) throw new Error("Unrecognized MP4 container.");
      }
    } finally { await file.close(); }
    return { ok: true, byteSize: info.size };
  } catch {
    return { ok: false, message: "Expected render artifact is missing, invalid, or does not match the requested output." };
  }
}

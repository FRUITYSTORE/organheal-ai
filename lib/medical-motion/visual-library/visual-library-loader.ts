import "server-only";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { audioHash, audioIdentity, deepAudioFreeze } from "../composition/narration-foundation";
import { MASTER_VISUAL_LIBRARY_V1 } from "./visual-library-manifest";

export class VisualLibraryError extends Error {}
export function invalidLibrary(code = "VISUAL_LIBRARY_INVALID"): never { throw new VisualLibraryError(code); }
export type LibraryAsset = Readonly<{ id: string; pack: string; organ: string; category: string; concept: string;
  file: string; sha256: string; authority: "REFERENCE_ONLY"; medicalReviewStatus: "PENDING"; patientFacing: false }>;
export type VisualLibrary = Readonly<{ version: "v1"; fingerprint: string; assets: readonly LibraryAsset[] }>;
const roots = new WeakMap<object, string>();
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) invalidLibrary();
  return v as Record<string, unknown>;
};
export function validateLibraryPolicy(v: unknown) {
  const p = object(v);
  if (p.patientFacing !== false || p.medicalReviewStatus !== "PENDING" || p.visualAuthority !== "REFERENCE_ONLY") invalidLibrary("VISUAL_AUTHORITY_UNSUPPORTED");
}
/** Explicit administrator root only; every path component is checked. No directory discovery. */
async function safeBytes(root: string, relative: string, maximum: number) {
  if (!/^[a-zA-Z0-9_./-]+$/.test(relative) || relative.split("/").some(p => !p || p === "." || p === "..")) invalidLibrary();
  let current = root;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    const info = await lstat(current).catch(() => invalidLibrary("VISUAL_ASSET_MISSING"));
    if (info.isSymbolicLink()) invalidLibrary();
  }
  const info = await lstat(current);
  if (!info.isFile() || info.nlink !== 1 || info.size < 1 || info.size > maximum ||
    !((await realpath(current)).startsWith(root + path.sep))) invalidLibrary();
  const bytes = await readFile(current);
  if (bytes.length !== info.size) invalidLibrary();
  return bytes;
}
export function parseAssetIndex(value: unknown): readonly LibraryAsset[] {
  if (!Array.isArray(value) || value.length !== MASTER_VISUAL_LIBRARY_V1.assetCount) invalidLibrary();
  const seen = new Set<string>();
  return deepAudioFreeze(value.map(v => {
    const a = object(v);
    if (typeof a.file !== "string" || typeof a.pack !== "string" || typeof a.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(a.sha256) || a.extension !== ".png" || a.patientFacing !== false || a.medicalReviewStatus !== "PENDING") invalidLibrary();
    const parts = a.file.split("/");
    if (parts.length !== 5 || parts[0] !== "packs" || parts[1] !== a.pack || !parts[4].endsWith(".png") ||
      parts.some(p => !/^[a-z0-9-]+(?:\.png)?$/.test(p)) || a.fileWithinPack !== parts.slice(2).join("/") || seen.has(a.file)) invalidLibrary();
    seen.add(a.file);
    return { id: `master-visual:v1:${a.file}`, file: a.file, pack: a.pack, organ: parts[2], category: parts[3],
      concept: parts[4].slice(0, -4), sha256: a.sha256, authority: "REFERENCE_ONLY" as const,
      medicalReviewStatus: "PENDING" as const, patientFacing: false as const };
  }));
}
export async function loadVisualLibrary(root: string): Promise<VisualLibrary> {
  if (!path.isAbsolute(root) || (await lstat(root)).isSymbolicLink()) invalidLibrary();
  root = await realpath(root);
  const data: Record<string, unknown> = {};
  for (const [file, hash] of Object.entries(MASTER_VISUAL_LIBRARY_V1.metadata)) {
    const bytes = await safeBytes(root, file, 2 * 1024 * 1024);
    if (audioHash(bytes) !== hash) invalidLibrary("VISUAL_METADATA_HASH_MISMATCH");
    data[file] = JSON.parse(bytes.toString("utf8"));
  }
  const manifest = object(data["master-manifest.json"]);
  validateLibraryPolicy(manifest.policy);
  if (manifest.version !== "v1" || manifest.packCount !== 18 || manifest.assetCount !== 473 ||
    !Array.isArray(manifest.packs) || manifest.packs.length !== 18) invalidLibrary();
  const packs = data["metadata/pack-registry.json"];
  if (!Array.isArray(packs) || packs.length !== 18) invalidLibrary();
  const assets = parseAssetIndex(data["metadata/asset-index.json"]);
  const packKeys = new Set<string>();
  for (const entry of packs) {
    const p = object(entry);
    if (typeof p.packKey !== "string" || packKeys.has(p.packKey) || p.patientFacing !== false || p.medicalReviewStatus !== "PENDING" ||
      p.version !== "v1" || p.relativeRoot !== `packs/${p.packKey}` ||
      p.discoveredAssetCount !== assets.filter(a => a.pack === p.packKey).length ||
      !manifest.packs.some(v => audioIdentity(v) === audioIdentity(p))) invalidLibrary();
    packKeys.add(p.packKey);
  }
  if (assets.some(a => !packKeys.has(a.pack)) || assets.filter(a => a.pack === "heart").length !== 64) invalidLibrary();
  // Initial intake verifies the entire pinned library, not just selected Heart assets.
  for (const a of assets) if (audioHash(await safeBytes(root, a.file, 32 * 1024 * 1024)) !== a.sha256) invalidLibrary("VISUAL_ASSET_HASH_MISMATCH");
  const result = deepAudioFreeze({ version: "v1" as const, fingerprint: audioIdentity(MASTER_VISUAL_LIBRARY_V1), assets });
  roots.set(result, root); return result;
}
export const isVisualLibrary = (v: unknown): v is VisualLibrary => !!v && typeof v === "object" && roots.has(v);
export function verifyLibraryAssetBytes(bytes: Buffer, sha256: string) {
  if (!/^[a-f0-9]{64}$/.test(sha256) || audioHash(bytes) !== sha256) invalidLibrary("VISUAL_ASSET_HASH_MISMATCH");
  // Legacy reference containers may be mislabeled .png. Identity is byte-based.
  // Decoder is still-only; GIF native timing is never exposed as heart motion.
  const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const gif = ["GIF87a","GIF89a"].includes(bytes.subarray(0,6).toString("ascii"));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!png && !gif && !jpeg) invalidLibrary("VISUAL_FORMAT_UNSUPPORTED");
  return png?"png":gif?"gif":"jpeg";
}
export async function libraryAssetBytes(library: VisualLibrary, id: string) {
  const root = roots.get(library); if (!root) invalidLibrary("VISUAL_LIBRARY_AUTHORITY_INVALID");
  const a = library.assets.find(a => a.id === id); if (!a) invalidLibrary("VISUAL_ASSET_MISSING");
  const bytes = await safeBytes(root, a.file, 32 * 1024 * 1024);
  verifyLibraryAssetBytes(bytes,a.sha256);
  return bytes;
}

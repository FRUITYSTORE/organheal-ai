import "server-only";
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { getHeartMasterVisual } from "./heart-master-visual";
import { getHeartbeatMotionMaster } from "./heartbeat-motion-master";
import { createSourceProfileRegistry, readSourceProfile, sourceProfileSnapshot } from "./source-profiles";
import type { SourceProfileSelection, AnatomySourceProfile } from "./contracts/source-profile";
import { CinematicRuntimeError, resolveRuntimeOutputProfile } from "./composition/runtime-output";

const outputId = "CINEMATIC_PORTRAIT_1080X1920_24_V1";
const hero = getHeartMasterVisual("HEART_MASTER_VISUAL_V1"), motion = getHeartbeatMotionMaster("HEARTBEAT_MOTION_MASTER_V1");
function freeze<T>(v: T): T { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
/** Source-local adapters, NOT canonical chamber modules or clinical anatomy authority.
 * Source IDs explicitly distinguish selected local bytes from unresolved public provenance. */
export const CINEMATIC_MASTER_MODULES = freeze({
  HEART_MASTER_VISUAL_V1: { masterId: "HEART_MASTER_VISUAL_V1", version: "1", assetVersion: "heart-hero-master-runtime-v1",
    anatomyVersion: "heart-hero-local-composite-v1", sourceId: "heart-hero-selected-local", sourceVersion: hero.configuration.source.sha256,
    sourceSha256: hero.configuration.source.sha256, sourceFilename: "Heart.fbx", assetRole: "HEART_HERO_V1",
    representation: "composite", structureId: "heart.visual.heroSourceComposite", objectNames: [hero.configuration.source.object],
    cameraId: "CAM_HEART_MASTER_VISUAL_V1", configurationRef: "render/blender/heart_hero_master.json", lock: hero.lock,
    motionPreset: "static", sourceAction: null, sourceCycle: null, usage: "internal-review", patientFacing: false,
    anatomicallyValidated: false, clinicalApproval: "unreviewed", licenseClearance: "unresolved", publicProvenance: "unresolved" },
  HEARTBEAT_MOTION_MASTER_V1: { masterId: "HEARTBEAT_MOTION_MASTER_V1", version: "1", assetVersion: "heart-native-motion-master-runtime-v1",
    anatomyVersion: "heart-native-cutaway-composite-v1", sourceId: "heart-motion-selected-local", sourceVersion: motion.preset.sourceSha256,
    sourceSha256: motion.preset.sourceSha256, sourceFilename: "Beating heart.glb", assetRole: "HEART_MOTION_V1",
    representation: "composite", structureId: "heart.visual.nativeCutawaySourceComposite", objectNames: ["heart.2"],
    cameraId: "CAM_HEARTBEAT_MOTION_MASTER_V1", configurationRef: "render/blender/heartbeat_motion_master.json", lock: motion.lock,
    motionPreset: motion.preset.motionPreset, sourceAction: motion.preset.sourceAction, sourceCycle: motion.preset.sourceCycle,
    usage: "internal-review", patientFacing: false, anatomicallyValidated: false, clinicalApproval: "unreviewed",
    licenseClearance: "unresolved", publicProvenance: "unresolved" },
} as const);
export type CinematicMasterId = keyof typeof CINEMATIC_MASTER_MODULES;
export function resolveCinematicMaster(id: unknown, version: unknown) {
  if (typeof id !== "string" || !Object.hasOwn(CINEMATIC_MASTER_MODULES, id) || version !== "1") throw new CinematicRuntimeError("MASTER_UNAVAILABLE");
  return CINEMATIC_MASTER_MODULES[id as CinematicMasterId];
}
const definitions: AnatomySourceProfile[] = Object.values(CINEMATIC_MASTER_MODULES).map(m => ({
  profileId: m.masterId === "HEART_MASTER_VISUAL_V1" ? "heart-hero-local-visual-review" : "heart-native-cutaway-visual-review",
  profileVersion: "1", organId: "heart", sourceId: m.sourceId, sourceVersion: m.sourceVersion,
  anatomyVersion: m.anatomyVersion, assetVersion: m.assetVersion,
  structures: [{ structureId: m.structureId, representation: "composite" }], cameraTargets: [{ id: m.cameraId,
    landmarks: ["heart.visual.sourceBoundsCenter"], evidenceRefs: [m.configurationRef] }], labels: [], usage: ["internal-review"],
  limitations: ["Source-local visual composite only; no canonical anatomy addressability.", "License/public provenance unresolved; clinical approval unreviewed; patientFacing=false."],
  evidenceRefs: [m.configurationRef, m.lock.builderRef],
}));
/** Uses existing opaque authority issuance; not added to clinical SOURCE_PROFILES. */
export const CINEMATIC_MASTER_SOURCE_PROFILES = createSourceProfileRegistry(definitions);
export type ReadyCinematicMaster = Readonly<{ module: ReturnType<typeof resolveCinematicMaster>;
  profile: ReturnType<typeof sourceProfileSnapshot>; runtimeOutputProfileId: typeof outputId;
  usage: "internal-review"; patientFacing: false; sourcePath: string; texturesPath?: string }>;
const ready = new WeakSet<object>();
async function checkedFile(filename: string, sha: string, normalized = false) {
  try {
    if (!path.isAbsolute(filename)) throw Error();
    const info = await lstat(filename);
    if (!info.isFile() || info.isSymbolicLink() || info.size < 1 || info.size > 128 * 1024 * 1024) throw Error();
    const bytes = await readFile(filename);
    const digest = createHash("sha256").update(normalized ? bytes.toString("utf8").replace(/\r\n/g, "\n") : bytes).digest("hex");
    if (digest !== sha) throw Error();
  } catch { throw new CinematicRuntimeError("MASTER_SOURCE_INVALID"); }
}
/** Trusted server setup only. Capability proves readiness at issuance; executor must
 * recheck files immediately before spawn through the locked builders in R2.4B/C. */
type MasterRequest = { masterId: string; version: string; sourceSha256: string;
  selection: SourceProfileSelection; runtimeOutputProfileId: string; mode: string; usage: string;
  patientFacing: boolean; sourcePath: string; texturesPath?: string; repositoryRoot: string };
export async function authorizeCinematicMaster(value: unknown): Promise<ReadyCinematicMaster> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CinematicRuntimeError("MASTER_AUTHORITY_INVALID");
  const input = value as MasterRequest;
  const allowed = ["masterId", "version", "sourceSha256", "selection", "runtimeOutputProfileId", "mode", "usage", "patientFacing", "sourcePath", "texturesPath", "repositoryRoot"];
  if (Object.keys(input).some(k => !allowed.includes(k)) || input.mode !== "development" || input.usage !== "internal-review" || input.patientFacing !== false)
    throw new CinematicRuntimeError("MASTER_AUTHORITY_INVALID");
  const m = resolveCinematicMaster(input.masterId, input.version);
  if (input.sourceSha256 !== m.sourceSha256) throw new CinematicRuntimeError("MASTER_SOURCE_INVALID");
  if (resolveRuntimeOutputProfile(input.runtimeOutputProfileId).id !== outputId) throw new CinematicRuntimeError("OUTPUT_PROFILE_INVALID");
  let p: ReturnType<typeof sourceProfileSnapshot>;
  try {
    const definition = readSourceProfile(input.selection);
    p = sourceProfileSnapshot(input.selection);
    const expected = CINEMATIC_MASTER_SOURCE_PROFILES.resolve({ profileId: p.profileId, profileVersion: p.profileVersion });
    if (expected !== input.selection || p.assetVersion !== m.assetVersion || p.sourceId !== m.sourceId || p.sourceVersion !== m.sourceVersion ||
      definition.structures.length !== 1 || definition.structures[0].structureId !== m.structureId || definition.cameraTargets[0].id !== m.cameraId)
      throw Error();
  } catch { throw new CinematicRuntimeError("MASTER_AUTHORITY_INVALID"); }
  if (typeof input.sourcePath !== "string" || typeof input.repositoryRoot !== "string" || !path.isAbsolute(input.repositoryRoot) ||
    path.basename(input.sourcePath) !== m.sourceFilename) throw new CinematicRuntimeError("MASTER_SOURCE_INVALID");
  await checkedFile(input.sourcePath, m.sourceSha256);
  await checkedFile(path.resolve(input.repositoryRoot, m.lock.builderRef), m.lock.builderSha256, true);
  if (m.masterId === "HEART_MASTER_VISUAL_V1") {
    if (!input.texturesPath) throw new CinematicRuntimeError("MASTER_NOT_READY");
    for (const [name, hash] of Object.entries(hero.configuration.source.textures)) await checkedFile(path.resolve(input.texturesPath, name), hash);
  }
  const capability: ReadyCinematicMaster = freeze({ module: m, profile: p, runtimeOutputProfileId: outputId as typeof outputId, usage: "internal-review" as const,
    patientFacing: false as const, sourcePath: input.sourcePath, ...(input.texturesPath ? { texturesPath: input.texturesPath } : {}) });
  ready.add(capability); return capability;
}
export function isReadyCinematicMaster(value: unknown): value is ReadyCinematicMaster {
  return !!value && typeof value === "object" && ready.has(value);
}

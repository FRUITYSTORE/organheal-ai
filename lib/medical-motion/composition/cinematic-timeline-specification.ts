import "server-only";
import { createHash } from "node:crypto";
import { compileCinematicRecipe } from "../cinematic-guidance";
import { canonicalSceneJson } from "../scene-compiler";
import { isReadyCinematicMaster, type ReadyCinematicMaster } from "../cinematic-master-runtime";
import { CinematicRuntimeError, resolveRuntimeOutputProfile, runtimeFrameCount, CINEMATIC_RESOURCE_LIMITS } from "./runtime-output";

const issued = new WeakSet<object>();
/** Additive cinematic-1 contract. Timeline V2 stays 720p/25fps; no V2 replay reinterpretation.
 * No paths or clinical prose enter this deterministic specification. Source bytes are
 * authorized separately. R2.4B/C must retain worker ownership and revalidate readiness. */
export function authorizeCinematicTimeline(recipe: unknown, masters: readonly ReadyCinematicMaster[]) {
  const plan = compileCinematicRecipe(recipe);
  const profile = resolveRuntimeOutputProfile("CINEMATIC_PORTRAIT_1080X1920_24_V1");
  if (plan.recipe.outputProfile !== "MOBILE_VERTICAL_9_16" || plan.recipe.fps !== profile.fps ||
    plan.recipe.music !== "disabled" || masters.length !== plan.scenes.length || plan.scenes.some(s => s.narrationRef || s.subtitleRef))
    throw new CinematicRuntimeError("CINEMATIC_TIMELINE_INVALID");
  let next = 0;
  const scenes = plan.scenes.map((s, i) => {
    const master = masters[i];
    if (!isReadyCinematicMaster(master) || master.module.masterId !== s.masterId || master.module.sourceSha256 !== s.sourceSha256 ||
      master.runtimeOutputProfileId !== profile.id || master.profile.profileId !== s.sourceProfile.profileId ||
      master.profile.profileVersion !== s.sourceProfile.profileVersion || master.patientFacing !== false)
      throw new CinematicRuntimeError("MASTER_AUTHORITY_INVALID");
    const frames = runtimeFrameCount(profile.id, s.definition.durationSeconds);
    const startFrame = next; next += frames;
    return { sceneIndex: i, phase: s.phase, masterId: s.masterId, masterVersion: master.module.version,
      assetVersion: master.module.assetVersion, anatomyVersion: master.module.anatomyVersion, sourceSha256: s.sourceSha256,
      sourceProfile: master.profile, configurationRef: master.module.configurationRef, masterLock: master.module.lock,
      startFrame, endFrameExclusive: next, frameCount: frames, duration: s.definition.durationSeconds,
      cameraPresetRef: master.module.cameraId, cameraGuidance: s.cameraGuidance,
      appearanceProfileRef: "HEART_APPEARANCE_PROFILE_V1", focusDisposition: s.definition.focus === "whole-cutaway" ? "NEUTRAL_WHOLE_CUTAWAY_FOCUS" : "NEUTRAL_WHOLE_ORGAN",
      motionPreset: master.module.motionPreset, nativeAction: master.module.sourceAction, nativeCycle: master.module.sourceCycle,
      geometryOperations: [] as readonly string[], clinicalApproval: "unreviewed", licenseClearance: "unresolved", patientFacing: false };
  });
  const content = { runtimeVersion: "cinematic-1", timelineVersion: "cinematic-1", compositionVersion: "cinematic-1",
    runtimeOutputProfileId: profile.id, outputProfile: profile, recipeId: plan.recipe.id, recipeVersion: plan.recipe.version,
    planFingerprint: plan.fingerprint, visualEngineVersion: plan.recipe.visualEngineVersion, language: plan.recipe.language,
    duration: plan.totalDuration, frameCount: runtimeFrameCount(profile.id, plan.totalDuration), scenes,
    transitions: plan.recipe.transitions, resourceLimits: CINEMATIC_RESOURCE_LIMITS, usage: "internal-review", patientFacing: false,
    safetyDisposition: "native-motion-no-pathology-no-morph-no-retarget", executionStage: "authorized-specification-only" };
  const freeze = (v: unknown): void => { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } };
  const capability = { ...content, fingerprint: createHash("sha256").update(canonicalSceneJson(content)).digest("hex") };
  freeze(capability); issued.add(capability); return capability;
}
export type CinematicTimeline = ReturnType<typeof authorizeCinematicTimeline>;
export const isAuthorizedCinematicTimeline = (value: unknown): value is CinematicTimeline => !!value && typeof value === "object" && issued.has(value);

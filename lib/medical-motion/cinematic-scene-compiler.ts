import "server-only";
import { createHash } from "node:crypto";
import { canonicalSceneJson } from "./scene-compiler";
import { isReadyCinematicMaster, type ReadyCinematicMaster } from "./cinematic-master-runtime";
import { isAuthorizedCinematicTimeline, type CinematicTimeline } from "./composition/cinematic-timeline-specification";
import { CinematicRuntimeError } from "./composition/runtime-output";
import { compileCinematicCamera } from "./render/cinematic-camera";
import executorLock from "../../render/blender/cinematic_master_executor_v1.lock.json";

const issued = new WeakSet<object>();
/** Non-clinical compiler adapter. Never manufactures CompiledMedicalScene clinical
 * authority, mechanism evidence, canonical anatomy mappings or patient authorization. */
export function compileCinematicExecution(timeline: CinematicTimeline, masters: readonly ReadyCinematicMaster[]) {
  if (!isAuthorizedCinematicTimeline(timeline) || masters.length !== timeline.scenes.length)
    throw new CinematicRuntimeError("MASTER_AUTHORITY_INVALID");
  const scenes = timeline.scenes.map((s,i) => {
    const m=masters[i];
    if (!isReadyCinematicMaster(m) || m.module.masterId !== s.masterId || m.module.sourceSha256 !== s.sourceSha256 ||
      m.profile.fingerprint !== s.sourceProfile.fingerprint || m.runtimeOutputProfileId !== timeline.runtimeOutputProfileId ||
      s.patientFacing !== false || s.geometryOperations.length || !["static","NORMAL_HEARTBEAT_V1"].includes(s.motionPreset))
      throw new CinematicRuntimeError("MASTER_AUTHORITY_INVALID");
    return Object.freeze({ sceneIndex:i,master:m,sourceCount:1 as const,scene:s,camera:compileCinematicCamera(s.cameraGuidance) });
  });
  const lock=Object.freeze({...executorLock});
  const identity={timelineFingerprint:timeline.fingerprint,compilerVersion:"cinematic-reference-1",executorLock:lock,cameras:scenes.map(s=>s.camera)};
  const result=Object.freeze({timeline,scenes:Object.freeze(scenes),compilerVersion:"cinematic-reference-1",executorLock:lock,
    fingerprint:createHash("sha256").update(canonicalSceneJson(identity)).digest("hex"),usage:"internal-review",patientFacing:false});
  issued.add(result);return result;
}
export type CompiledCinematicExecution = ReturnType<typeof compileCinematicExecution>;
export const isCompiledCinematicExecution=(v:unknown):v is CompiledCinematicExecution=>!!v && typeof v==="object" && issued.has(v);

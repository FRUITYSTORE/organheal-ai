import "server-only";
import { CinematicRuntimeError } from "../composition/runtime-output";
import type { CinematicCamera } from "../contracts/cinematic";

export const CINEMATIC_CAMERA_V1 = Object.freeze({ version: "1", minimumFovDegrees: 12, maximumFovDegrees: 60,
  minimumDistanceInExtents: 1.2, maximumDistanceInExtents: 10, maximumApproachRatio: 1.15,
  maximumTranslationExtentsPerSecond: .4, maximumRotationDegreesPerSecond: 0, rollDegrees: 0,
  safeOrganRectangle: Object.freeze([.04,.16,.96,.96]), safeSubtitleRectangle: Object.freeze([.08,.04,.92,.14]),
  safeLabelRectangle: Object.freeze([.04,.16,.96,.76]), easing: "smoothstep", shake: false,
  rotation: "locked-source-camera", penetration: "prohibited", target: "source-bounds-center-only" });
const presets = { "full-organ": "FULL_ORGAN_ESTABLISH", "medium-anatomical": "MEDIUM_ORGAN_ORIENT",
  "guided-push-in": "GUIDED_APPROACH", "focused-close-up": "FOCUSED_CLOSEUP", "controlled-pull-back": "CONTROLLED_REORIENT" } as const;
export function compileCinematicCamera(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new CinematicRuntimeError("CINEMATIC_TIMELINE_INVALID");
  const camera = value as CinematicCamera;
  if (!camera || Object.keys(camera).sort().join() !== ["preset","duration","targetCoverage","contextMargin","zoomRatio","proximityInOrganExtents","easing","movement","clipping"].sort().join() ||
    !Object.hasOwn(presets,camera.preset) || !Number.isFinite(camera.zoomRatio) || camera.zoomRatio < 1 || camera.zoomRatio > 1.15 ||
    !Number.isFinite(camera.duration) || camera.duration < 0 || camera.duration > 4 ||
    !Number.isFinite(camera.targetCoverage) || camera.targetCoverage < .2 || camera.targetCoverage > .65 ||
    !Number.isFinite(camera.contextMargin) || camera.contextMargin < .12 || camera.contextMargin > .4 ||
    !Number.isFinite(camera.proximityInOrganExtents) || camera.proximityInOrganExtents < 1.2 || camera.proximityInOrganExtents > 10 ||
    camera.easing !== "smoothstep" || camera.clipping !== "prohibited" || !["hold","approach","pull-back"].includes(camera.movement) ||
    camera.movement === "hold" && (camera.duration !== 0 || camera.zoomRatio !== 1) || camera.movement !== "hold" && camera.duration < 1)
    throw new CinematicRuntimeError("CINEMATIC_TIMELINE_INVALID");
  return Object.freeze({ ...CINEMATIC_CAMERA_V1, preset: presets[camera.preset], movement: camera.movement,
    movementDuration: camera.duration, requestedMaximumRatio: camera.zoomRatio, sourceBoundsTarget: true });
}

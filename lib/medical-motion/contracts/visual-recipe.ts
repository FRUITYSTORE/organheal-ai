import type { AnatomyStructureId } from "./anatomy";
import type { OverlayKind } from "./medical-scene";
import type { SceneOutputProfile } from "./medical-scene";
import type { TimelineTransition } from "../composition/timeline-specification";

/** Planning configuration only: never a compiled scene, source capability or approval. */
export type HeartVisualRole = "HEART_HERO_V1" | "HEART_MOTION_V1";
export type VisualOutputProfileId = "MOBILE_VERTICAL_9_16" | "DESKTOP_16_9";
export type VisualOutputProfile = SceneOutputProfile & {
  width: number; height: number;
  /** Normalized [left, top, right, bottom], reserved for text, not anatomy. */
  safeTextRegion: readonly [number, number, number, number];
};
export type VisualAssetReference = Readonly<{
  role: HeartVisualRole;
  /** Exact future/runtime identity supplied explicitly; a role is not an assetVersion. */
  assetVersion: string;
  sourceReferences: readonly string[];
  evidenceReferences: readonly string[];
}>;
type Window = { start: number; end: number };
export type VisualCue = Window & (
  { kind: "hero-reveal"; role: "HEART_HERO_V1" } |
  { kind: "heartbeat"; role: "HEART_MOTION_V1"; motionPreset: "NORMAL_HEARTBEAT_V1" } |
  { kind: "camera-movement"; role: HeartVisualRole; from: string; to: string } |
  { kind: "structure-focus"; role: HeartVisualRole; structures: readonly AnatomyStructureId[];
    addressability: "requires-source-supported-review" } |
  { kind: "narration-slot"; slot: Extract<OverlayKind, "voice-segment"> } |
  { kind: "subtitle-slot"; slot: Extract<OverlayKind, "subtitle"> } |
  { kind: "background-music" } |
  { kind: "outro" }
);
export type HeartVisualRecipe = Readonly<{
  visualEngineVersion: "1"; sceneRecipeVersion: "1"; organ: "heart";
  usage: "internal-review"; visualPreset: "ORGANHEAL_HEART_V1";
  language: "ar" | "en"; outputProfile: VisualOutputProfileId; duration: number;
  exportIntent: "patient-education-preview" | "clinical-doctor-preview";
  music: "disabled" | "optional-ducked";
  assets: readonly VisualAssetReference[];
  cues: readonly VisualCue[];
  /** Existing Timeline V2 boundary semantics; no geometry crossfade or morph. */
  transitions: readonly TimelineTransition[];
}>;

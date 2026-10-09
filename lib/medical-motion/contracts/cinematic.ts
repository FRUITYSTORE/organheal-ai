import type { OrganId } from "./organ";
import type { AnatomyStructureId } from "./anatomy";
import type { AnatomySourceProfileIdentity } from "./source-profile";
import type { OverlayKind } from "./medical-scene";
import type { TimelineTransition } from "../composition/timeline-specification";
import type { SceneSequenceDefinition } from "../orchestration/sequence";
import type { SceneDefinition } from "./scene";
import type { VisualOutputProfileId } from "./visual-recipe";

export type CinematicPhase = "ESTABLISH" | "ORIENT" | "APPROACH" | "FOCUS" | "EXPLAIN" | "REORIENT";
export type PresentationMode = "PATIENT_EDUCATION" | "CLINICAL_REVIEW";
export type AppearanceMeaning = "anatomical" | "educational" | "functional";
export type CinematicCamera = {
  preset: "full-organ" | "medium-anatomical" | "guided-push-in" | "focused-close-up" | "controlled-pull-back";
  duration: number; targetCoverage: number; contextMargin: number; zoomRatio: number;
  proximityInOrganExtents: number; easing: "smoothstep"; movement: "hold" | "approach" | "pull-back";
  clipping: "prohibited";
};
/** Organ-generic framework, no claim that an organ or source has renderable anatomy. */
export type AnatomicalAppearanceProfile = {
  id: string; version: string; organ: OrganId; masterVisualId: string;
  base: { kind: "ANATOMICAL_BASE_APPEARANCE"; meaning: "anatomical"; sourceMaterials: "authoritative";
    tissueDirection: string; exactMedicalRgb: null; preserveTextureMeaning: true };
  highlight: { kind: "EDUCATIONAL_HIGHLIGHT"; meaning: "educational"; temporary: true;
    indicatesPathology: false; effects: readonly ("outline" | "spotlight" | "label-relationship")[] };
  clinicalDetail: "source-supported-only";
};
export type CinematicScene = {
  phase: CinematicPhase; masterId: "HEART_MASTER_VISUAL_V1" | "HEARTBEAT_MOTION_MASTER_V1";
  sourceProfile: AnatomySourceProfileIdentity;
  camera: CinematicCamera; targets: readonly AnatomyStructureId[];
  focus: "whole-organ" | "whole-cutaway" | "structure";
  appearanceProfile: "HEART_APPEARANCE_PROFILE_V1";
  highlight: { meaning: "educational"; enabled: boolean; indicatesPathology: false };
  slots: { narration: "voice-segment"; subtitle: "subtitle"; label: "educational-label" };
  duration: number; timing: "fixed" | "narration-duration"; narrationDuration: number | null;
  narrationRef: string | null; subtitleRef: string | null;
};
export type CinematicRecipe = {
  id: string; version: "1"; visualEngineVersion: "1"; cinematicGuidanceVersion: "1";
  organ: OrganId; usage: "internal-review"; patientFacing: false;
  mode: PresentationMode; language: "en" | "ar"; outputProfile: VisualOutputProfileId; fps: 24;
  music: "disabled" | "optional-ducked";
  scenes: readonly CinematicScene[];
  transitions: readonly (TimelineTransition & { sourceBoundary: "same-source" | "explicit-source-change" })[];
};
export type CinematicPlan = {
  recipe: CinematicRecipe; fingerprint: string; totalDuration: number;
  sequence: SceneSequenceDefinition;
  scenes: readonly { definition: SceneDefinition; phase: CinematicPhase; masterId: string; motionMasterId: string | null;
    assetVersion: string; assetVersionDisposition: "visual-role-only-not-runtime-registered";
    sourceSha256: string; sourceProfile: AnatomySourceProfileIdentity; sourceProfileDisposition: "unregistered-no-authority";
    visualRole: string; appearanceProfileVersion: "1"; cameraGuidance: CinematicCamera;
    overlaySlots: readonly OverlayKind[]; highlightMeaning: "educational"; narrationRef: string | null; subtitleRef: string | null;
    evidenceRefs: readonly string[]; sourceRefs: readonly string[]; safetyDisposition: "internal-review-no-clinical-authority";
    patientFacing: false }[];
  execution: "blocked-until-exact-modules-and-trusted-profiles-exist";
};

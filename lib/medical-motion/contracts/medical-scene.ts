import type { AnatomyStructureId } from "./anatomy";
import type { StructureRepresentation, AnatomyRequirements } from "./organ-module";
import type { AspectRatio, RenderResolution } from "./scene";
import type { VisualizationOperation } from "./mechanism";

export type OverlayKind = "text-value" | "chart" | "subtitle" | "caption" | "voice-segment" | "risk-band" | "educational-label";
export type OverlaySlot = { id: OverlayKind; kind: OverlayKind };
export type SceneOutputProfile = { aspectRatio: AspectRatio; resolution: RenderResolution; lod: "asset-native" };
export type ReuseDecision = { classification: "reusable-base" | "patient-specific-render-required" | "unsupported"; reasons: readonly string[] };
/** Renderer-neutral base. No clinical facts, patient identifiers, prose or object names. */
export type MedicalSceneDsl = {
  sourceProfile?: import("./source-profile").SourceProfileCacheIdentity;
  profileAnatomyIdentity?: import("./anatomy-foundation").AnatomyRenderIdentity;
  profileCameraTargets?: readonly string[];
  sceneDslVersion: "1"; compilerContractVersion: "1"; renderIdentityVersion: "1";
  mechanismId: string; mechanismVersion: string;
  bodySystemIds: readonly string[]; organIds: readonly string[];
  anatomy: readonly { organId: string; anatomyVersion: string; assetVersion: string; sources: readonly { sourceId: string; sourceVersion: string }[] }[];
  requiredStructures: AnatomyRequirements;
  representations: readonly { structureId: AnatomyStructureId; representation: StructureRepresentation }[];
  highlightedStructures: readonly AnatomyStructureId[];
  cameraIntent: { kind: "organ-overview" | "structure-focus"; structures: readonly AnatomyStructureId[] };
  motionIntent: "static" | "illustrative-cycle";
  flowIntent: "none";
  visualEffects: readonly { operation: VisualizationOperation; version: "1"; structures: readonly AnatomyStructureId[] }[];
  labels: readonly AnatomyStructureId[];
  visualState: "neutral" | "subtle";
  durationHint: number;
  renderIntent: "still" | "short-clip" | "loop" | "educational-segment";
  patientIndependentBase: true;
  usage: "internal-review" | "patient-facing";
  overlaySlots: readonly OverlaySlot[];
  outputProfile: SceneOutputProfile;
};
export type CompiledMedicalScene = {
  scene: MedicalSceneDsl;
  baseFingerprint: string;
  outputFingerprint: string;
  reuse: ReuseDecision;
};

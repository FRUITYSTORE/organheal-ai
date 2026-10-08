import type { AnatomyStructureId } from "./anatomy";
import type { OrganId } from "./organ";
import type { LandmarkId, StructureRepresentation } from "./organ-module";

export type AnatomySourceProfileIdentity = { profileId: string; profileVersion: string };
export type SourceProfileCacheIdentity = AnatomySourceProfileIdentity & { fingerprint: string };
export type SourceProfileSnapshot = SourceProfileCacheIdentity & {
  organId: OrganId; sourceId: string; sourceVersion: string;
  anatomyVersion: string; assetVersion: string;
  usage: readonly ("internal-review" | "patient-facing")[];
};
export type SourceProfileBindings = { bindingVersion: "1"; scenes: readonly { sceneIndex: number; profile: SourceProfileSnapshot }[] };
export type TrustedSceneProfile = { sceneIndex: number; selection: SourceProfileSelection };
/** Constraints on existing inventory, never anatomy or approval of their own. */
export type AnatomySourceProfile = AnatomySourceProfileIdentity & {
  organId: OrganId;
  sourceId: string; sourceVersion: string;
  anatomyVersion: string; assetVersion: string;
  structures: readonly { structureId: AnatomyStructureId; representation: StructureRepresentation }[];
  cameraTargets: readonly { id: string; landmarks: readonly LandmarkId[]; evidenceRefs: readonly string[] }[];
  labels: readonly AnatomyStructureId[];
  usage: readonly ("internal-review" | "patient-facing")[];
  limitations: readonly string[]; evidenceRefs: readonly string[];
};
/** Only the server registry can issue a usable selection; JSON is not authority. */
export type SourceProfileSelection = Readonly<{ readonly __sourceProfileSelection: unique symbol }>;

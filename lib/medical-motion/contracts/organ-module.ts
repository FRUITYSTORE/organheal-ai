import type { AnatomyStructureId } from "@/lib/medical-motion/contracts/anatomy";
import type { OrganId } from "@/lib/medical-motion/contracts/organ";
import type { AnatomyAssessment, AnatomyProvenance } from "./anatomy-foundation";

// The shared shape every organ (heart, then lungs/liver/kidneys) must
// conform to, so the engine, render worker and composer never need
// organ-specific branching. Adding an organ means adding one of these,
// not modifying the engine.
//
// A module distinguishes what its REAL asset contains from known missing
// structures. Missing inventory entries never promise renderable anatomy.
// An earlier version of this contract listed structures the asset never
// built (aortic/pulmonary valves, pulmonary veins), which meant a render
// could "succeed" while silently dropping what it was asked to show.

export type AnatomyStructureKind =
  | "chamber"
  | "myocardium"
  | "septum"
  | "valve"
  | "greatVessel"
  | "coronaryArtery" | "organ" | "bone" | "muscle" | "nerve" | "gland" | "airway" | "skin" | "region" | "composite";

/** Where a structure's geometry came from. "placeholder" is a primitive or
 * hand-shaped stand-in (a torus for a valve, a constant-radius tube for a
 * great vessel) and must never be shown as production anatomy. */
export type StructureFidelity = "reference-derived" | "placeholder";

export type StructureAvailability = "missing" | "present" | "partial";
export type StructureVerification = "unverified" | "anatomy-conditional" | "verified" | "rejected";
export const STRUCTURE_REPRESENTATIONS = ["tissue", "wall", "cavity", "lumen", "vessel", "surface", "bone", "organ-volume", "region", "composite", "centerline", "placeholder", "unknown"] as const;
export type StructureRepresentation = (typeof STRUCTURE_REPRESENTATIONS)[number];

/** Regions are explicit anatomical labels, not inferred from object names.
 * Evidence references document anatomical review, not merely provenance. */
export type AnatomicalCoverage = {
  verifiedRegions: readonly string[];
  unknownRegions: readonly string[];
  excludedRegions: readonly string[];
  evidenceRefs: readonly string[];
};

export type AnatomyRegistryEntry = {
  id: AnatomyStructureId;
  kind: AnatomyStructureKind;
  representation: StructureRepresentation;
  verification: StructureVerification;
  coverage: AnatomicalCoverage;
  provenance?: AnatomyProvenance;
  assessment?: AnatomyAssessment;
} & (
  // Object names remain renderer-only. Missing inventory promises no geometry.
  | { availability: "missing"; blenderObject: null; fidelity: null }
  | { availability: "present" | "partial"; blenderObject: string; fidelity: StructureFidelity }
);

/** Requested use, checked independently of whether geometry is available.
 * Production always requires verification and complete recorded coverage;
 * development can request verification, completeness or specific regions too. */
export type AnatomyRequirement = {
  representations?: readonly StructureRepresentation[];
  requireVerified?: boolean;
  completeCoverage?: boolean;
  requiredRegions?: readonly string[];
  requireClinicalApproval?: boolean;
};

/** Keys are required dependencies, independently of visual highlighting. */
export type AnatomyRequirements = Partial<Record<AnatomyStructureId, AnatomyRequirement>>;

export type LandmarkId = `${OrganId}.${string}`;

/** A named anatomical point measured on the organ's real asset, for
 * cameras and animation to target instead of raw coordinates. */
export type Landmark = {
  id: LandmarkId;
  /** What the point is and how the build measures it. */
  description: string;
  /** The empty object the build places at the point. Render layer only. */
  blenderObject: string;
};

/** A direction in the organ's anatomical axes: +x toward the patient's
 * left, -y anterior (toward the viewer of a standard front view), +z
 * superior. Need not be normalized. */
export type AnatomicalDirection = readonly [number, number, number];

/** A camera shot defined by anatomy, not coordinates: the camera aims at
 * the centroid of `lookAt` from `viewDirection`, `distance` organ lengths
 * away (see OrganModule.scaleReference), so the shot follows the asset. */
export type CameraTarget = {
  /** Shot name, referenced by SceneDefinition.camera.preset. */
  id: string;
  /** Structures or groups this shot is framed on; empty = the whole organ. */
  frames: readonly AnatomyStructureId[];
  lookAt: readonly LandmarkId[];
  viewDirection: AnatomicalDirection;
  distance: number;
};

/** "clinicalIllustration": flat, clean educational look (EEVEE/NPR).
 * "cinematic": realistic lighting and tissue (Cycles). */
export type RenderStyle = "clinicalIllustration" | "cinematic";

/** "development-placeholder": acceptable for internal review renders only;
 * production renders must refuse it with REAL_ANATOMICAL_ASSET_REQUIRED.
 * Only a person, after a real anatomical review and a cleared asset licence,
 * moves an organ to "production". */
export type AssetStatus = "development-placeholder" | "production";

export type OrganModule = {
  id: OrganId;
  /** Bumped when the underlying anatomy geometry/materials change. */
  assetVersion: string;
  /** Independent semantic/provenance revision, included in new scene identity. */
  anatomyVersion?: string;
  assetStatus: AssetStatus;
  /** True only once a real anatomical reviewer has signed off. Building the
   * geometry does not, by itself, earn this flag. */
  anatomicallyValidated: boolean;
  anatomyRegistry: readonly AnatomyRegistryEntry[];
  landmarks: readonly Landmark[];
  /** Two landmarks whose distance is the organ's unit length for camera
   * distances (the heart uses base to apex). */
  scaleReference: readonly [LandmarkId, LandmarkId];
  cameraTargets: readonly CameraTarget[];
  motionControllers: readonly string[];
  cutawayStates: readonly string[];
  renderStyles: readonly RenderStyle[];
};

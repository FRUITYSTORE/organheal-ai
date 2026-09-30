import type { AnatomyStructureId } from "@/lib/medical-motion/contracts/anatomy";
import type { OrganId } from "@/lib/medical-motion/contracts/organ";

// The shared shape every organ (heart, then lungs/liver/kidneys) must
// conform to, so the engine, render worker and composer never need
// organ-specific branching. Adding an organ means adding one of these,
// not modifying the engine.
//
// A module describes what its REAL asset actually contains, nothing more.
// An earlier version of this contract listed structures the asset never
// built (aortic/pulmonary valves, pulmonary veins), which meant a render
// could "succeed" while silently dropping what it was asked to show.

export type AnatomyStructureKind =
  | "chamber"
  | "myocardium"
  | "septum"
  | "valve"
  | "greatVessel"
  | "coronaryArtery";

/** Where a structure's geometry came from. "placeholder" is a primitive or
 * hand-shaped stand-in (a torus for a valve, a constant-radius tube for a
 * great vessel) and must never be shown as production anatomy. */
export type StructureFidelity = "reference-derived" | "placeholder";

export type AnatomyRegistryEntry = {
  id: AnatomyStructureId;
  kind: AnatomyStructureKind;
  /** The object's name in the organ's Blender scene. Only the render layer
   * uses this; everything else speaks in `id`. */
  blenderObject: string;
  fidelity: StructureFidelity;
};

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

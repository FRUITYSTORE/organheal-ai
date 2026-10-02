import type { AnatomyStructureId } from "@/lib/medical-motion/contracts/anatomy";
import { developmentAnatomyMetadata } from "../../anatomy-sources";
import type { AnatomyRegistryEntry, AnatomyStructureKind, Landmark, LandmarkId, OrganModule, StructureRepresentation } from "@/lib/medical-motion/contracts/organ-module";

// Metadata records geometry availability, never medical approval. No current
// asset has reviewed anatomical coverage. Unknown regions stay explicit.
function available(
  id: AnatomyStructureId, kind: AnatomyStructureKind, blenderObject: string,
  fidelity: "reference-derived" | "placeholder", representation: StructureRepresentation
): AnatomyRegistryEntry {
  return {
    id, kind, blenderObject, fidelity, representation, availability: "present",
    verification: "unverified",
    ...developmentAnatomyMetadata(fidelity === "placeholder"),
    coverage: { verifiedRegions: [], unknownRegions: [id], excludedRegions: [], evidenceRefs: [] },
  };
}

function missing(id: AnatomyStructureId, kind: AnatomyStructureKind): AnatomyRegistryEntry {
  return {
    id, kind, blenderObject: null, fidelity: null,
    availability: "missing", representation: "unknown", verification: "unverified",
    coverage: { verifiedRegions: [], unknownRegions: [id], excludedRegions: [], evidenceRefs: [] },
  };
}

// heart_builder.landmark_object_name(): the empty for landmark X is "LM_X".
function landmark(id: LandmarkId, description: string): Landmark {
  return { id, description, blenderObject: `LM_${id}` };
}

const CHAMBER_CENTERS: readonly LandmarkId[] = ["heart.raCenter", "heart.rvCenter", "heart.laCenter", "heart.lvCenter"];
const VENTRICLE_CENTERS: readonly LandmarkId[] = ["heart.lvCenter", "heart.rvCenter"];

// Bumped whenever the heart's geometry or materials change, so a cached
// render of the old look is never reused (see render-signature.ts). v2: flat
// darker cut faces and the red/gold highlight glow.
export const HEART_ASSET_VERSION = "heart-v2-development";

// Organ module #1. Metadata only: the geometry itself is built by
// render/blender/heart_builder.py from render/blender/assets/heart/. The
// registry records either an available object or an explicit missing structure.
// Missing entries never enter the available-structure lookup or Blender mapping.
//
// The whole asset is a development placeholder: the chambers' outer surfaces
// are retopologized from a real anatomical reference, but they are solid,
// with no cavity or wall thickness, and the reference's licence question in
// medical-assets/LICENSE_MANIFEST.json is still open.
export const HEART_ORGAN_MODULE: OrganModule = {
  id: "heart",
  assetVersion: HEART_ASSET_VERSION,
  anatomyVersion: "heart-anatomy-v1-development",
  assetStatus: "development-placeholder",
  anatomicallyValidated: false,
  anatomyRegistry: [
    missing("heart.myocardium", "myocardium"),
    missing("heart.septum.interatrial", "septum"),
    missing("heart.septum.interventricular", "septum"),
    missing("heart.valve.aortic", "valve"),
    missing("heart.valve.pulmonary", "valve"),
    missing("heart.pulmonaryVeins", "greatVessel"),
    missing("heart.rightPulmonaryArtery", "greatVessel"),
    missing("heart.leftPulmonaryArtery", "greatVessel"),
    missing("heart.coronary.leftMain", "coronaryArtery"),
    available("heart.rightAtrium", "chamber", "HEART_RIGHT_ATRIUM", "reference-derived", "surface"),
    available("heart.rightVentricle", "chamber", "HEART_RIGHT_VENTRICLE", "reference-derived", "surface"),
    available("heart.leftAtrium", "chamber", "HEART_LEFT_ATRIUM", "reference-derived", "surface"),
    available("heart.leftVentricle", "chamber", "HEART_LEFT_VENTRICLE", "reference-derived", "surface"),
    // Coronary arteries: real centerlines sampled from the reference's own
    // coronary curves, which the reference itself also models as curves.
    available("heart.coronary.lad", "coronaryArtery", "CORONARY_LAD", "reference-derived", "centerline"),
    available("heart.coronary.rca", "coronaryArtery", "CORONARY_RCA", "reference-derived", "centerline"),
    available("heart.coronary.lcx", "coronaryArtery", "CORONARY_LCX", "reference-derived", "centerline"),
    // Great vessels: real centerlines, but hand-chosen constant diameters and
    // no modeled junction with the heart, so they are placeholders.
    available("heart.aorta", "greatVessel", "AORTA", "placeholder", "placeholder"),
    available("heart.pulmonaryTrunk", "greatVessel", "PULMONARY_ARTERY", "placeholder", "placeholder"),
    available("heart.superiorVenaCava", "greatVessel", "SVC", "placeholder", "placeholder"),
    available("heart.inferiorVenaCava", "greatVessel", "IVC", "placeholder", "placeholder"),
    // Valves are plain tori marking the annulus position only.
    available("heart.valve.tricuspid", "valve", "Valve_tricuspid", "placeholder", "placeholder"),
    available("heart.valve.mitral", "valve", "Valve_mitral", "placeholder", "placeholder"),
  ],
  // Measured on the real asset by heart_builder.compute_landmarks(); the
  // positions it produces are exported to render/blender/assets/heart/
  // landmarks.json. Chamber-based points use the whole chambers, not the
  // cut-open ones: the cutaway is a viewing choice, not anatomy.
  landmarks: [
    landmark("heart.base", "Centroid of both atria: the atrial end of the heart, opposite the apex."),
    landmark("heart.apex", "Left-ventricle surface point farthest from the base."),
    landmark("heart.raCenter", "Centroid of the right atrium's surface."),
    landmark("heart.rvCenter", "Centroid of the right ventricle's surface."),
    landmark("heart.laCenter", "Centroid of the left atrium's surface."),
    landmark("heart.lvCenter", "Centroid of the left ventricle's surface."),
    landmark("heart.aorticRoot", "First point of the aorta's sampled centerline."),
    landmark("heart.pulmonaryTrunk", "First point of the pulmonary trunk's sampled centerline."),
    landmark("heart.coronary.ladOrigin", "First point of the LAD centerline (the left main bifurcation)."),
    landmark("heart.coronary.lcxOrigin", "First point of the circumflex centerline (the left main bifurcation)."),
    landmark("heart.coronary.rcaOrigin", "First point of the right coronary centerline."),
  ],
  scaleReference: ["heart.base", "heart.apex"],
  // Each shot keeps the exact camera position of the coordinate preset it
  // replaced; only the aim point moved onto real landmarks (a 1-3 degree
  // change), so existing renders look the same while the shots now follow
  // the asset. Whole-heart shots aim at the centroid of the four chambers;
  // coronary shots at the ventricles the coronaries run over.
  cameraTargets: [
    { id: "CAM_HEART_OVERVIEW", frames: [], lookAt: CHAMBER_CENTERS, viewDirection: [0.013, -1, -0.017], distance: 3.646 },
    { id: "CAM_HEART_HERO", frames: [], lookAt: CHAMBER_CENTERS, viewDirection: [0.048, -0.998, -0.036], distance: 3.364 },
    { id: "CAM_HEART_ORBIT", frames: [], lookAt: CHAMBER_CENTERS, viewDirection: [0.519, -0.855, 0.015], distance: 3.525 },
    {
      id: "CAM_CORONARY_APPROACH",
      frames: ["heart.coronary"],
      lookAt: VENTRICLE_CENTERS,
      viewDirection: [0.095, -0.992, -0.077],
      distance: 1.873,
    },
    {
      id: "CAM_LV_APPROACH",
      frames: ["heart.leftVentricle", "heart.aorta"],
      lookAt: ["heart.lvCenter"],
      viewDirection: [0.322, -0.946, -0.028],
      distance: 2.233,
    },
    {
      id: "CAM_COMBINED",
      frames: ["heart.coronary", "heart.leftVentricle", "heart.aorta"],
      lookAt: VENTRICLE_CENTERS,
      viewDirection: [0.247, -0.969, 0.01],
      distance: 3.045,
    },
  ],
  // render/blender/heart_motion.py. "clinical-heartbeat" is an illustrative
  // uniform contraction at a resting 72 bpm, not simulated chamber
  // mechanics.
  motionControllers: ["clinical-heartbeat"],
  // heart_builder.py always opens the front quadrant.
  cutawayStates: ["frontQuadrantOpen"],
  // Only the Cycles look exists today; the clinical-illustration style is
  // not built yet.
  renderStyles: ["cinematic"],
};

import type { Landmark, LandmarkId, OrganModule } from "@/lib/medical-motion/contracts/organ-module";

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
// render/blender/heart_builder.py from render/blender/assets/heart/. Every
// registry entry below is an object that script really creates; structures
// it does not build (myocardium, septa, aortic and pulmonary valves,
// pulmonary veins, left main coronary, pulmonary artery branches) are left
// out rather than claimed, so asking for one fails with
// ANATOMY_STRUCTURE_NOT_FOUND instead of rendering without it.
//
// The whole asset is a development placeholder: the chambers' outer surfaces
// are retopologized from a real anatomical reference, but they are solid,
// with no cavity or wall thickness, and the reference's licence question in
// medical-assets/LICENSE_MANIFEST.json is still open.
export const HEART_ORGAN_MODULE: OrganModule = {
  id: "heart",
  assetVersion: HEART_ASSET_VERSION,
  assetStatus: "development-placeholder",
  anatomicallyValidated: false,
  anatomyRegistry: [
    { id: "heart.rightAtrium", kind: "chamber", blenderObject: "HEART_RIGHT_ATRIUM", fidelity: "reference-derived" },
    { id: "heart.rightVentricle", kind: "chamber", blenderObject: "HEART_RIGHT_VENTRICLE", fidelity: "reference-derived" },
    { id: "heart.leftAtrium", kind: "chamber", blenderObject: "HEART_LEFT_ATRIUM", fidelity: "reference-derived" },
    { id: "heart.leftVentricle", kind: "chamber", blenderObject: "HEART_LEFT_VENTRICLE", fidelity: "reference-derived" },
    // Coronary arteries: real centerlines sampled from the reference's own
    // coronary curves, which the reference itself also models as curves.
    { id: "heart.coronary.lad", kind: "coronaryArtery", blenderObject: "CORONARY_LAD", fidelity: "reference-derived" },
    { id: "heart.coronary.rca", kind: "coronaryArtery", blenderObject: "CORONARY_RCA", fidelity: "reference-derived" },
    { id: "heart.coronary.lcx", kind: "coronaryArtery", blenderObject: "CORONARY_LCX", fidelity: "reference-derived" },
    // Great vessels: real centerlines, but hand-chosen constant diameters and
    // no modeled junction with the heart, so they are placeholders.
    { id: "heart.aorta", kind: "greatVessel", blenderObject: "AORTA", fidelity: "placeholder" },
    { id: "heart.pulmonaryTrunk", kind: "greatVessel", blenderObject: "PULMONARY_ARTERY", fidelity: "placeholder" },
    { id: "heart.superiorVenaCava", kind: "greatVessel", blenderObject: "SVC", fidelity: "placeholder" },
    { id: "heart.inferiorVenaCava", kind: "greatVessel", blenderObject: "IVC", fidelity: "placeholder" },
    // Valves are plain tori marking the annulus position only.
    { id: "heart.valve.tricuspid", kind: "valve", blenderObject: "Valve_tricuspid", fidelity: "placeholder" },
    { id: "heart.valve.mitral", kind: "valve", blenderObject: "Valve_mitral", fidelity: "placeholder" },
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
  // No heartbeat is implemented yet; every render is a still frame.
  motionControllers: [],
  // heart_builder.py always opens the front quadrant.
  cutawayStates: ["frontQuadrantOpen"],
  // Only the Cycles look exists today; the clinical-illustration style is
  // not built yet.
  renderStyles: ["cinematic"],
};

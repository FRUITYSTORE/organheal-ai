import type { OrganModule } from "@/lib/medical-motion/contracts/organ-module";

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
  // Added with real positions from the asset in the landmark phase. Naming
  // landmarks here before the asset provides them would repeat the mistake of
  // claiming what the asset does not have.
  landmarks: [],
  cameraTargets: [
    { id: "CAM_HEART_OVERVIEW", frames: [] },
    { id: "CAM_HEART_HERO", frames: [] },
    { id: "CAM_HEART_ORBIT", frames: [] },
    { id: "CAM_CORONARY_APPROACH", frames: ["heart.coronary"] },
    { id: "CAM_LV_APPROACH", frames: ["heart.leftVentricle", "heart.aorta"] },
    { id: "CAM_COMBINED", frames: ["heart.coronary", "heart.leftVentricle", "heart.aorta"] },
  ],
  // No heartbeat is implemented yet; every render is a still frame.
  motionControllers: [],
  // heart_builder.py always opens the front quadrant.
  cutawayStates: ["frontQuadrantOpen"],
  // Only the Cycles look exists today; the clinical-illustration style is
  // not built yet.
  renderStyles: ["cinematic"],
};

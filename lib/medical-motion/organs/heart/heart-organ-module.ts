import type { OrganModule } from "@/lib/medical-motion/contracts/organ-module";
import { HEART_ASSET_VERSION } from "@/lib/medical-motion/organs/heart/heart-visualization-resolver";

// Organ module #1. Metadata only — the actual geometry/materials live in
// the Blender build script (render/blender/build_heart.py), not here; this
// is what lets the engine validate a scene's camera/highlight targets
// actually exist on this organ before ever invoking Blender.
//
// anatomicallyValidated is FALSE and must stay false until a real clinical/
// anatomical reviewer has signed off — see architecture brief section 8.
// Building the geometry does not, by itself, earn this flag.
export const HEART_ORGAN_MODULE: OrganModule = {
  id: "heart",
  assetVersion: HEART_ASSET_VERSION,
  anatomyGroups: [
    "HEART_LEFT_ATRIUM",
    "HEART_RIGHT_ATRIUM",
    "HEART_LEFT_VENTRICLE",
    "HEART_RIGHT_VENTRICLE",
    "VALVE_MITRAL",
    "VALVE_TRICUSPID",
    "VALVE_AORTIC",
    "VALVE_PULMONARY",
    "AORTA",
    "PULMONARY_ARTERY",
    "PULMONARY_VEINS",
    "SVC",
    "IVC",
    "CORONARY_LAD",
    "CORONARY_RCA",
    "CORONARY_LCX",
  ],
  cameraPresets: [
    "CAM_HEART_HERO",
    "CAM_HEART_OVERVIEW",
    "CAM_HEART_ORBIT",
    "CAM_CORONARY_APPROACH",
    "CAM_LV_APPROACH",
    "CAM_COMBINED",
  ],
  motionPresets: ["clinical-heartbeat"],
  highlightGroups: ["CORONARY_LAD", "CORONARY_RCA", "CORONARY_LCX", "HEART_LEFT_VENTRICLE", "AORTA"],
  anatomicallyValidated: false,
};

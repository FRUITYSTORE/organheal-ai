import type { HeartFocus } from "@/lib/heart-age/heart-focus";
import type { SceneDefinition } from "@/lib/medical-motion/contracts/scene";

// The clinical → visualization boundary for the heart (architecture brief
// sections 4-6). Reuses the ALREADY-VALIDATED lib/heart-age/heart-focus.ts
// (real NCEP ATP III / ACC-AHA 2017 thresholds — see that file) rather than
// re-deriving risk logic here; this module's only job is to turn that real
// clinical signal into a normalized, organ-specific visualization decision.
//
// Medical safety rule (brief section 6), enforced structurally by this
// function's own return type: it can only ever select a CAMERA/HIGHLIGHT
// PRESET, never invent a pathology. A "combined" focus still points the
// camera at real, unremarkable coronary arteries and a real, unremarkable
// left ventricle — it never adds a lesion, blockage or abnormal structure
// that wasn't clinically demonstrated. High risk changes what the camera
// looks at, never what the anatomy IS.

export type HeartVisualizationFocus = "overview" | "coronary" | "lvAorta" | "combined";

const HEART_ASSET_VERSION = "heart-v1-development"; // placeholder asset — see organ-module.ts's anatomicallyValidated:false

const SCENE_VERSION = "1";

const BASE_DURATION_SECONDS = 5;
const COMBINED_DURATION_SECONDS = 6.5; // extra time for two callouts, same reasoning as the old SVG scene

const HIGHLIGHT_GROUPS: Record<HeartVisualizationFocus, readonly string[]> = {
  overview: [],
  coronary: ["CORONARY_LAD", "CORONARY_RCA", "CORONARY_LCX"],
  lvAorta: ["HEART_LEFT_VENTRICLE", "AORTA"],
  combined: ["CORONARY_LAD", "CORONARY_RCA", "CORONARY_LCX", "HEART_LEFT_VENTRICLE", "AORTA"],
};

const CAMERA_PRESETS: Record<HeartVisualizationFocus, string> = {
  overview: "CAM_HEART_OVERVIEW",
  coronary: "CAM_CORONARY_APPROACH",
  lvAorta: "CAM_LV_APPROACH",
  combined: "CAM_COMBINED",
};

/**
 * Normalizes the two independent boolean risk-factor flags into one of four
 * unambiguous visualization states — the exact resolution table from the
 * architecture brief section 5. Pure, side-effect-free.
 */
export function resolveHeartVisualizationFocus(focus: HeartFocus): HeartVisualizationFocus {
  if (focus.coronaryArteries && focus.leftVentricleAndAorta) return "combined";
  if (focus.coronaryArteries) return "coronary";
  if (focus.leftVentricleAndAorta) return "lvAorta";
  return "overview";
}

/**
 * Builds the full, organ-agnostic SceneDefinition the render layer needs —
 * still zero I/O, zero Blender, zero clinical-pathology inference. This is
 * the exact "Phase 1/2" boundary from the architecture brief: only after
 * this function returns does anything render-related get involved.
 */
export function buildHeartScene(focus: HeartFocus): SceneDefinition {
  const visualizationFocus = resolveHeartVisualizationFocus(focus);
  const structures = HIGHLIGHT_GROUPS[visualizationFocus];

  return {
    organ: "heart",
    sceneVersion: SCENE_VERSION,
    durationSeconds: structures.length > 3 ? COMBINED_DURATION_SECONDS : BASE_DURATION_SECONDS,
    focus: visualizationFocus,
    camera: { preset: CAMERA_PRESETS[visualizationFocus] },
    motion: { preset: "clinical-heartbeat" },
    highlight: { structures, intensity: visualizationFocus === "overview" ? 0 : 0.8 },
    output: { aspectRatio: "16:9", resolution: "1080p" },
  };
}

export { HEART_ASSET_VERSION };

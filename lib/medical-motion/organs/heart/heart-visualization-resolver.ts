import type { HeartFocus } from "@/lib/heart-age/heart-focus";
import type { AnatomyStructureId } from "@/lib/medical-motion/contracts/anatomy";
import type { SceneDefinition } from "@/lib/medical-motion/contracts/scene";
import { anatomyRenderIdentity } from "../../anatomy-foundation";
import { HEART_ORGAN_MODULE } from "./heart-organ-module";

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

// "2": highlight structures became anatomy registry ids instead of Blender
// object names. "3": scenes are videos with a camera move and heartbeat.
const SCENE_VERSION = "3";

const OVERVIEW_SHOT = "CAM_HEART_OVERVIEW";

const BASE_DURATION_SECONDS = 5;
const COMBINED_DURATION_SECONDS = 6.5; // extra time for two callouts, same reasoning as the old SVG scene

// Anatomy registry ids only (see heart-organ-module.ts). This used to list
// Blender object names directly, which tied clinical logic to how one asset
// happens to name its objects; the render layer now maps ids to objects.
const CORONARIES: readonly AnatomyStructureId[] = ["heart.coronary.lad", "heart.coronary.rca", "heart.coronary.lcx"];
const LV_AND_AORTA: readonly AnatomyStructureId[] = ["heart.leftVentricle", "heart.aorta"];

const HIGHLIGHT_GROUPS: Record<HeartVisualizationFocus, readonly AnatomyStructureId[]> = {
  overview: [],
  coronary: CORONARIES,
  lvAorta: LV_AND_AORTA,
  combined: [...CORONARIES, ...LV_AND_AORTA],
};

const CAMERA_PRESETS: Record<HeartVisualizationFocus, string> = {
  overview: OVERVIEW_SHOT,
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
  return buildHeartVisualizationScene(resolveHeartVisualizationFocus(focus));
}

/** Presentation presets shared by risk focus and validated explanation plans. */
export function buildHeartVisualizationScene(visualizationFocus: HeartVisualizationFocus): SceneDefinition {
  const structures = HIGHLIGHT_GROUPS[visualizationFocus];
  const preset = CAMERA_PRESETS[visualizationFocus];

  return {
    organ: "heart",
    sceneVersion: SCENE_VERSION,
    durationSeconds: structures.length > 3 ? COMBINED_DURATION_SECONDS : BASE_DURATION_SECONDS,
    anatomyIdentity: anatomyRenderIdentity(HEART_ORGAN_MODULE),
    focus: visualizationFocus,
    // The whole heart first, then the camera moves in on what the focus is
    // about; an overview has nowhere to move to.
    camera: preset === OVERVIEW_SHOT ? { preset } : { preset, from: OVERVIEW_SHOT },
    motion: { preset: "clinical-heartbeat" },
    highlight: { structures, intensity: visualizationFocus === "overview" ? 0 : 0.8 },
    // The overview and camera/heartbeat depend on the chambers even when
    // no chamber is highlighted. This is visual review, not a symptom plan.
    anatomyRequirements: Object.fromEntries([
      ...["heart.rightAtrium", "heart.rightVentricle", "heart.leftAtrium", "heart.leftVentricle"].map((id) =>
        [id, { representations: ["surface", "tissue"] }]),
      ...structures.filter((id) => id !== "heart.leftVentricle").map((id) => [id, {}]),
    ]),
    output: { aspectRatio: "16:9", resolution: "1080p", media: "video" },
  };
}

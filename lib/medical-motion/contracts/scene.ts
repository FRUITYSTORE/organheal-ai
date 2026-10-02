import type { AnatomyStructureId } from "@/lib/medical-motion/contracts/anatomy";
import type { OrganId } from "@/lib/medical-motion/contracts/organ";
import type { AnatomyRequirements } from "@/lib/medical-motion/contracts/organ-module";

// A fully-resolved, organ-agnostic instruction set for the render layer.
// Nothing in this type knows about clinical data (age, risk, cholesterol) —
// by the time a SceneDefinition exists, a clinical-rules resolver (see
// heart-visualization-resolver.ts) has already turned raw patient numbers
// into a visualization decision. This is the boundary the architecture
// brief calls out explicitly (section 4): clinical data must not reach the
// renderer directly.
export type AspectRatio = "16:9" | "9:16" | "1:1";
export type RenderResolution = "720p" | "1080p";
/** "still": one PNG frame. "video": an MP4 of `durationSeconds`, with the
 * motion controller running and the camera moving from `camera.from`. */
export type RenderMedia = "still" | "video";

export type SceneDefinition = {
  anatomyIdentity?: import("./anatomy-foundation").AnatomyRenderIdentity;
  organ: OrganId;
  /** Bumped whenever the scene contract's shape changes, not per-render. */
  sceneVersion: string;
  durationSeconds: number;
  /** Organ-specific normalized focus id, e.g. heart's "coronary" | "lvAorta". */
  focus: string;
  /** Camera shot ids from the organ module's cameraTargets. With `from`, a
   * video glides from that shot to `preset`, then holds. */
  camera: { preset: string; from?: string };
  /** A name from the organ module's motionControllers; runs in videos. */
  motion: { preset: string };
  /** Anatomy registry ids (e.g. "heart.coronary.lad"), never Blender object
   * names: only the render layer maps ids to objects, through the organ
   * module's registry (see render/blender-renderer.ts). */
  highlight: { structures: readonly AnatomyStructureId[]; intensity: number };
  /** Anatomical dependencies, not highlight selections. Legacy non-explanation
   * scenes may omit this; explanation plans are checked separately at render. */
  anatomyRequirements?: AnatomyRequirements;
  output: { aspectRatio: AspectRatio; resolution: RenderResolution; media: RenderMedia };
};

import type { AnatomyStructureId } from "@/lib/medical-motion/contracts/anatomy";
import type { OrganId } from "@/lib/medical-motion/contracts/organ";

// A fully-resolved, organ-agnostic instruction set for the render layer.
// Nothing in this type knows about clinical data (age, risk, cholesterol) —
// by the time a SceneDefinition exists, a clinical-rules resolver (see
// heart-visualization-resolver.ts) has already turned raw patient numbers
// into a visualization decision. This is the boundary the architecture
// brief calls out explicitly (section 4): clinical data must not reach the
// renderer directly.
export type AspectRatio = "16:9" | "9:16" | "1:1";
export type RenderResolution = "720p" | "1080p";

export type SceneDefinition = {
  organ: OrganId;
  /** Bumped whenever the scene contract's shape changes, not per-render. */
  sceneVersion: string;
  durationSeconds: number;
  /** Organ-specific normalized focus id, e.g. heart's "coronary" | "lvAorta". */
  focus: string;
  camera: { preset: string };
  motion: { preset: string };
  /** Anatomy registry ids (e.g. "heart.coronary.lad"), never Blender object
   * names: only the render layer maps ids to objects, through the organ
   * module's registry (see render/blender-renderer.ts). */
  highlight: { structures: readonly AnatomyStructureId[]; intensity: number };
  output: { aspectRatio: AspectRatio; resolution: RenderResolution };
};

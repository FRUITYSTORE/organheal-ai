import type { OrganId } from "@/lib/medical-motion/contracts/organ";

// The shared shape every organ (heart, then lungs/liver/kidneys) must
// conform to, so the engine, render worker and composer never need
// organ-specific branching. Adding an organ means adding one of these,
// not modifying the engine — see architecture brief section 14/34.
export type OrganModule = {
  id: OrganId;
  /** Bumped when the underlying anatomy geometry/materials change. */
  assetVersion: string;
  /** Human-readable names of the anatomical groups this organ's build
   * script creates (e.g. "HEART_LEFT_VENTRICLE", "CORONARY_LAD") — used to
   * validate that a highlight/camera target actually exists on this organ
   * before a render is attempted. */
  anatomyGroups: readonly string[];
  cameraPresets: readonly string[];
  motionPresets: readonly string[];
  highlightGroups: readonly string[];
  /** True only once a real anatomical review has happened — see brief
   * section 8: "do not claim anatomical validation merely because geometry
   * exists." Starts false for every organ, including heart v1. */
  anatomicallyValidated: boolean;
};

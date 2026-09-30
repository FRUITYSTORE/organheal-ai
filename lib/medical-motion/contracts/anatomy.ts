import type { OrganId } from "@/lib/medical-motion/contracts/organ";

/** Stable anatomy id, organ-prefixed: "heart.coronary.lad". A bare group
 * prefix ("heart.coronary") is also valid wherever a focus is expected.
 * Business logic always speaks in these ids; only the render layer maps them
 * to Blender object names, through the organ module's anatomy registry. */
export type AnatomyStructureId = `${OrganId}.${string}`;

// The full set of organs the Medical Motion Engine knows about. Heart is
// organ module #1 (see lib/medical-motion/organs/heart); lungs, liver and
// kidneys are documented here as the known future set so every contract
// below can reference them without a breaking type change later, per the
// architecture brief's "adding an organ should not touch the engine" goal.
export type OrganId = "heart" | "lungs" | "liver" | "kidneys";

export const ORGAN_IDS: readonly OrganId[] = ["heart", "lungs", "liver", "kidneys"];

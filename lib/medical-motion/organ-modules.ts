import type { OrganModule } from "@/lib/medical-motion/contracts/organ-module";
import type { OrganId } from "@/lib/medical-motion/contracts/organ";
import { HEART_ORGAN_MODULE } from "@/lib/medical-motion/organs/heart/heart-organ-module";

// The one place an organ's module is looked up. Organs with no real asset
// yet (lungs, liver, kidneys) are simply absent, so anything asking for them
// gets null and fails with ORGAN_MODULE_NOT_FOUND, never a stand-in shape.
const ORGAN_MODULES: Partial<Record<OrganId, OrganModule>> = {
  heart: HEART_ORGAN_MODULE,
};

export function getOrganModule(organ: OrganId): OrganModule | null {
  return Object.hasOwn(ORGAN_MODULES, organ) ? ORGAN_MODULES[organ] ?? null : null;
}

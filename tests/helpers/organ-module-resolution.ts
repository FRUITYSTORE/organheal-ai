import { vi } from "vitest";
import * as modules from "../../lib/medical-motion/organ-modules";
import type { OrganModule } from "../../lib/medical-motion/contracts/organ-module";
/** Hypothetical test authority only; preserve exact identity and reject every mismatch. */
export function installTestOrganModuleResolution(module: OrganModule) {
  const legacy = vi.spyOn(modules, "getOrganModule").mockImplementation(organ => organ === module.id ? module : null);
  const exact = vi.spyOn(modules, "getOrganModuleForAsset").mockImplementation((organ, version) =>
    organ === module.id && version === module.assetVersion ? module : null);
  return { legacy, exact };
}

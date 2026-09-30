import type { OrganId } from "@/lib/medical-motion/contracts/organ";
import type { AnatomyRegistryEntry, OrganModule } from "@/lib/medical-motion/contracts/organ-module";
import { getOrganModule } from "@/lib/medical-motion/organ-modules";
import type { OrganStructureLookup } from "@/lib/symptom-explanation/anatomy-resolver";
import {
  SYMPTOM_EXPLANATION_ERROR_CODE,
  type AnatomyStructureId,
} from "@/lib/symptom-explanation/contracts";

/** "development": internal review renders, placeholders allowed.
 * "production": what a member sees; only real, reviewed anatomy. */
export type RenderMode = "production" | "development";

type ModuleSource = (organ: OrganId) => OrganModule | null;

/** Structure availability for resolveAnatomy(), backed by the real organ
 * modules: an organ's structures are exactly its registry, nothing more. */
export function createOrganStructureLookup(getModule: ModuleSource = getOrganModule): OrganStructureLookup {
  return (organ) => {
    const organModule = getModule(organ);

    return organModule ? organModule.anatomyRegistry.map((entry) => entry.id) : null;
  };
}

export type AssetReadinessResult =
  | { ok: true; blenderObjects: readonly string[] }
  | {
      ok: false;
      errorCode:
        | typeof SYMPTOM_EXPLANATION_ERROR_CODE.ORGAN_MODULE_NOT_FOUND
        | typeof SYMPTOM_EXPLANATION_ERROR_CODE.ANATOMY_STRUCTURE_NOT_FOUND
        | typeof SYMPTOM_EXPLANATION_ERROR_CODE.REAL_ANATOMICAL_ASSET_REQUIRED;
      details: readonly string[];
    };

// The render-time gate, run on the plan's final structure list right before
// anything is handed to Blender. The plan may have been stored and reloaded
// since it was resolved, so structure existence is checked again here rather
// than trusted.
//
// In production mode a development-placeholder asset, an asset nobody has
// anatomically validated, or any placeholder structure all fail with
// REAL_ANATOMICAL_ASSET_REQUIRED. There is no fallback: a missing medical
// asset is preferable to misleading anatomy.
export function checkAssetReadiness(
  organ: OrganId,
  structures: readonly AnatomyStructureId[],
  mode: RenderMode,
  getModule: ModuleSource = getOrganModule
): AssetReadinessResult {
  const organModule = getModule(organ);

  if (organModule === null) {
    return {
      ok: false,
      errorCode: SYMPTOM_EXPLANATION_ERROR_CODE.ORGAN_MODULE_NOT_FOUND,
      details: [`No organ module exists for "${organ}".`],
    };
  }

  const resolved: AnatomyRegistryEntry[] = [];
  const missing: AnatomyStructureId[] = [];

  for (const id of structures) {
    const entry = organModule.anatomyRegistry.find((item) => item.id === id);

    if (entry) {
      resolved.push(entry);
    } else {
      missing.push(id);
    }
  }

  if (missing.length > 0) {
    return {
      ok: false,
      errorCode: SYMPTOM_EXPLANATION_ERROR_CODE.ANATOMY_STRUCTURE_NOT_FOUND,
      details: missing,
    };
  }

  if (mode === "production") {
    const reasons: string[] = [];

    if (organModule.assetStatus !== "production") {
      reasons.push(`The ${organ} asset is a ${organModule.assetStatus}.`);
    }

    if (!organModule.anatomicallyValidated) {
      reasons.push(`The ${organ} asset has not been anatomically validated.`);
    }

    for (const entry of resolved) {
      if (entry.fidelity === "placeholder") {
        reasons.push(`${entry.id} is placeholder geometry.`);
      }
    }

    if (reasons.length > 0) {
      return {
        ok: false,
        errorCode: SYMPTOM_EXPLANATION_ERROR_CODE.REAL_ANATOMICAL_ASSET_REQUIRED,
        details: reasons,
      };
    }
  }

  return { ok: true, blenderObjects: resolved.map((entry) => entry.blenderObject) };
}

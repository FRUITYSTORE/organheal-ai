import { MEDICAL_MECHANISMS, LEGACY_MECHANISM_BINDINGS } from "@/lib/medical-motion/mechanism-definitions";
import type { OrganId } from "@/lib/medical-motion/contracts/organ";
import {
  SYMPTOM_EXPLANATION_ERROR_CODE,
  type AnatomyStructureId,
  type MechanismId,
  type VideoExplanationPlan,
} from "@/lib/symptom-explanation/contracts";

// Mechanism -> anatomy. Takes a physiological mechanism the clinical
// explanation already settled on (never a symptom, never a disease) and
// returns which organ and which real structures explain it, in the exact
// shape a VideoExplanationPlan's anatomy block needs.
//
// Only NORMAL anatomy is ever named here. Whether a pathology visual is
// allowed is decided separately, from documented findings (see
// validate-explanation-plan.ts); a mechanism alone never earns one.

export type AnatomyResolution = {
  organ: OrganId;
} & VideoExplanationPlan["anatomy"];

/** The whole-body registry owns minimum dependencies; this adapter retains the
 * current explanation/compiler vocabulary and fresh mutable plan copies. */
export function getMechanismAnatomy(mechanism: MechanismId, version?: string) {
  const binding = LEGACY_MECHANISM_BINDINGS[mechanism];
  const entry = binding && MEDICAL_MECHANISMS.get(mechanism, version ?? binding.version);
  if (!entry) throw Error("UNKNOWN_EXPLANATION_MECHANISM");
  const requirements = structuredClone(entry.requiredAnatomy);
  return { organ: entry.affectedOrgans[0], primaryFocus: binding.primaryFocus,
    rationale: entry.rationale, requirements, structures: Object.keys(requirements) as AnatomyStructureId[] };
}
/** Which structure ids an organ's real anatomical asset actually provides,
 * or null when that organ has no module at all. Supplied by the caller (the
 * organ module registry, a later phase) so this stays a pure function. */
export type OrganStructureLookup = (organ: OrganId) => readonly AnatomyStructureId[] | null;

export type AnatomyResolutionResult =
  | { ok: true; anatomy: AnatomyResolution; rationale: string }
  | {
      ok: false;
      errorCode:
        | typeof SYMPTOM_EXPLANATION_ERROR_CODE.ORGAN_MODULE_NOT_FOUND
        | typeof SYMPTOM_EXPLANATION_ERROR_CODE.ANATOMY_STRUCTURE_NOT_FOUND;
      organ: OrganId;
      missing: readonly AnatomyStructureId[];
    };

// Fails whole, never partially: if the real asset lacks even one structure
// the explanation needs, the result is ANATOMY_STRUCTURE_NOT_FOUND with every
// missing id listed. Nothing here substitutes approximate geometry or quietly
// drops the missing structure; a missing medical asset is preferable to
// misleading anatomy.
export function resolveAnatomy(
  mechanism: MechanismId,
  availableStructures: OrganStructureLookup
): AnatomyResolutionResult {
  const entry = getMechanismAnatomy(mechanism);
  const available = availableStructures(entry.organ);

  if (available === null) {
    return {
      ok: false,
      errorCode: SYMPTOM_EXPLANATION_ERROR_CODE.ORGAN_MODULE_NOT_FOUND,
      organ: entry.organ,
      missing: [...entry.structures],
    };
  }

  const missing = entry.structures.filter((structure) => !available.includes(structure));

  if (missing.length > 0) {
    return {
      ok: false,
      errorCode: SYMPTOM_EXPLANATION_ERROR_CODE.ANATOMY_STRUCTURE_NOT_FOUND,
      organ: entry.organ,
      missing,
    };
  }

  return {
    ok: true,
    anatomy: {
      organ: entry.organ,
      primaryFocus: entry.primaryFocus,
      structures: [...entry.structures],
      requirements: entry.requirements,
    },
    rationale: entry.rationale,
  };
}

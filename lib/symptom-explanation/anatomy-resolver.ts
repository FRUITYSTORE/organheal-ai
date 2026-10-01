import type { OrganId } from "@/lib/medical-motion/contracts/organ";
import type { AnatomyRequirements } from "@/lib/medical-motion/contracts/organ-module";
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

type AnatomyEntry = {
  organ: OrganId;
  primaryFocus: AnatomyStructureId;
  requirements: AnatomyRequirements;
  /** Why these structures, in plain terms. */
  rationale: string;
};

const MECHANISM_ANATOMY = {
  myocardialOxygenDemandSupply: {
    organ: "heart",
    primaryFocus: "heart.coronary",
    requirements: {
      // This is a required scope, not a claim that any candidate dataset
      // supplies it. TotalSegmentator V1 class 44 remains conditional.
      "heart.myocardium": { representations: ["tissue"], requireVerified: true, completeCoverage: true,
        requiredRegions: ["LV", "RV", "septum", "LA", "RA"] },
      "heart.coronary.lad": { representations: ["centerline", "surface", "tissue"], requireVerified: false },
      "heart.coronary.rca": { representations: ["centerline", "surface", "tissue"], requireVerified: false },
      "heart.coronary.lcx": { representations: ["centerline", "surface", "tissue"], requireVerified: false },
    },
    rationale:
      "The heart muscle's oxygen demand rises with effort, and the three main coronary arteries are what supply it.",
  },
  // The owner-supplied spec's example names this focus "heart.lvAorta". That
  // is not a real structure or a group of structures (the left ventricle is
  // a chamber, the aorta a great vessel), so the camera centers on the left
  // ventricle and the combined LV + aorta view becomes a camera-director shot
  // in a later phase instead.
  leftVentricularPressureLoad: {
    organ: "heart",
    primaryFocus: "heart.leftVentricle",
    requirements: {
      // Educational focus, not a wall-thickening/pathology simulation.
      // Placeholders remain internal-development only: production always
      // imposes organ approval, verification and complete coverage.
      "heart.leftVentricle": { representations: ["surface", "tissue"], requireVerified: false },
      "heart.aorta": { representations: ["surface", "tissue", "centerline", "placeholder"], requireVerified: false },
    },
    rationale:
      "Higher arterial pressure means the left ventricle has to push harder to eject blood into the aorta.",
  },
} as const satisfies Record<MechanismId, AnatomyEntry>;

/** The existing mechanism table is the authoritative minimum. Fresh copies
 * prevent a generated/stored plan from mutating or weakening another plan. */
export function getMechanismAnatomy(mechanism: MechanismId) {
  const entry: AnatomyEntry = MECHANISM_ANATOMY[mechanism];
  const requirements: AnatomyRequirements = {};
  for (const [id, requirement] of Object.entries(entry.requirements)) {
    if (!requirement) throw new Error(`Mechanism ${mechanism} has no requirement for ${id}.`);
    requirements[id as AnatomyStructureId] = {
      ...requirement,
      ...(requirement.representations ? { representations: [...requirement.representations] } : {}),
      ...(requirement.requiredRegions ? { requiredRegions: [...requirement.requiredRegions] } : {}),
    };
  }
  return { ...entry, requirements, structures: Object.keys(requirements) as AnatomyStructureId[] };
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

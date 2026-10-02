import type { OrganId } from "@/lib/medical-motion/contracts/organ";
import type { AnatomyRegistryEntry, AnatomyRequirements, OrganModule } from "@/lib/medical-motion/contracts/organ-module";
import { validateVideoExplanationPlan } from "@/lib/symptom-explanation/validate-explanation-plan";
import { getOrganModule } from "@/lib/medical-motion/organ-modules";
import { anatomyAssessmentIssues } from "@/lib/medical-motion/anatomy-foundation";
import { WHOLE_BODY_ANATOMY } from "@/lib/medical-motion/whole-body-anatomy";
import type { WholeBodyAnatomyCatalog } from "@/lib/medical-motion/contracts/anatomy-foundation";
import { MEDICAL_MECHANISMS, LEGACY_MECHANISM_BINDINGS } from "@/lib/medical-motion/mechanism-definitions";
import { patientMechanismApproved } from "@/lib/medical-motion/mechanism-registry";
import type { OrganStructureLookup } from "@/lib/symptom-explanation/anatomy-resolver";
import {
  SYMPTOM_EXPLANATION_ERROR_CODE,
  type AnatomyStructureId,
} from "@/lib/symptom-explanation/contracts";

/** "development": internal review renders, placeholders allowed.
 * "production": what a member sees; only real, reviewed anatomy. */
export type RenderMode = "production" | "development";

type ModuleSource = (organ: OrganId) => OrganModule | null;

/** Known inventory includes missing structures; availability lookup does not.
 * This lookup is not a claim of medical verification or production readiness. */
export function createOrganStructureLookup(getModule: ModuleSource = getOrganModule): OrganStructureLookup {
  return (organ) => {
    const organModule = getModule(organ);

    return organModule ? organModule.anatomyRegistry
      .filter((entry) => entry.availability !== "missing" && entry.blenderObject?.trim() && entry.verification !== "rejected")
      .map((entry) => entry.id) : null;
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
  getModule: ModuleSource = getOrganModule,
  requirements: AnatomyRequirements = {},
  catalog: WholeBodyAnatomyCatalog = WHOLE_BODY_ANATOMY
): AssetReadinessResult {
  const organModule = getModule(organ);

  if (organModule === null) {
    return {
      ok: false,
      errorCode: SYMPTOM_EXPLANATION_ERROR_CODE.ORGAN_MODULE_NOT_FOUND,
      details: [`No organ module exists for "${organ}".`],
    };
  }

  const resolved: (AnatomyRegistryEntry & { blenderObject: string })[] = [];
  const missing: AnatomyStructureId[] = [];

  // Requirements are dependencies in their own right, even when the caller
  // passes only highlight selections (or no highlights at all).
  const dependencies = [...new Set([...structures, ...Object.keys(requirements) as AnatomyStructureId[]])];
  for (const id of dependencies) {
    const entry = organModule.anatomyRegistry.find((item) => item.id === id);

    if (entry && entry.availability !== "missing" && entry.blenderObject?.trim()) {
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

  const reasons: string[] = [];
  if (organModule.id !== organ) reasons.push("The requested organ does not match the organ module.");

  if (mode === "production") {
    if (!organModule.anatomyVersion?.trim()) reasons.push("Production anatomy must have an explicit anatomy version.");
    if (dependencies.length === 0) reasons.push("Production rendering requires explicit anatomical dependencies.");
    if (organModule.assetStatus !== "production") {
      reasons.push(`The ${organ} asset is a ${organModule.assetStatus}.`);
    }

    if (!organModule.anatomicallyValidated) {
      reasons.push(`The ${organ} asset has not been anatomically validated.`);
    }
  }

  for (const entry of resolved) {
    const requirement = requirements[entry.id];
    const verifiedRequired = mode === "production" || requirement?.requireVerified === true ||
      requirement?.completeCoverage === true || requirement?.requireClinicalApproval === true || (requirement?.requiredRegions?.length ?? 0) > 0;
    const completeRequired = mode === "production" || requirement?.completeCoverage === true;
    const placeholder = entry.fidelity === "placeholder" || entry.representation === "placeholder";

    if (entry.verification === "rejected") {
      reasons.push(`${entry.id} has rejected anatomy.`);
    }
    if (entry.assessment?.geometryStatus === "rejected" || entry.assessment?.semanticStatus === "rejected" || entry.assessment?.clinicalApprovalStatus === "rejected") {
      reasons.push(`${entry.id} has an explicitly rejected review.`);
    }
    if (verifiedRequired) {
      reasons.push(...anatomyAssessmentIssues(entry, organModule, catalog,
        mode === "production" || requirement?.requireClinicalApproval === true, mode === "production"));
      if (placeholder) reasons.push(`${entry.id} is placeholder geometry.`);
      if (entry.verification !== "verified") reasons.push(`${entry.id} anatomy is ${entry.verification}.`);
      if (!entry.coverage.evidenceRefs.some((ref) => ref.trim()) || !entry.coverage.verifiedRegions.some((region) => region.trim())) {
        reasons.push(`${entry.id} has no evidenced verified anatomical coverage.`);
      }
      // Myocardium and septa must be actual tissue, not chamber cavities or
      // surfaces. Other educational uses can explicitly restrict representation.
      if (entry.representation === "unknown" ||
          ((entry.kind === "myocardium" || entry.kind === "septum" || entry.kind === "valve") && entry.representation !== "tissue")) {
        reasons.push(`${entry.id} has unsuitable ${entry.representation} representation for ${entry.kind}.`);
      }
    }
    if (requirement?.representations && !requirement.representations.includes(entry.representation)) {
      reasons.push(`${entry.id} has unsuitable ${entry.representation} representation for the requested use.`);
    }
    if (completeRequired && (entry.availability !== "present" || entry.coverage.unknownRegions.length > 0 || entry.coverage.excludedRegions.length > 0)) {
      reasons.push(`${entry.id} does not provide complete anatomical coverage.`);
    }
    for (const region of requirement?.requiredRegions ?? []) {
      if (!entry.coverage.verifiedRegions.includes(region) || entry.coverage.unknownRegions.includes(region) ||
          entry.coverage.excludedRegions.includes(region) || entry.verification !== "verified" || !entry.coverage.evidenceRefs.some((ref) => ref.trim())) {
        reasons.push(`${entry.id} lacks verified coverage of ${region}.`);
      }
    }
  }

  if (reasons.length > 0) {
    return {
      ok: false,
      errorCode: SYMPTOM_EXPLANATION_ERROR_CODE.REAL_ANATOMICAL_ASSET_REQUIRED,
      details: reasons,
    };
  }

  // Map only the caller's selections. Dependencies must never become highlights.
  return { ok: true, blenderObjects: structures.map((id) => resolved.find((entry) => entry.id === id)!.blenderObject) };
}

/** Untrusted plans are safety/shape/minimum-requirement checked before any
 * asset lookup. Clinical text never authorizes a readiness override. */
export function checkExplanationPlanReadiness(
  value: unknown, mode: RenderMode, getModule: ModuleSource = getOrganModule
) {
  const validation = validateVideoExplanationPlan(value);
  if (!validation.ok) return validation;
  const { plan } = validation;
  const readiness = checkAssetReadiness(plan.organ, plan.anatomy.structures, mode, getModule, plan.anatomy.requirements);
  if (readiness.ok && mode === "production") {
    const m = MEDICAL_MECHANISMS.get(plan.mechanism.id, plan.mechanism.version ?? LEGACY_MECHANISM_BINDINGS[plan.mechanism.id].version);
    if (!m || !patientMechanismApproved(m)) return { ok: false as const, errorCode: SYMPTOM_EXPLANATION_ERROR_CODE.REAL_ANATOMICAL_ASSET_REQUIRED, details: ["Mechanism requires independent medical review and patient approval."] };
  }
  return readiness.ok ? { ...readiness, plan } : readiness;
}

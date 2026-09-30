import { ORGAN_IDS, type OrganId } from "@/lib/medical-motion/contracts/organ";
import {
  EVIDENCE_LEVELS,
  MECHANISM_IDS,
  PLAN_SCENE_TYPES,
  SYMPTOM_EXPLANATION_ERROR_CODE,
  type AnatomyStructureId,
  type VideoExplanationPlan,
} from "@/lib/symptom-explanation/contracts";

// The last check before a plan reaches the render layer. Plans can arrive as
// JSON (a background job payload, a stored record), so the input is treated
// as untrusted and validated structurally, not just type-cast.
//
// This validates a plan's shape and internal consistency only. Whether each
// structure id actually exists on the organ's real anatomical asset is the
// anatomy registry's job (a later phase), and a missing structure there must
// fail with ANATOMY_STRUCTURE_NOT_FOUND, never fall back to approximate
// geometry.

export type PlanValidationResult =
  | { ok: true; plan: VideoExplanationPlan }
  | {
      ok: false;
      errorCode:
        | typeof SYMPTOM_EXPLANATION_ERROR_CODE.UNSAFE_FOR_VIDEO_FIRST
        | typeof SYMPTOM_EXPLANATION_ERROR_CODE.INVALID_SCENE_PLAN;
      issues: string[];
    };

type UnknownRecord = Record<string, unknown>;

const PLAN_KEYS = [
  "planVersion",
  "organ",
  "topic",
  "safety",
  "mechanism",
  "anatomy",
  "documentedFindings",
  "scenes",
] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

// Extra fields are rejected, not stripped: a plan carrying something the
// contract has no place for (a "diagnosis", free-form narration, a pathology
// flag) means whatever produced it misbehaved, and it must not reach the
// renderer either quietly kept or quietly removed.
function checkKeys(record: UnknownRecord, allowed: readonly string[], path: string, issues: string[]) {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) {
      issues.push(`${path}: unexpected field "${key}".`);
    }
  }
}

function isStructureOf(organ: OrganId, value: unknown): value is AnatomyStructureId {
  return typeof value === "string" && new RegExp(`^${organ}(\\.[A-Za-z][A-Za-z0-9]*)+$`).test(value);
}

/** A focus or scene target may name one structure or a group prefix of them
 * ("heart.coronary" covers "heart.coronary.lad"). */
function covers(focus: string, structures: readonly string[]): boolean {
  return structures.some((structure) => structure === focus || structure.startsWith(`${focus}.`));
}

function invalid(issues: string[]): PlanValidationResult {
  return { ok: false, errorCode: SYMPTOM_EXPLANATION_ERROR_CODE.INVALID_SCENE_PLAN, issues };
}

export function validateVideoExplanationPlan(value: unknown): PlanValidationResult {
  if (!isRecord(value)) {
    return invalid(["plan: must be an object."]);
  }

  // Checked first and reported with its own code: a plan built for input the
  // safety gate should have blocked is a safety failure, not a format error.
  const safety = value.safety;

  if (!isRecord(safety) || safety.level !== "none") {
    return {
      ok: false,
      errorCode: SYMPTOM_EXPLANATION_ERROR_CODE.UNSAFE_FOR_VIDEO_FIRST,
      issues: ['safety.level: must be "none"; urgent guidance is never replaced by a video.'],
    };
  }

  const issues: string[] = [];

  checkKeys(value, PLAN_KEYS, "plan", issues);
  checkKeys(safety, ["level"], "safety", issues);

  if (value.planVersion !== "1") {
    issues.push('planVersion: must be "1".');
  }

  const organ = value.organ;

  if (!isOneOf(ORGAN_IDS, organ)) {
    // Every structure check below depends on knowing the organ.
    issues.push("organ: unknown organ.");
    return invalid(issues);
  }

  if (!isNonEmptyString(value.topic)) {
    issues.push("topic: required.");
  }

  const mechanism = value.mechanism;

  if (!isRecord(mechanism)) {
    issues.push("mechanism: required.");
  } else {
    checkKeys(mechanism, ["id", "evidence"], "mechanism", issues);

    if (!isOneOf(MECHANISM_IDS, mechanism.id)) {
      issues.push("mechanism.id: unknown mechanism.");
    }

    if (!isOneOf(EVIDENCE_LEVELS, mechanism.evidence)) {
      issues.push('mechanism.evidence: must be "possible" or "documented".');
    }
  }

  const structures: AnatomyStructureId[] = [];
  const anatomy = value.anatomy;

  if (!isRecord(anatomy)) {
    issues.push("anatomy: required.");
  } else {
    checkKeys(anatomy, ["primaryFocus", "structures"], "anatomy", issues);

    if (!Array.isArray(anatomy.structures) || anatomy.structures.length === 0) {
      issues.push("anatomy.structures: at least one structure is required.");
    } else {
      for (const structure of anatomy.structures) {
        if (!isStructureOf(organ, structure)) {
          issues.push(`anatomy.structures: "${String(structure)}" is not a ${organ} structure id.`);
        } else if (structures.includes(structure)) {
          issues.push(`anatomy.structures: "${structure}" is listed twice.`);
        } else {
          structures.push(structure);
        }
      }
    }

    if (!isStructureOf(organ, anatomy.primaryFocus)) {
      issues.push(`anatomy.primaryFocus: must be a ${organ} structure id.`);
    } else if (!covers(anatomy.primaryFocus, structures)) {
      issues.push("anatomy.primaryFocus: does not match any listed structure.");
    }
  }

  const findingIds = new Set<string>();

  if (!Array.isArray(value.documentedFindings)) {
    issues.push("documentedFindings: must be a list (empty when there are none).");
  } else {
    value.documentedFindings.forEach((finding: unknown, index: number) => {
      const path = `documentedFindings[${index}]`;

      if (!isRecord(finding)) {
        issues.push(`${path}: must be an object.`);
        return;
      }

      checkKeys(finding, ["id", "structure", "evidenceRef"], path, issues);

      if (!isNonEmptyString(finding.id)) {
        issues.push(`${path}.id: required.`);
      } else if (findingIds.has(finding.id)) {
        issues.push(`${path}.id: "${finding.id}" is listed twice.`);
      } else {
        findingIds.add(finding.id);
      }

      if (!isStructureOf(organ, finding.structure) || !structures.includes(finding.structure)) {
        issues.push(`${path}.structure: must be one of anatomy.structures.`);
      }

      if (!isNonEmptyString(finding.evidenceRef)) {
        issues.push(`${path}.evidenceRef: required; a finding without evidence can never be shown.`);
      }
    });
  }

  if (!Array.isArray(value.scenes) || value.scenes.length === 0) {
    issues.push("scenes: at least one scene is required.");
  } else {
    value.scenes.forEach((scene: unknown, index: number) => {
      const path = `scenes[${index}]`;

      if (!isRecord(scene) || !isOneOf(PLAN_SCENE_TYPES, scene.type)) {
        issues.push(`${path}.type: unknown scene type.`);
        return;
      }

      if (scene.type === "structureFocus") {
        checkKeys(scene, ["type", "target"], path, issues);

        if (!isStructureOf(organ, scene.target) || !covers(scene.target, structures)) {
          issues.push(`${path}.target: must name a structure or group listed in anatomy.structures.`);
        }
      } else if (scene.type === "findingVisualization") {
        checkKeys(scene, ["type", "findingId"], path, issues);

        if (typeof scene.findingId !== "string" || !findingIds.has(scene.findingId)) {
          issues.push(
            `${path}.findingId: must reference a documented finding; pathology is never shown from symptoms alone.`
          );
        }
      } else {
        checkKeys(scene, ["type"], path, issues);
      }
    });

    const lastScene: unknown = value.scenes[value.scenes.length - 1];

    if (!isRecord(lastScene) || lastScene.type !== "limitationsAndNextSteps") {
      issues.push('scenes: the final scene must be "limitationsAndNextSteps".');
    }
  }

  if (issues.length > 0) {
    return invalid(issues);
  }

  // Every field has been checked and no unexpected field exists, so the
  // untrusted input now matches the contract exactly.
  return { ok: true, plan: value as unknown as VideoExplanationPlan };
}

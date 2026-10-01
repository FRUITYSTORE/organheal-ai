import type { ClinicalUrgencyLevel } from "@/lib/health-intelligence/engines/clinical-urgency.engine";
import type { AnatomyStructureId } from "@/lib/medical-motion/contracts/anatomy";
import type { OrganId } from "@/lib/medical-motion/contracts/organ";
import type { AnatomyRequirements } from "@/lib/medical-motion/contracts/organ-module";

export type { AnatomyStructureId };

// Contracts for the Symptom Explanation Engine: a user's own words about a
// health concern -> safety triage -> a POSSIBLE physiological mechanism ->
// the anatomy that explains it -> a structured video plan the render layer
// executes. This is a personalized clinical explanation, never a diagnosis.
// The shapes below are deliberately narrow so a plan cannot carry a
// diagnosis, or a pathology visual without real evidence, through to
// rendering (see validate-explanation-plan.ts).

/** Structured reading of what the user wrote. Every clinically relevant
 * detail the text does not actually state stays null/empty, never guessed. */
export type SymptomIntake = {
  rawText: string;
  /** Normalized symptom id, e.g. "chest_discomfort". */
  symptom: string | null;
  quality: string | null;
  trigger: string | null;
  relief: string | null;
  associatedSymptoms: readonly string[];
  duration: string | null;
  location: string | null;
};

export type SafetyTriageResult =
  | { allowVideo: true; level: "none" }
  | {
      allowVideo: false;
      level: Exclude<ClinicalUrgencyLevel, "none">;
      /** Guidance to show immediately, taken from the existing clinical
       * urgency engine -- never written by this module. */
      response: string | null;
      matchedSignalIds: readonly string[];
    };

export const MECHANISM_IDS = ["myocardialOxygenDemandSupply", "leftVentricularPressureLoad"] as const;

export type MechanismId = (typeof MECHANISM_IDS)[number];

/** "possible": an educational mechanism consistent with the symptom, not
 * established for this person. "documented": backed by real diagnostic
 * evidence in the member's own records. */
export const EVIDENCE_LEVELS = ["possible", "documented"] as const;

export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export type ClinicalExplanation = {
  organSystems: readonly OrganId[];
  mechanism: { id: MechanismId; evidence: EvidenceLevel };
  /** Clinically relevant details the user has not given yet. */
  missingInformation: readonly string[];
  /** Statements the narration must not make for this case, e.g. naming a
   * disease the member has not been diagnosed with. */
  mustNotClaim: readonly string[];
};

/** A real finding from the member's own records. A pathology visual (plaque,
 * stenosis, hypertrophy...) may only ever be shown for one of these. */
export type DocumentedFinding = {
  id: string;
  structure: AnatomyStructureId;
  /** Where the evidence lives, e.g. a report id. Required and non-empty. */
  evidenceRef: string;
};

export const PLAN_SCENE_TYPES = [
  "organOverview",
  "physiologyIntroduction",
  "structureFocus",
  "mechanismExplanation",
  "findingVisualization",
  "limitationsAndNextSteps",
] as const;

export type PlanSceneType = (typeof PLAN_SCENE_TYPES)[number];

export type PlanScene =
  | { type: "organOverview" }
  | { type: "physiologyIntroduction" }
  | { type: "structureFocus"; target: AnatomyStructureId }
  | { type: "mechanismExplanation" }
  | { type: "findingVisualization"; findingId: string }
  | { type: "limitationsAndNextSteps" };

export type VideoExplanationPlan = {
  planVersion: "1";
  organ: OrganId;
  topic: string;
  /** A plan can only exist for input the safety gate did not block. */
  safety: { level: "none" };
  mechanism: { id: MechanismId; evidence: EvidenceLevel };
  anatomy: {
    primaryFocus: AnatomyStructureId;
    structures: readonly AnatomyStructureId[];
    /** Required anatomical uses; these need not be visually highlighted. */
    requirements: AnatomyRequirements;
  };
  documentedFindings: readonly DocumentedFinding[];
  scenes: readonly PlanScene[];
};

// Pre-render failures only. Render-stage failures (Blender, composition,
// output validation) keep using RENDER_ERROR_CODE from
// lib/medical-motion/contracts/render.ts instead of a second, competing set
// of names for the same failures.
export const SYMPTOM_EXPLANATION_ERROR_CODE = {
  CLINICAL_EXPLANATION_FAILED: "CLINICAL_EXPLANATION_FAILED",
  UNSAFE_FOR_VIDEO_FIRST: "UNSAFE_FOR_VIDEO_FIRST",
  ORGAN_MODULE_NOT_FOUND: "ORGAN_MODULE_NOT_FOUND",
  REAL_ANATOMICAL_ASSET_REQUIRED: "REAL_ANATOMICAL_ASSET_REQUIRED",
  ANATOMY_STRUCTURE_NOT_FOUND: "ANATOMY_STRUCTURE_NOT_FOUND",
  INVALID_SCENE_PLAN: "INVALID_SCENE_PLAN",
} as const;

export type SymptomExplanationErrorCode =
  (typeof SYMPTOM_EXPLANATION_ERROR_CODE)[keyof typeof SYMPTOM_EXPLANATION_ERROR_CODE];

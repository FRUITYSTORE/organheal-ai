import "server-only";

import type {
  HealthKnowledgeAudience,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";

import type {
  PatientSummary,
} from "@/lib/models/patient";

import type {
  HealthIntelligenceResult,
} from "@/lib/health-intelligence/models/health-intelligence-result";

import type {
  ClinicalDecisionResult,
} from "@/lib/clinical-decision/models/clinical-decision-result";

import {
  runClinicalDecisionPipeline,
} from "@/lib/clinical-decision/pipeline/run-clinical-decision-pipeline";

type BuildClinicalDecisionInput = {
  patient:
    PatientSummary;

  language?:
    HealthKnowledgeLanguage;

  audience?:
    HealthKnowledgeAudience;

    prebuiltIntelligence?:
  HealthIntelligenceResult;
};

type ClinicalDecisionStageId =
  | "health-intelligence"
  | "health-passport"
  | "health-timeline"
  | "personalized-knowledge";

function isClinicalDecisionStageId(
  stageId:
    string
): stageId is ClinicalDecisionStageId {
  return (
    stageId ===
      "health-intelligence" ||
    stageId ===
      "health-passport" ||
    stageId ===
      "health-timeline" ||
    stageId ===
      "personalized-knowledge"
  );
}

export async function buildClinicalDecision({
  patient,
  language = "en",
  audience = "general",
  prebuiltIntelligence,
}: BuildClinicalDecisionInput): Promise<ClinicalDecisionResult> {
  const pipelineResult =
  await runClinicalDecisionPipeline({
    patient,
    language,
    audience,
    intelligence:
      prebuiltIntelligence,
  });

  const {
    intelligence,
    knowledge,
    passport,
    timeline,
  } =
    pipelineResult.context;

  if (!intelligence) {
    throw new Error(
      "Clinical decision pipeline did not produce health intelligence."
    );
  }

  if (!knowledge) {
    throw new Error(
      "Clinical decision pipeline did not produce personalized knowledge."
    );
  }

  if (!passport) {
    throw new Error(
      "Clinical decision pipeline did not produce a Health Passport."
    );
  }

  if (!timeline) {
    throw new Error(
      "Clinical decision pipeline did not produce a Health Timeline."
    );
  }

  const completedStages =
    pipelineResult.executions
      .filter(
        (execution) =>
          execution.status ===
          "completed"
      )
      .map(
        (execution) =>
          execution.stageId
      )
      .filter(
        isClinicalDecisionStageId
      );

  const isComplete =
    pipelineResult.successful &&
    completedStages.length === 4;

  return {
    intelligence,

    knowledge,

    passport,

    timeline,

    metadata: {
      status:
        isComplete
          ? "ready"
          : "partial",

      completedStages,

      generatedAt:
        pipelineResult.completedAt,
    },
  };
}
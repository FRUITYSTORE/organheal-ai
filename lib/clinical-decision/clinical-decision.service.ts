import "server-only";

import type {
  HealthKnowledgeAudience,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";
import type { PatientSummary } from "@/lib/models/patient";
import type { ClinicalDecisionResult } from "@/lib/clinical-decision/models/clinical-decision-result";

import { runClinicalDecisionPipeline } from "@/lib/clinical-decision/pipeline/run-clinical-decision-pipeline";

type BuildClinicalDecisionInput = {
  patient: PatientSummary;
  language?: HealthKnowledgeLanguage;
  audience?: HealthKnowledgeAudience;
};

export async function buildClinicalDecision({
  patient,
  language = "en",
  audience = "general",
}: BuildClinicalDecisionInput): Promise<ClinicalDecisionResult> {
  const pipelineResult =
    await runClinicalDecisionPipeline({
      patient,
      language,
      audience,
    });

  const { intelligence, knowledge } =
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

  const completedStages =
    pipelineResult.executions
      .filter(
        (execution) =>
          execution.status === "completed"
      )
      .map((execution) => execution.stageId)
      .filter(
        (
          stageId
        ): stageId is
          | "health-intelligence"
          | "personalized-knowledge" =>
          stageId === "health-intelligence" ||
          stageId === "personalized-knowledge"
      );

  return {
    intelligence,
    knowledge,
    metadata: {
      status: pipelineResult.successful
        ? completedStages.length === 2
          ? "ready"
          : "partial"
        : "partial",

      completedStages,

      generatedAt:
        pipelineResult.completedAt,
    },
  };
}
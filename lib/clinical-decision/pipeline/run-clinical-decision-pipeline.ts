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

import {
  createClinicalDecisionContext,
  type ClinicalDecisionContext,
} from "@/lib/clinical-decision/pipeline/clinical-decision-context";

import {
  ClinicalDecisionPipeline,
  type ClinicalDecisionPipelineResult,
} from "@/lib/clinical-decision/pipeline/clinical-decision-pipeline";

import {
  healthIntelligenceStage,
} from "@/lib/clinical-decision/pipeline/stages/health-intelligence.stage";

import {
  healthPassportStage,
} from "@/lib/clinical-decision/pipeline/stages/health-passport.stage";

import {
  healthTimelineStage,
} from "@/lib/clinical-decision/pipeline/stages/health-timeline.stage";

import {
  personalizedKnowledgeStage,
} from "@/lib/clinical-decision/pipeline/stages/personalized-knowledge.stage";

type RunClinicalDecisionPipelineInput = {
  patient:
    PatientSummary;

  language?:
    HealthKnowledgeLanguage;

  audience?:
    HealthKnowledgeAudience;

  stopOnFailure?:
    boolean;

  intelligence?:
    HealthIntelligenceResult;
};

function createPipeline(
  stopOnFailure =
    true
) {
  return new ClinicalDecisionPipeline<ClinicalDecisionContext>({
    stopOnFailure,
  })
    .addStage(
      healthIntelligenceStage
    )
    .addStage(
      healthPassportStage
    )
    .addStage(
      healthTimelineStage
    )
    .addStage(
      personalizedKnowledgeStage
    );
}

export async function runClinicalDecisionPipeline({
  patient,
  language = "en",
  audience = "general",
  stopOnFailure = true,
  intelligence,
}: RunClinicalDecisionPipelineInput): Promise<
  ClinicalDecisionPipelineResult<ClinicalDecisionContext>
> {
  const initialContext =
    createClinicalDecisionContext(
      patient,
      language,
      audience,
      intelligence ?? null
    );

  const pipeline =
    createPipeline(
      stopOnFailure
    );

  return pipeline.run(
    initialContext
  );
}
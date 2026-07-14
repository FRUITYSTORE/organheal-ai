import "server-only";
import { healthPassportStage } from "@/lib/clinical-decision/pipeline/stages/health-passport.stage";
import { healthTimelineStage } from "@/lib/clinical-decision/pipeline/stages/health-timeline.stage";
import type {
  HealthKnowledgeAudience,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";
import type { PatientSummary } from "@/lib/models/patient";

import {
  createClinicalDecisionContext,
  type ClinicalDecisionContext,
} from "@/lib/clinical-decision/pipeline/clinical-decision-context";
import {
  ClinicalDecisionPipeline,
  type ClinicalDecisionPipelineResult,
} from "@/lib/clinical-decision/pipeline/clinical-decision-pipeline";
import { healthIntelligenceStage } from "@/lib/clinical-decision/pipeline/stages/health-intelligence.stage";
import { personalizedKnowledgeStage } from "@/lib/clinical-decision/pipeline/stages/personalized-knowledge.stage";

type RunClinicalDecisionPipelineInput = {
  patient: PatientSummary;
  language?: HealthKnowledgeLanguage;
  audience?: HealthKnowledgeAudience;
  stopOnFailure?: boolean;
};

function createPipeline(
  stopOnFailure = true
) {
  return new ClinicalDecisionPipeline<ClinicalDecisionContext>({
  stopOnFailure,
})
  .addStage(healthIntelligenceStage)
  .addStage(healthPassportStage)
  .addStage(healthTimelineStage)
  .addStage(personalizedKnowledgeStage);
}

export async function runClinicalDecisionPipeline({
  patient,
  language = "en",
  audience = "general",
  stopOnFailure = true,
}: RunClinicalDecisionPipelineInput): Promise<
  ClinicalDecisionPipelineResult<ClinicalDecisionContext>
> {
  const initialContext =
    createClinicalDecisionContext(
      patient,
      language,
      audience
    );

  const pipeline =
    createPipeline(stopOnFailure);

  return pipeline.run(initialContext);
}
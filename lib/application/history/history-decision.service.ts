import "server-only";

import type {
  HealthKnowledgeAudience,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";
import type { PatientSummary } from "@/lib/models/patient";

import { buildClinicalDecision } from "@/lib/clinical-decision/clinical-decision.service";

export type GetHistoryDecisionInput = {
  patient: PatientSummary;
  language?: HealthKnowledgeLanguage;
  audience?: HealthKnowledgeAudience;
};

export type HistoryDecisionResult = {
  timeline: Awaited<
    ReturnType<typeof buildClinicalDecision>
  >["timeline"];

  passport: Awaited<
    ReturnType<typeof buildClinicalDecision>
  >["passport"];

  knowledge: Awaited<
    ReturnType<typeof buildClinicalDecision>
  >["knowledge"];

  pipeline: {
    status: Awaited<
      ReturnType<typeof buildClinicalDecision>
    >["metadata"]["status"];

    completedStages: Awaited<
      ReturnType<typeof buildClinicalDecision>
    >["metadata"]["completedStages"];

    generatedAt: string;
  };
};

export async function getHistoryDecision({
  patient,
  language = "en",
  audience = "general",
}: GetHistoryDecisionInput): Promise<HistoryDecisionResult> {
  const decision = await buildClinicalDecision({
    patient,
    language,
    audience,
  });

  return {
    timeline: decision.timeline,
    passport: decision.passport,
    knowledge: decision.knowledge,

    pipeline: {
      status: decision.metadata.status,
      completedStages:
        decision.metadata.completedStages,
      generatedAt:
        decision.metadata.generatedAt,
    },
  };
}
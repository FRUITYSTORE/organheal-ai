import "server-only";

import type {
  HealthKnowledgeAudience,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";
import type { PatientSummary } from "@/lib/models/patient";

import { buildClinicalDecision } from "@/lib/clinical-decision/clinical-decision.service";

export type GetDashboardDecisionInput = {
  patient: PatientSummary;
  language?: HealthKnowledgeLanguage;
  audience?: HealthKnowledgeAudience;
};

export type DashboardDecisionResult = {
  intelligence: Awaited<
    ReturnType<typeof buildClinicalDecision>
  >["intelligence"];

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

export async function getDashboardDecision({
  patient,
  language = "en",
  audience = "general",
}: GetDashboardDecisionInput): Promise<DashboardDecisionResult> {
  const decision = await buildClinicalDecision({
    patient,
    language,
    audience,
  });

  return {
    intelligence: decision.intelligence,
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
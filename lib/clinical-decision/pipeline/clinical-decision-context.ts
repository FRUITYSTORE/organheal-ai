import type { PatientSummary } from "@/lib/models/patient";

import type { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

import type { PersonalizedKnowledgeRecommendations } from "@/lib/services/knowledge/knowledge-recommendation.service";

export type ClinicalDecisionContext = {
  patient: PatientSummary;

  intelligence: HealthIntelligenceResult | null;

  knowledge: PersonalizedKnowledgeRecommendations | null;

  metadata: {
    language: "en" | "ar";

    audience: string;

    generatedAt: string;
  };
};

export function createClinicalDecisionContext(
  patient: PatientSummary,
  language: "en" | "ar" = "en",
  audience = "general"
): ClinicalDecisionContext {
  return {
    patient,

    intelligence: null,

    knowledge: null,

    metadata: {
      language,

      audience,

      generatedAt: new Date().toISOString(),
    },
  };
}
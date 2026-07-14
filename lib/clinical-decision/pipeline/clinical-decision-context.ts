import type { PatientSummary } from "@/lib/models/patient";

import type { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

import type { PersonalizedKnowledgeRecommendations } from "@/lib/services/knowledge/knowledge-recommendation.service";
import type { PassportModuleResult } from "@/lib/modules/passport";

export type ClinicalDecisionContext = {
  patient: PatientSummary;

  intelligence: HealthIntelligenceResult | null;

  knowledge: PersonalizedKnowledgeRecommendations | null;

  passport: PassportModuleResult | null;

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

    passport: null,
    
    metadata: {
      language,

      audience,

      generatedAt: new Date().toISOString(),
    },
  };
}
import type { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";
import type { PersonalizedKnowledgeRecommendations } from "@/lib/services/knowledge/knowledge-recommendation.service";
import type { PassportModuleResult } from "@/lib/modules/passport";

export type ClinicalDecisionPipelineStatus =
  | "ready"
  | "partial"
  | "insufficient-data";

export type ClinicalDecisionPipelineStage =
  | "health-intelligence"
  | "health-passport"
  | "personalized-knowledge";

export type ClinicalDecisionPipelineMetadata = {
  status: ClinicalDecisionPipelineStatus;
  completedStages: ClinicalDecisionPipelineStage[];
  generatedAt: string;
};

export type ClinicalDecisionResult = {
  intelligence: HealthIntelligenceResult;
  knowledge: PersonalizedKnowledgeRecommendations;
  passport: PassportModuleResult;
  metadata: ClinicalDecisionPipelineMetadata;
};
import type { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";
import type { PersonalizedKnowledgeRecommendations } from "@/lib/services/knowledge/knowledge-recommendation.service";
import type { PassportModuleResult } from "@/lib/modules/passport";
import type { TimelineModuleResult } from "@/lib/modules/timeline";

export type ClinicalDecisionPipelineStatus =
  | "ready"
  | "partial"
  | "insufficient-data";

export type ClinicalDecisionPipelineStage =
  | "health-intelligence"
  | "health-passport"
  | "health-timeline"
  | "personalized-knowledge";

export type ClinicalDecisionPipelineMetadata = {
  status: ClinicalDecisionPipelineStatus;
  completedStages: ClinicalDecisionPipelineStage[];
  generatedAt: string;
};

export type ClinicalDecisionResult = {
  intelligence: HealthIntelligenceResult;
  passport: PassportModuleResult;
  timeline: TimelineModuleResult;
  knowledge: PersonalizedKnowledgeRecommendations;
  metadata: ClinicalDecisionPipelineMetadata;
};
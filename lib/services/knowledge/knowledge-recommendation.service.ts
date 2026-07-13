import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";
import { knowledgeAssetCatalog } from "@/lib/health-knowledge/catalog/knowledge-asset.catalog";
import { knowledgeCatalog } from "@/lib/health-knowledge/catalog/knowledge.catalog";
import { recommendHealthKnowledge } from "@/lib/health-knowledge/engines/health-knowledge.engine";
import { recommendKnowledgeAssets } from "@/lib/health-knowledge/engines/knowledge-asset-recommendation.engine";
import {
  HealthKnowledgeAudience,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";
import {
  getKnowledgeGraphsForAssets,
  KnowledgeAssetGraph,
} from "@/lib/services/knowledge/knowledge-graph.service";

type GetKnowledgeRecommendationsInput = {
  intelligence: HealthIntelligenceResult;
  language: HealthKnowledgeLanguage;
  audience?: HealthKnowledgeAudience;
};

export type PersonalizedKnowledgeRecommendations = {
  assetRecommendations: ReturnType<
    typeof recommendKnowledgeAssets
  >;

  contentRecommendations: ReturnType<
    typeof recommendHealthKnowledge
  >;

  assetGraphs: KnowledgeAssetGraph[];

  primaryGraph: KnowledgeAssetGraph | null;
};

export function getPersonalizedKnowledgeRecommendations({
  intelligence,
  language,
  audience,
}: GetKnowledgeRecommendationsInput): PersonalizedKnowledgeRecommendations {
  const priorityOrgan =
    intelligence.priority.data.priorityOrgan;

  const riskLevel =
    intelligence.priority.data.riskLevel;

  const primaryPattern =
    intelligence.patterns.data.primaryPattern;

  const primaryRecommendation =
    intelligence.recommendations.data.primaryAction;

  const assetRecommendations =
    recommendKnowledgeAssets({
      assets: knowledgeAssetCatalog,
      priorityOrgan,
      riskLevel,
      primaryPattern,
      trend: intelligence.trend,
      primaryRecommendation,
    });

  const recommendedAssets =
    assetRecommendations.data.recommendations.map(
      (recommendation) => recommendation.asset
    );

  const assetGraphs = getKnowledgeGraphsForAssets(
    recommendedAssets,
    language
  );

  const contentRecommendations =
    recommendHealthKnowledge({
      items: knowledgeCatalog,
      language,
      audience,
      priorityOrgan,
      riskLevel,
      primaryPattern,
      trend: intelligence.trend,
      primaryRecommendation,
    });

  return {
    assetRecommendations,
    contentRecommendations,
    assetGraphs,
    primaryGraph: assetGraphs[0] ?? null,
  };
}
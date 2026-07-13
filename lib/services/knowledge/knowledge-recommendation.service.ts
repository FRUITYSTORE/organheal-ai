import "server-only";

import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";
import { knowledgeAssetCatalog } from "@/lib/health-knowledge/catalog/knowledge-asset.catalog";
import { recommendHealthKnowledge } from "@/lib/health-knowledge/engines/health-knowledge.engine";
import { recommendKnowledgeAssets } from "@/lib/health-knowledge/engines/knowledge-asset-recommendation.engine";
import {
  HealthKnowledgeAudience,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";
import { KnowledgePack } from "@/lib/health-knowledge/models/knowledge-pack";
import { getPublishedRegisteredKnowledgeItems } from "@/lib/services/knowledge/content-registry.service";
import {
  getKnowledgeGraphsForAssets,
  KnowledgeAssetGraph,
} from "@/lib/services/knowledge/knowledge-graph.service";
import { getKnowledgePackByOrgan } from "@/lib/services/knowledge/knowledge-pack.service";
import {
  buildKnowledgeExplanation,
  KnowledgeExplanation,
} from "@/lib/services/knowledge/knowledge-explanation.service";

type GetKnowledgeRecommendationsInput = {
  intelligence: HealthIntelligenceResult;
  language: HealthKnowledgeLanguage;
  audience?: HealthKnowledgeAudience;
};

export type PersonalizedKnowledgeRecommendations = {
  recommendedPack: KnowledgePack | null;
intelligenceExplanation: KnowledgeExplanation;
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

  const registeredItems =
    getPublishedRegisteredKnowledgeItems();

  const recommendedPack = priorityOrgan
    ? getKnowledgePackByOrgan(priorityOrgan)
    : null;

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
      items: registeredItems,
      language,
      audience,
      priorityOrgan,
      riskLevel,
      primaryPattern,
      trend: intelligence.trend,
      primaryRecommendation,
    });

  return {
    intelligenceExplanation:
  buildKnowledgeExplanation(
    intelligence
  ),
    recommendedPack,
    assetRecommendations,
    contentRecommendations,
    assetGraphs,
    primaryGraph: assetGraphs[0] ?? null,
  };
}
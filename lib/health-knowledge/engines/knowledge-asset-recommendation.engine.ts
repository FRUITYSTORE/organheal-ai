import { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import { HealthPattern } from "@/lib/health-intelligence/engines/health-pattern.engine";
import {
  HealthTrendData,
  TrendDirection,
} from "@/lib/health-intelligence/engines/trend.engine";
import { HealthRecommendation } from "@/lib/health-intelligence/engines/recommendation.engine";
import { KnowledgeAsset } from "@/lib/health-knowledge/models/knowledge-asset";

export type KnowledgeAssetMatchReason =
  | "priority-organ"
  | "health-pattern"
  | "health-trend"
  | "risk-level"
  | "recommended-action"
  | "related-topic";

export type RecommendedKnowledgeAsset = {
  asset: KnowledgeAsset;
  score: number;
  reasons: KnowledgeAssetMatchReason[];
  explanation: string;
};

export type KnowledgeAssetRecommendationData = {
  primaryAsset: RecommendedKnowledgeAsset | null;
  recommendations: RecommendedKnowledgeAsset[];
  totalMatches: number;
  summary: string;
};

type BuildKnowledgeAssetRecommendationsInput = {
  assets: KnowledgeAsset[];

  priorityOrgan: string | null;
  riskLevel: "low" | "moderate" | "high" | "unknown";

  primaryPattern: HealthPattern | null;
  trend: EngineResult<HealthTrendData>;

  primaryRecommendation: HealthRecommendation;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function includesNormalized(
  values: string[],
  target?: string | null
) {
  if (!target) return false;

  const normalizedTarget = normalize(target);

  return values.some(
    (value) => normalize(value) === normalizedTarget
  );
}

function getTrendTopics(direction: TrendDirection) {
  switch (direction) {
    case "improving":
      return ["improvement", "maintenance", "prevention"];

    case "worsening":
      return ["decline", "follow-up", "risk"];

    case "stable":
      return ["stable", "maintenance", "prevention"];

    default:
      return [];
  }
}

function calculateAssetMatch({
  asset,
  priorityOrgan,
  riskLevel,
  primaryPattern,
  trend,
  primaryRecommendation,
}: Omit<BuildKnowledgeAssetRecommendationsInput, "assets"> & {
  asset: KnowledgeAsset;
}): RecommendedKnowledgeAsset {
  let score = 0;
  const reasons: KnowledgeAssetMatchReason[] = [];

  if (
    priorityOrgan &&
    includesNormalized(asset.organTags, priorityOrgan)
  ) {
    score += 40;
    reasons.push("priority-organ");
  }

  if (
    primaryPattern &&
    (
      includesNormalized(
        asset.topicTags,
        primaryPattern.type
      ) ||
      includesNormalized(
        asset.conditionTags,
        primaryPattern.type
      )
    )
  ) {
    score += 30;
    reasons.push("health-pattern");
  }

  const trendTopics = getTrendTopics(
    trend.data.direction
  );

  if (
    trendTopics.some((topic) =>
      includesNormalized(asset.topicTags, topic)
    )
  ) {
    score += 20;
    reasons.push("health-trend");
  }

  if (
    includesNormalized(asset.topicTags, riskLevel) ||
    includesNormalized(asset.conditionTags, riskLevel)
  ) {
    score += 18;
    reasons.push("risk-level");
  }

  if (
    includesNormalized(
      asset.topicTags,
      primaryRecommendation.category
    )
  ) {
    score += 16;
    reasons.push("recommended-action");
  }

  if (
    primaryPattern?.organ &&
    includesNormalized(
      asset.organTags,
      primaryPattern.organ
    )
  ) {
    score += 10;
    reasons.push("related-topic");
  }

  return {
    asset,
    score,
    reasons,
    explanation:
      reasons.length > 0
        ? `Matched using ${reasons.length} personalized health signal${
            reasons.length === 1 ? "" : "s"
          }.`
        : "General health knowledge asset.",
  };
}

export function recommendKnowledgeAssets({
  assets,
  priorityOrgan,
  riskLevel,
  primaryPattern,
  trend,
  primaryRecommendation,
}: BuildKnowledgeAssetRecommendationsInput): EngineResult<KnowledgeAssetRecommendationData> {
  const recommendations = assets
    .filter((asset) => asset.active)
    .map((asset) =>
      calculateAssetMatch({
        asset,
        priorityOrgan,
        riskLevel,
        primaryPattern,
        trend,
        primaryRecommendation,
      })
    )
    .filter((recommendation) => recommendation.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  if (recommendations.length === 0) {
    return {
      status: "insufficient-data",
      confidence: 0,
      generatedAt: new Date().toISOString(),
      data: {
        primaryAsset: null,
        recommendations: [],
        totalMatches: 0,
        summary:
          "No suitable knowledge assets are currently available.",
      },
    };
  }

  const matchedSignalCount = new Set(
    recommendations.flatMap(
      (recommendation) => recommendation.reasons
    )
  ).size;

  const confidence = Math.min(
    100,
    Math.round(
      recommendations[0].score * 0.75 +
        matchedSignalCount * 4
    )
  );

  return {
    status: "ready",
    confidence,
    generatedAt: new Date().toISOString(),
    data: {
      primaryAsset: recommendations[0] ?? null,
      recommendations,
      totalMatches: recommendations.length,
      summary: `${recommendations.length} knowledge asset${
        recommendations.length === 1 ? " was" : "s were"
      } matched to the current health intelligence.`,
    },
  };
}
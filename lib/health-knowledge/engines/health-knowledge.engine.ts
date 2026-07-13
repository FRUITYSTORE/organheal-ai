import { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import { HealthPattern } from "@/lib/health-intelligence/engines/health-pattern.engine";
import {
  HealthTrendData,
  TrendDirection,
} from "@/lib/health-intelligence/engines/trend.engine";
import { HealthRecommendation } from "@/lib/health-intelligence/engines/recommendation.engine";
import {
  HealthKnowledgeAudience,
  HealthKnowledgeContentType,
  HealthKnowledgeItem,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";

export type HealthKnowledgeMatchReason =
  | "priority-organ"
  | "health-pattern"
  | "health-trend"
  | "current-risk"
  | "recommended-action"
  | "preferred-audience"
  | "preferred-language"
  | "featured-content";

export type RecommendedKnowledgeItem = {
  item: HealthKnowledgeItem;
  score: number;
  reasons: HealthKnowledgeMatchReason[];
  explanation: string;
};

export type HealthKnowledgeRecommendationData = {
  featuredItem: RecommendedKnowledgeItem | null;
  recommendations: RecommendedKnowledgeItem[];

  articles: RecommendedKnowledgeItem[];
  videos: RecommendedKnowledgeItem[];
  quickLearning: RecommendedKnowledgeItem[];
  familyContent: RecommendedKnowledgeItem[];
  researchUpdates: RecommendedKnowledgeItem[];

  totalMatches: number;
  summary: string;
};

type BuildHealthKnowledgeInput = {
  items: HealthKnowledgeItem[];

  language: HealthKnowledgeLanguage;
  audience?: HealthKnowledgeAudience;

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

function getTrendTags(direction: TrendDirection) {
  switch (direction) {
    case "improving":
      return ["improving", "maintenance", "prevention"];

    case "worsening":
      return ["worsening", "follow-up", "risk"];

    case "stable":
      return ["stable", "maintenance", "prevention"];

    default:
      return [];
  }
}

function calculateMatch({
  item,
  language,
  audience,
  priorityOrgan,
  riskLevel,
  primaryPattern,
  trend,
  primaryRecommendation,
}: Omit<BuildHealthKnowledgeInput, "items"> & {
  item: HealthKnowledgeItem;
}): RecommendedKnowledgeItem {
  let score = 0;
  const reasons: HealthKnowledgeMatchReason[] = [];

  if (item.language === language) {
    score += 10;
    reasons.push("preferred-language");
  }

  if (
    audience &&
    item.audiences.includes(audience)
  ) {
    score += 12;
    reasons.push("preferred-audience");
  }

  if (
    priorityOrgan &&
    includesNormalized(item.organTags, priorityOrgan)
  ) {
    score += 35;
    reasons.push("priority-organ");
  }

  if (
    primaryPattern &&
    includesNormalized(
      item.patternTags,
      primaryPattern.type
    )
  ) {
    score += 28;
    reasons.push("health-pattern");
  }

  const trendTags = getTrendTags(
    trend.data.direction
  );

  if (
    trendTags.some((tag) =>
      includesNormalized(item.topicTags, tag)
    )
  ) {
    score += 18;
    reasons.push("health-trend");
  }

  if (
    includesNormalized(item.riskTags, riskLevel)
  ) {
    score += 18;
    reasons.push("current-risk");
  }

  if (
    includesNormalized(
      item.recommendationTags,
      primaryRecommendation.category
    ) ||
    includesNormalized(
      item.topicTags,
      primaryRecommendation.category
    )
  ) {
    score += 16;
    reasons.push("recommended-action");
  }

  if (item.featured) {
    score += 5;
    reasons.push("featured-content");
  }

  const explanation =
    reasons.length > 0
      ? `Matched using ${reasons.length} personalized health signal${
          reasons.length === 1 ? "" : "s"
        }.`
      : "General educational content.";

  return {
    item,
    score,
    reasons,
    explanation,
  };
}

function filterByType(
  recommendations: RecommendedKnowledgeItem[],
  types: HealthKnowledgeContentType[]
) {
  return recommendations.filter((recommendation) =>
    types.includes(recommendation.item.type)
  );
}

export function recommendHealthKnowledge({
  items,
  language,
  audience,
  priorityOrgan,
  riskLevel,
  primaryPattern,
  trend,
  primaryRecommendation,
}: BuildHealthKnowledgeInput): EngineResult<HealthKnowledgeRecommendationData> {
  const availableItems = items.filter(
    (item) =>
      item.active &&
      item.language === language &&
      (!item.expiresAt ||
        new Date(item.expiresAt).getTime() >
          Date.now())
  );

  const recommendations = availableItems
    .map((item) =>
      calculateMatch({
        item,
        language,
        audience,
        priorityOrgan,
        riskLevel,
        primaryPattern,
        trend,
        primaryRecommendation,
      })
    )
    .filter((recommendation) => recommendation.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  if (recommendations.length === 0) {
    return {
      status: "insufficient-data",
      confidence: 0,
      generatedAt: new Date().toISOString(),
      data: {
        featuredItem: null,
        recommendations: [],
        articles: [],
        videos: [],
        quickLearning: [],
        familyContent: [],
        researchUpdates: [],
        totalMatches: 0,
        summary:
          "No suitable health learning content is currently available.",
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
      recommendations[0].score * 0.7 +
        matchedSignalCount * 5
    )
  );

  return {
    status: "ready",
    confidence,
    generatedAt: new Date().toISOString(),
    data: {
      featuredItem: recommendations[0] ?? null,
      recommendations,

      articles: filterByType(recommendations, ["article"]),

      videos: filterByType(recommendations, ["video"]),

      quickLearning: filterByType(recommendations, [
        "health-minute",
        "daily-fact",
        "myth-vs-fact",
      ]),

      familyContent: filterByType(recommendations, [
        "family-guide",
      ]),

      researchUpdates: filterByType(recommendations, [
        "research-update",
      ]),

      totalMatches: recommendations.length,

      summary: `${recommendations.length} personalized health learning item${
        recommendations.length === 1 ? " was" : "s were"
      } matched to the current health profile.`,
    },
  };
}
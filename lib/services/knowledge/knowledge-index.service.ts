import "server-only";

import { getContentRegistry } from "@/lib/services/knowledge/content-registry.service";
import { HealthKnowledgeItem } from "@/lib/health-knowledge/models/knowledge-item";

export type KnowledgeIndexEntry = {
  id: string;
  slug: string;
  type: HealthKnowledgeItem["type"];
  language: HealthKnowledgeItem["language"];

  organTags: string[];
  topicTags: string[];
  patternTags: string[];
  riskTags: string[];
  recommendationTags: string[];

  featured: boolean;
  active: boolean;

  publishedAt: string;
  reviewedAt: string;
};

let cachedIndex: KnowledgeIndexEntry[] | null = null;

function buildIndex(): KnowledgeIndexEntry[] {
  const registry = getContentRegistry(true);

  return registry.knowledgeItems
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      type: item.type,
      language: item.language,

      organTags: item.organTags,
      topicTags: item.topicTags,
      patternTags: item.patternTags,
      riskTags: item.riskTags,
      recommendationTags: item.recommendationTags,

      featured: item.featured,
      active: item.active,

      publishedAt: item.publishedAt,
      reviewedAt: item.reviewedAt,
    }))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() -
        new Date(a.publishedAt).getTime()
    );
}

export function getKnowledgeIndex(
  forceRefresh = false
): KnowledgeIndexEntry[] {
  if (!cachedIndex || forceRefresh) {
    cachedIndex = buildIndex();
  }

  return [...cachedIndex];
}

export function refreshKnowledgeIndex() {
  cachedIndex = buildIndex();

  return [...cachedIndex];
}
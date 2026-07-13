import "server-only";

import {
  getKnowledgeIndex,
  KnowledgeIndexEntry,
} from "@/lib/services/knowledge/knowledge-index.service";
import {
  HealthKnowledgeContentType,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";

export type KnowledgeIndexQuery = {
  language?: HealthKnowledgeLanguage;
  types?: HealthKnowledgeContentType[];

  organTags?: string[];
  topicTags?: string[];
  patternTags?: string[];
  riskTags?: string[];
  recommendationTags?: string[];

  featuredOnly?: boolean;
  activeOnly?: boolean;

  publishedAfter?: string;
  reviewedAfter?: string;

  limit?: number;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function includesAnyTag(
  entryTags: string[],
  requestedTags?: string[]
) {
  if (!requestedTags?.length) {
    return true;
  }

  const normalizedEntryTags = new Set(
    entryTags.map(normalize)
  );

  return requestedTags.some((tag) =>
    normalizedEntryTags.has(normalize(tag))
  );
}

function isOnOrAfter(
  value: string,
  minimum?: string
) {
  if (!minimum) {
    return true;
  }

  const valueTime = new Date(value).getTime();
  const minimumTime = new Date(minimum).getTime();

  if (
    Number.isNaN(valueTime) ||
    Number.isNaN(minimumTime)
  ) {
    return false;
  }

  return valueTime >= minimumTime;
}

function calculateRelevanceScore(
  entry: KnowledgeIndexEntry,
  query: KnowledgeIndexQuery
) {
  let score = 0;

  if (
    query.organTags?.some((tag) =>
      includesAnyTag(entry.organTags, [tag])
    )
  ) {
    score += 40;
  }

  if (
    query.patternTags?.some((tag) =>
      includesAnyTag(entry.patternTags, [tag])
    )
  ) {
    score += 30;
  }

  if (
    query.riskTags?.some((tag) =>
      includesAnyTag(entry.riskTags, [tag])
    )
  ) {
    score += 20;
  }

  if (
    query.recommendationTags?.some((tag) =>
      includesAnyTag(entry.recommendationTags, [tag])
    )
  ) {
    score += 18;
  }

  if (
    query.topicTags?.some((tag) =>
      includesAnyTag(entry.topicTags, [tag])
    )
  ) {
    score += 15;
  }

  if (entry.featured) {
    score += 5;
  }

  return score;
}

export function queryKnowledgeIndex(
  query: KnowledgeIndexQuery = {}
): KnowledgeIndexEntry[] {
  const {
    language,
    types,

    organTags,
    topicTags,
    patternTags,
    riskTags,
    recommendationTags,

    featuredOnly = false,
    activeOnly = true,

    publishedAfter,
    reviewedAfter,

    limit = 50,
  } = query;

  return getKnowledgeIndex()
    .filter((entry) => {
      if (activeOnly && !entry.active) {
        return false;
      }

      if (
        language &&
        entry.language !== language
      ) {
        return false;
      }

      if (
        types?.length &&
        !types.includes(entry.type)
      ) {
        return false;
      }

      if (featuredOnly && !entry.featured) {
        return false;
      }

      if (
        !includesAnyTag(
          entry.organTags,
          organTags
        )
      ) {
        return false;
      }

      if (
        !includesAnyTag(
          entry.topicTags,
          topicTags
        )
      ) {
        return false;
      }

      if (
        !includesAnyTag(
          entry.patternTags,
          patternTags
        )
      ) {
        return false;
      }

      if (
        !includesAnyTag(
          entry.riskTags,
          riskTags
        )
      ) {
        return false;
      }

      if (
        !includesAnyTag(
          entry.recommendationTags,
          recommendationTags
        )
      ) {
        return false;
      }

      if (
        !isOnOrAfter(
          entry.publishedAt,
          publishedAfter
        )
      ) {
        return false;
      }

      if (
        !isOnOrAfter(
          entry.reviewedAt,
          reviewedAfter
        )
      ) {
        return false;
      }

      return true;
    })
    .map((entry) => ({
      entry,
      relevanceScore: calculateRelevanceScore(
        entry,
        query
      ),
    }))
    .sort((a, b) => {
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      return (
        new Date(b.entry.publishedAt).getTime() -
        new Date(a.entry.publishedAt).getTime()
      );
    })
    .slice(0, Math.max(0, limit))
    .map(({ entry }) => entry);
}

export function getKnowledgeIndexEntryById(
  id: string
): KnowledgeIndexEntry | null {
  const normalizedId = normalize(id);

  return (
    getKnowledgeIndex().find(
      (entry) =>
        normalize(entry.id) === normalizedId
    ) ?? null
  );
}

export function getKnowledgeIndexEntryBySlug(
  slug: string,
  language?: HealthKnowledgeLanguage
): KnowledgeIndexEntry | null {
  const normalizedSlug = normalize(slug);

  return (
    getKnowledgeIndex().find(
      (entry) =>
        normalize(entry.slug) === normalizedSlug &&
        (!language || entry.language === language)
    ) ?? null
  );
}
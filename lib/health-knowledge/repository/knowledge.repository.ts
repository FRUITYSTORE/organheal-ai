import {
  HealthKnowledgeAudience,
  HealthKnowledgeContentType,
  HealthKnowledgeEvidenceLevel,
  HealthKnowledgeItem,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";

export type KnowledgeRepositoryFilters = {
  language?: HealthKnowledgeLanguage;
  types?: HealthKnowledgeContentType[];
  audiences?: HealthKnowledgeAudience[];

  organTags?: string[];
  topicTags?: string[];
  riskTags?: string[];
  patternTags?: string[];
  recommendationTags?: string[];

  evidenceLevels?: HealthKnowledgeEvidenceLevel[];

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
  itemTags: string[],
  requestedTags?: string[]
) {
  if (!requestedTags?.length) return true;

  const normalizedItemTags = new Set(
    itemTags.map(normalize)
  );

  return requestedTags.some((tag) =>
    normalizedItemTags.has(normalize(tag))
  );
}

function includesAnyAudience(
  itemAudiences: HealthKnowledgeAudience[],
  requestedAudiences?: HealthKnowledgeAudience[]
) {
  if (!requestedAudiences?.length) return true;

  return requestedAudiences.some((audience) =>
    itemAudiences.includes(audience)
  );
}

function hasValidDate(
  value?: string | null
) {
  if (!value) return false;

  return !Number.isNaN(new Date(value).getTime());
}

function isNotExpired(item: HealthKnowledgeItem) {
  if (!item.expiresAt) return true;
  if (!hasValidDate(item.expiresAt)) return false;

  return new Date(item.expiresAt).getTime() > Date.now();
}

function isOnOrAfter(
  value: string,
  minimum?: string
) {
  if (!minimum) return true;

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

function sortByRecency(
  items: HealthKnowledgeItem[]
) {
  return [...items].sort((a, b) => {
    if (a.featured !== b.featured) {
      return a.featured ? -1 : 1;
    }

    return (
      new Date(b.publishedAt).getTime() -
      new Date(a.publishedAt).getTime()
    );
  });
}

export function filterKnowledgeItems(
  items: HealthKnowledgeItem[],
  filters: KnowledgeRepositoryFilters = {}
): HealthKnowledgeItem[] {
  const {
    language,
    types,
    audiences,

    organTags,
    topicTags,
    riskTags,
    patternTags,
    recommendationTags,

    evidenceLevels,

    featuredOnly = false,
    activeOnly = true,

    publishedAfter,
    reviewedAfter,

    limit = 50,
  } = filters;

  const filtered = items.filter((item) => {
    if (activeOnly && !item.active) return false;
    if (!isNotExpired(item)) return false;

    if (
      language &&
      item.language !== language
    ) {
      return false;
    }

    if (
      types?.length &&
      !types.includes(item.type)
    ) {
      return false;
    }

    if (
      evidenceLevels?.length &&
      !evidenceLevels.includes(item.evidenceLevel)
    ) {
      return false;
    }

    if (featuredOnly && !item.featured) {
      return false;
    }

    if (
      !includesAnyAudience(
        item.audiences,
        audiences
      )
    ) {
      return false;
    }

    if (
      !includesAnyTag(
        item.organTags,
        organTags
      )
    ) {
      return false;
    }

    if (
      !includesAnyTag(
        item.topicTags,
        topicTags
      )
    ) {
      return false;
    }

    if (
      !includesAnyTag(
        item.riskTags,
        riskTags
      )
    ) {
      return false;
    }

    if (
      !includesAnyTag(
        item.patternTags,
        patternTags
      )
    ) {
      return false;
    }

    if (
      !includesAnyTag(
        item.recommendationTags,
        recommendationTags
      )
    ) {
      return false;
    }

    if (
      !isOnOrAfter(
        item.publishedAt,
        publishedAfter
      )
    ) {
      return false;
    }

    if (
      !isOnOrAfter(
        item.reviewedAt,
        reviewedAfter
      )
    ) {
      return false;
    }

    return true;
  });

  return sortByRecency(filtered).slice(
    0,
    Math.max(0, limit)
  );
}

export function getKnowledgeItemBySlug(
  items: HealthKnowledgeItem[],
  slug: string,
  language?: HealthKnowledgeLanguage
): HealthKnowledgeItem | null {
  const normalizedSlug = normalize(slug);

  return (
    items.find(
      (item) =>
        normalize(item.slug) === normalizedSlug &&
        item.active &&
        isNotExpired(item) &&
        (!language || item.language === language)
    ) ?? null
  );
}

export function getFeaturedKnowledgeItems(
  items: HealthKnowledgeItem[],
  language: HealthKnowledgeLanguage,
  limit = 6
) {
  return filterKnowledgeItems(items, {
    language,
    featuredOnly: true,
    limit,
  });
}

export function getLatestResearchUpdates(
  items: HealthKnowledgeItem[],
  language: HealthKnowledgeLanguage,
  limit = 10
) {
  return filterKnowledgeItems(items, {
    language,
    types: ["research-update"],
    limit,
  });
}

export function getFamilyKnowledgeItems(
  items: HealthKnowledgeItem[],
  language: HealthKnowledgeLanguage,
  audiences: HealthKnowledgeAudience[],
  limit = 12
) {
  return filterKnowledgeItems(items, {
    language,
    types: ["family-guide"],
    audiences,
    limit,
  });
}

export function getQuickLearningItems(
  items: HealthKnowledgeItem[],
  language: HealthKnowledgeLanguage,
  limit = 10
) {
  return filterKnowledgeItems(items, {
    language,
    types: [
      "health-minute",
      "daily-fact",
      "myth-vs-fact",
    ],
    limit,
  });
}

export function getOrganKnowledgeItems(
  items: HealthKnowledgeItem[],
  language: HealthKnowledgeLanguage,
  organ: string,
  limit = 20
) {
  return filterKnowledgeItems(items, {
    language,
    organTags: [organ],
    limit,
  });
}
import {
  HealthKnowledgeAudience,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";
import { knowledgeCatalog } from "@/lib/health-knowledge/catalog/knowledge.catalog";
import {
  filterKnowledgeItems,
  getFamilyKnowledgeItems,
  getFeaturedKnowledgeItems,
  getKnowledgeItemBySlug,
  getLatestResearchUpdates,
  getOrganKnowledgeItems,
  getQuickLearningItems,
  KnowledgeRepositoryFilters,
} from "@/lib/health-knowledge/repository/knowledge.repository";

export function getKnowledgeCatalog() {
  return [...knowledgeCatalog];
}

export function getKnowledgeItems(
  filters: KnowledgeRepositoryFilters = {}
) {
  return filterKnowledgeItems(
    knowledgeCatalog,
    filters
  );
}

export function getKnowledgeArticleBySlug(
  slug: string,
  language?: HealthKnowledgeLanguage
) {
  return getKnowledgeItemBySlug(
    knowledgeCatalog,
    slug,
    language
  );
}

export function getFeaturedKnowledge(
  language: HealthKnowledgeLanguage,
  limit = 6
) {
  return getFeaturedKnowledgeItems(
    knowledgeCatalog,
    language,
    limit
  );
}

export function getLatestMedicalResearch(
  language: HealthKnowledgeLanguage,
  limit = 10
) {
  return getLatestResearchUpdates(
    knowledgeCatalog,
    language,
    limit
  );
}

export function getFamilyHealthKnowledge(
  language: HealthKnowledgeLanguage,
  audiences: HealthKnowledgeAudience[],
  limit = 12
) {
  return getFamilyKnowledgeItems(
    knowledgeCatalog,
    language,
    audiences,
    limit
  );
}

export function getQuickHealthLearning(
  language: HealthKnowledgeLanguage,
  limit = 10
) {
  return getQuickLearningItems(
    knowledgeCatalog,
    language,
    limit
  );
}

export function getKnowledgeForOrgan(
  language: HealthKnowledgeLanguage,
  organ: string,
  limit = 20
) {
  return getOrganKnowledgeItems(
    knowledgeCatalog,
    language,
    organ,
    limit
  );
}
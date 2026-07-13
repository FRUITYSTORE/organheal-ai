import "server-only";

import { loadMedicalContent } from "@/lib/health-knowledge/loaders/content-loader";
import { HealthKnowledgeItem } from "@/lib/health-knowledge/models/knowledge-item";
import { KnowledgePack } from "@/lib/health-knowledge/models/knowledge-pack";

export type ContentRegistrySnapshot = {
  knowledgeItems: HealthKnowledgeItem[];
  knowledgePacks: KnowledgePack[];
  issues: {
    file: string;
    message: string;
  }[];
  loadedAt: string;
};

let cachedSnapshot: ContentRegistrySnapshot | null = null;

function buildSnapshot(): ContentRegistrySnapshot {
  const loadedContent = loadMedicalContent();

  return {
    knowledgeItems: loadedContent.knowledgeItems,
    knowledgePacks: loadedContent.knowledgePacks,
    issues: loadedContent.issues,
    loadedAt: new Date().toISOString(),
  };
}

export function getContentRegistry(
  forceRefresh = false
): ContentRegistrySnapshot {
  if (!cachedSnapshot || forceRefresh) {
    cachedSnapshot = buildSnapshot();
  }

  return cachedSnapshot;
}

export function refreshContentRegistry() {
  cachedSnapshot = buildSnapshot();

  return cachedSnapshot;
}

export function getRegisteredKnowledgeItems() {
  return [...getContentRegistry().knowledgeItems];
}

export function getRegisteredKnowledgePacks() {
  return [...getContentRegistry().knowledgePacks];
}

export function getPublishedRegisteredKnowledgeItems() {
  return getRegisteredKnowledgeItems().filter(
    (item) =>
      item.active &&
      item.status === "published"
  );
}

export function getPublishedRegisteredKnowledgePacks() {
  return getRegisteredKnowledgePacks().filter(
    (pack) => pack.status === "published"
  );
}

export function getContentRegistryIssues() {
  return [...getContentRegistry().issues];
}
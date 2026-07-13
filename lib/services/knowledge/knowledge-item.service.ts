import "server-only";

import { getPublishedRegisteredKnowledgeItems } from "@/lib/services/knowledge/content-registry.service";

export function getKnowledgeItemBySlug(
  slug: string
) {
  const normalizedSlug =
    slug.trim().toLowerCase();

  return (
    getPublishedRegisteredKnowledgeItems().find(
      (item) =>
        item.slug.trim().toLowerCase() ===
        normalizedSlug
    ) ?? null
  );
}
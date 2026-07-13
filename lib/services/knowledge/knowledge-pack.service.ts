import "server-only";

import { KnowledgePack } from "@/lib/health-knowledge/models/knowledge-pack";
import { getPublishedRegisteredKnowledgePacks } from "@/lib/services/knowledge/content-registry.service";
import { getKnowledgeIndexEntryById } from "@/lib/services/knowledge/knowledge-index-query.service";

export function getKnowledgePackBySlug(
  slug: string
): KnowledgePack | null {
  const normalizedSlug = slug.trim().toLowerCase();

  return (
    getPublishedRegisteredKnowledgePacks().find(
      (pack) =>
        pack.slug.trim().toLowerCase() === normalizedSlug
    ) ?? null
  );
}

export function getKnowledgePackByOrgan(
  organ: string
): KnowledgePack | null {
  const normalizedOrgan = organ.trim().toLowerCase();

  return (
    getPublishedRegisteredKnowledgePacks().find(
      (pack) =>
        pack.organ.trim().toLowerCase() === normalizedOrgan
    ) ?? null
  );
}

export function getKnowledgeItemsForSection(
  pack: KnowledgePack,
  sectionKey: keyof KnowledgePack["sections"]
) {
  const section = pack.sections[sectionKey];

  return section.itemIds
    .map((id) => getKnowledgeIndexEntryById(id))
    .filter(
      (
        item
      ): item is NonNullable<
        ReturnType<typeof getKnowledgeIndexEntryById>
      > => item !== null
    );
}
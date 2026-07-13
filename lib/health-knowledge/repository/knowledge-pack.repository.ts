import { KnowledgePack } from "@/lib/health-knowledge/models/knowledge-pack";

export type KnowledgePackFilters = {
  language?: "en" | "ar";
  organ?: string;
  status?: KnowledgePack["status"][];
  limit?: number;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function filterKnowledgePacks(
  packs: KnowledgePack[],
  filters: KnowledgePackFilters = {}
): KnowledgePack[] {
  const {
    language,
    organ,
    status,
    limit = 50,
  } = filters;

  return packs
    .filter((pack) => {
      if (language && pack.language !== language) {
        return false;
      }

      if (
        organ &&
        normalize(pack.organ) !== normalize(organ)
      ) {
        return false;
      }

      if (
        status?.length &&
        !status.includes(pack.status)
      ) {
        return false;
      }

      return true;
    })
    .slice(0, Math.max(0, limit));
}

export function getKnowledgePackBySlug(
  packs: KnowledgePack[],
  slug: string
): KnowledgePack | null {
  const normalizedSlug = normalize(slug);

  return (
    packs.find(
      (pack) =>
        normalize(pack.slug) === normalizedSlug
    ) ?? null
  );
}
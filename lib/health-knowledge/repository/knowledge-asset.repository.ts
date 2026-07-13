import { KnowledgeAsset } from "@/lib/health-knowledge/models/knowledge-asset";

export type KnowledgeAssetFilters = {
  kinds?: KnowledgeAsset["kind"][];

  organTags?: string[];
  conditionTags?: string[];
  topicTags?: string[];

  activeOnly?: boolean;
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

export function filterKnowledgeAssets(
  assets: KnowledgeAsset[],
  filters: KnowledgeAssetFilters = {}
): KnowledgeAsset[] {
  const {
    kinds,
    organTags,
    conditionTags,
    topicTags,
    activeOnly = true,
    limit = 50,
  } = filters;

  return assets
    .filter((asset) => {
      if (activeOnly && !asset.active) {
        return false;
      }

      if (
        kinds?.length &&
        !kinds.includes(asset.kind)
      ) {
        return false;
      }

      if (
        !includesAnyTag(
          asset.organTags,
          organTags
        )
      ) {
        return false;
      }

      if (
        !includesAnyTag(
          asset.conditionTags,
          conditionTags
        )
      ) {
        return false;
      }

      if (
        !includesAnyTag(
          asset.topicTags,
          topicTags
        )
      ) {
        return false;
      }

      return true;
    })
    .slice(0, Math.max(0, limit));
}

export function getKnowledgeAssetById(
  assets: KnowledgeAsset[],
  id: string
): KnowledgeAsset | null {
  const normalizedId = normalize(id);

  return (
    assets.find(
      (asset) =>
        normalize(asset.id) === normalizedId &&
        asset.active
    ) ?? null
  );
}

export function getKnowledgeAssetBySlug(
  assets: KnowledgeAsset[],
  slug: string
): KnowledgeAsset | null {
  const normalizedSlug = normalize(slug);

  return (
    assets.find(
      (asset) =>
        normalize(asset.slug) === normalizedSlug &&
        asset.active
    ) ?? null
  );
}

export function getRelatedKnowledgeAssets(
  assets: KnowledgeAsset[],
  asset: KnowledgeAsset,
  limit = 10
): KnowledgeAsset[] {
  const relatedIds = new Set(
    asset.relatedAssets.map(normalize)
  );

  return assets
    .filter(
      (candidate) =>
        candidate.active &&
        candidate.id !== asset.id &&
        relatedIds.has(normalize(candidate.id))
    )
    .slice(0, Math.max(0, limit));
}
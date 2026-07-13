import { knowledgeAssetCatalog } from "@/lib/health-knowledge/catalog/knowledge-asset.catalog";
import { knowledgeCatalog } from "@/lib/health-knowledge/catalog/knowledge.catalog";
import {
  KnowledgeAsset,
  KnowledgeAssetReference,
} from "@/lib/health-knowledge/models/knowledge-asset";
import {
  HealthKnowledgeItem,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";
import {
  getKnowledgeAssetById,
  getKnowledgeAssetBySlug,
  getRelatedKnowledgeAssets,
} from "@/lib/health-knowledge/repository/knowledge-asset.repository";

export type ResolvedKnowledgeReference = {
  reference: KnowledgeAssetReference;
  item: HealthKnowledgeItem;
};

export type KnowledgeAssetGraph = {
  asset: KnowledgeAsset;
  references: ResolvedKnowledgeReference[];
  relatedAssets: KnowledgeAsset[];
  article: HealthKnowledgeItem | null;
  video: HealthKnowledgeItem | null;
  research: HealthKnowledgeItem | null;
  guide: HealthKnowledgeItem | null;
};

function resolveAssetReferences(
  asset: KnowledgeAsset,
  language?: HealthKnowledgeLanguage
): ResolvedKnowledgeReference[] {
  return asset.references
    .filter(
      (reference) =>
        !language || reference.language === language
    )
    .map((reference) => {
      const item = knowledgeCatalog.find(
        (candidate) =>
          candidate.id === reference.id &&
          candidate.active &&
          candidate.language === reference.language
      );

      return item
        ? {
            reference,
            item,
          }
        : null;
    })
    .filter(
      (
        result
      ): result is ResolvedKnowledgeReference =>
        result !== null
    )
    .sort((a, b) => {
      if (
        a.reference.featured !==
        b.reference.featured
      ) {
        return a.reference.featured ? -1 : 1;
      }

      return (
        new Date(b.item.publishedAt).getTime() -
        new Date(a.item.publishedAt).getTime()
      );
    });
}

function findReferenceItem(
  references: ResolvedKnowledgeReference[],
  types: KnowledgeAssetReference["type"][]
) {
  return (
    references.find((result) =>
      types.includes(result.reference.type)
    )?.item ?? null
  );
}

function buildKnowledgeAssetGraph(
  asset: KnowledgeAsset,
  language?: HealthKnowledgeLanguage
): KnowledgeAssetGraph {
  const references = resolveAssetReferences(
    asset,
    language
  );

  return {
    asset,
    references,

    relatedAssets: getRelatedKnowledgeAssets(
      knowledgeAssetCatalog,
      asset
    ),

    article: findReferenceItem(references, [
      "article",
    ]),

    video: findReferenceItem(references, [
      "video",
    ]),

    research: findReferenceItem(references, [
      "research",
    ]),

    guide: findReferenceItem(references, [
      "guide",
      "checklist",
      "faq",
    ]),
  };
}

export function getKnowledgeGraphByAssetId(
  assetId: string,
  language?: HealthKnowledgeLanguage
): KnowledgeAssetGraph | null {
  const asset = getKnowledgeAssetById(
    knowledgeAssetCatalog,
    assetId
  );

  if (!asset) return null;

  return buildKnowledgeAssetGraph(
    asset,
    language
  );
}

export function getKnowledgeGraphByAssetSlug(
  slug: string,
  language?: HealthKnowledgeLanguage
): KnowledgeAssetGraph | null {
  const asset = getKnowledgeAssetBySlug(
    knowledgeAssetCatalog,
    slug
  );

  if (!asset) return null;

  return buildKnowledgeAssetGraph(
    asset,
    language
  );
}

export function getKnowledgeGraphsForAssets(
  assets: KnowledgeAsset[],
  language?: HealthKnowledgeLanguage
): KnowledgeAssetGraph[] {
  return assets
    .filter((asset) => asset.active)
    .map((asset) =>
      buildKnowledgeAssetGraph(asset, language)
    );
}
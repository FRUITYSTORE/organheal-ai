export type KnowledgeAssetKind =
  | "topic"
  | "condition"
  | "organ"
  | "symptom"
  | "risk-factor"
  | "lifestyle";

export type KnowledgeAssetReferenceType =
  | "article"
  | "video"
  | "research"
  | "faq"
  | "guide"
  | "infographic"
  | "podcast"
  | "checklist";

export type KnowledgeAssetReference = {
  id: string;
  type: KnowledgeAssetReferenceType;
  language: "en" | "ar";
  featured: boolean;
};

export type KnowledgeAsset = {
  id: string;
  slug: string;
  name: string;
  kind: KnowledgeAssetKind;

  organTags: string[];
  conditionTags: string[];
  topicTags: string[];

  references: KnowledgeAssetReference[];
  relatedAssets: string[];

  active: boolean;
};
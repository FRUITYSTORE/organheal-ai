import { HealthKnowledgeAudience } from "@/lib/health-knowledge/models/knowledge-item";

export type KnowledgePackStatus =
  | "draft"
  | "medical-review"
  | "approved"
  | "published"
  | "archived";

export type KnowledgePackSectionKey =
  | "overview"
  | "normalFunction"
  | "warningSigns"
  | "riskFactors"
  | "healthyHabits"
  | "nutrition"
  | "exercise"
  | "commonConditions"
  | "labInterpretation"
  | "guidelines"
  | "latestResearch"
  | "videos"
  | "faqs"
  | "checklists"
  | "doctorResources"
  | "familyGuides"
  | "mythsVsFacts";

export type KnowledgePackSection = {
  enabled: boolean;
  title: string;
  summary: string;
  itemIds: string[];
};

export type KnowledgePackReview = {
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  nextReviewAt: string | null;
};

export type KnowledgePack = {
  id: string;
  slug: string;
  language: "en" | "ar";
  name: string;
  organ: string;
  status: KnowledgePackStatus;
  version: string;
  summary: string;
  audiences: HealthKnowledgeAudience[];
  sections: Record<
    KnowledgePackSectionKey,
    KnowledgePackSection
  >;
  relatedAssets: string[];
  review: KnowledgePackReview;
};
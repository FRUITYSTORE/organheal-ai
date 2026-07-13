export type HealthKnowledgeContentType =
  | "article"
  | "video"
  | "health-minute"
  | "daily-fact"
  | "family-guide"
  | "research-update"
  | "myth-vs-fact"
  | "faq"
  | "doctor-resource"
  | "checklist";

export type HealthKnowledgeEvidenceLevel =
  | "clinical-guideline"
  | "systematic-review"
  | "randomized-trial"
  | "observational-study"
  | "expert-consensus"
  | "educational";

  export type HealthKnowledgeStatus =
  | "draft"
  | "medical-review"
  | "approved"
  | "published"
  | "archived";
  
export type HealthKnowledgeAudience =
  | "general"
  | "children"
  | "parents"
  | "older-adults"
  | "pregnancy"
  | "caregivers"
  | "healthcare-professionals";

export type HealthKnowledgeLanguage = "en" | "ar";

export type HealthKnowledgeSource = {
  name: string;
  url: string;
  publication?: string | null;
  publishedAt?: string | null;
};

export type HealthKnowledgeItem = {
  id: string;
  slug: string;

  type: HealthKnowledgeContentType;
   language: HealthKnowledgeLanguage;
    status: HealthKnowledgeStatus;

  title: string;
  summary: string;
  practicalTakeaway: string;
  body?: string | null;

  organTags: string[];
   conditionTags: string[];
  topicTags: string[];
  riskTags: string[];
  patternTags: string[];
  
  recommendationTags: string[];

  audiences: HealthKnowledgeAudience[];

  evidenceLevel: HealthKnowledgeEvidenceLevel;
  sources: HealthKnowledgeSource[];

  readingMinutes?: number | null;
  videoMinutes?: number | null;

  imageUrl?: string | null;
  videoUrl?: string | null;

  publishedAt: string;
  reviewedAt: string;
  reviewedBy?: string | null;
  expiresAt?: string | null;

  featured: boolean;
  active: boolean;
};
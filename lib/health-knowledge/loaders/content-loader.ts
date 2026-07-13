import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  HealthKnowledgeAudience,
  HealthKnowledgeContentType,
  HealthKnowledgeEvidenceLevel,
  HealthKnowledgeItem,
  HealthKnowledgeStatus,
} from "@/lib/health-knowledge/models/knowledge-item";
import {
  KnowledgePack,
  KnowledgePackSectionKey,
  KnowledgePackStatus,
} from "@/lib/health-knowledge/models/knowledge-pack";

const CONTENT_ROOT = path.join(
  process.cwd(),
  "content"
);

const KNOWLEDGE_ITEM_TYPES: HealthKnowledgeContentType[] = [
  "article",
  "video",
  "health-minute",
  "daily-fact",
  "family-guide",
  "research-update",
  "myth-vs-fact",
  "faq",
  "doctor-resource",
  "checklist",
];

const EVIDENCE_LEVELS: HealthKnowledgeEvidenceLevel[] = [
  "clinical-guideline",
  "systematic-review",
  "randomized-trial",
  "observational-study",
  "expert-consensus",
  "educational",
];

const AUDIENCES: HealthKnowledgeAudience[] = [
  "general",
  "children",
  "parents",
  "older-adults",
  "pregnancy",
  "caregivers",
  "healthcare-professionals",
];

const KNOWLEDGE_STATUSES: HealthKnowledgeStatus[] = [
  "draft",
  "medical-review",
  "approved",
  "published",
  "archived",
];

const PACK_STATUSES: KnowledgePackStatus[] = [
  "draft",
  "medical-review",
  "approved",
  "published",
  "archived",
];

const PACK_SECTION_KEYS: KnowledgePackSectionKey[] = [
  "overview",
  "normalFunction",
  "warningSigns",
  "riskFactors",
  "healthyHabits",
  "nutrition",
  "exercise",
  "commonConditions",
  "labInterpretation",
  "guidelines",
  "latestResearch",
  "videos",
  "faqs",
  "checklists",
  "doctorResources",
  "familyGuides",
  "mythsVsFacts",
];

type UnknownRecord = Record<string, unknown>;

export type ContentLoadIssue = {
  file: string;
  message: string;
};

export type LoadedMedicalContent = {
  knowledgeItems: HealthKnowledgeItem[];
  knowledgePacks: KnowledgePack[];
  issues: ContentLoadIssue[];
};

function isRecord(
  value: unknown
): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isStringArray(
  value: unknown
): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "string"
    )
  );
}

function isValidDate(value: unknown) {
  return (
    typeof value === "string" &&
    !Number.isNaN(
      new Date(value).getTime()
    )
  );
}

function getJsonFiles(
  directory: string
): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });

  return entries.flatMap((entry) => {
    const fullPath = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      return getJsonFiles(fullPath);
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(".json")
    ) {
      return [fullPath];
    }

    return [];
  });
}

function readJsonFile(
  filePath: string
): unknown {
  const raw = fs.readFileSync(
    filePath,
    "utf8"
  );

  return JSON.parse(raw);
}

function validateKnowledgeItem(
  value: unknown
): value is HealthKnowledgeItem {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.slug !== "string" ||
    !KNOWLEDGE_ITEM_TYPES.includes(
      value.type as HealthKnowledgeContentType
    ) ||
    (
      value.language !== "en" &&
      value.language !== "ar"
    ) ||
    !KNOWLEDGE_STATUSES.includes(
      value.status as HealthKnowledgeStatus
    ) ||
    typeof value.title !== "string" ||
    typeof value.summary !== "string" ||
    typeof value.practicalTakeaway !==
      "string" ||
    !isStringArray(value.organTags) ||
    !isStringArray(value.conditionTags) ||
    !isStringArray(value.topicTags) ||
    !isStringArray(value.riskTags) ||
    !isStringArray(value.patternTags) ||
    !isStringArray(
      value.recommendationTags
    ) ||
    !Array.isArray(value.audiences) ||
    !value.audiences.every(
      (audience) =>
        AUDIENCES.includes(
          audience as HealthKnowledgeAudience
        )
    ) ||
    !EVIDENCE_LEVELS.includes(
      value.evidenceLevel as HealthKnowledgeEvidenceLevel
    ) ||
    !Array.isArray(value.sources) ||
    !isValidDate(value.publishedAt) ||
    !isValidDate(value.reviewedAt) ||
    typeof value.featured !== "boolean" ||
    typeof value.active !== "boolean"
  ) {
    return false;
  }

  if (
    value.body !== undefined &&
    value.body !== null &&
    typeof value.body !== "string"
  ) {
    return false;
  }

  if (
    value.reviewedBy !== undefined &&
    value.reviewedBy !== null &&
    typeof value.reviewedBy !== "string"
  ) {
    return false;
  }

  if (
    value.expiresAt !== undefined &&
    value.expiresAt !== null &&
    !isValidDate(value.expiresAt)
  ) {
    return false;
  }

  return value.sources.every((source) => {
    return (
      isRecord(source) &&
      typeof source.name === "string" &&
      typeof source.url === "string"
    );
  });
}

function validatePackSection(
  value: unknown
) {
  return (
    isRecord(value) &&
    typeof value.enabled === "boolean" &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    isStringArray(value.itemIds)
  );
}

function validateKnowledgePack(
  value: unknown
): value is KnowledgePack {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.slug !== "string" ||
    (
      value.language !== "en" &&
      value.language !== "ar"
    ) ||
    typeof value.name !== "string" ||
    typeof value.organ !== "string" ||
    !PACK_STATUSES.includes(
      value.status as KnowledgePackStatus
    ) ||
    typeof value.version !== "string" ||
    typeof value.summary !== "string" ||
    !Array.isArray(value.audiences) ||
    !value.audiences.every(
      (audience) =>
        AUDIENCES.includes(
          audience as HealthKnowledgeAudience
        )
    ) ||
    !isRecord(value.sections) ||
    !isStringArray(value.relatedAssets) ||
    !isRecord(value.review)
  ) {
    return false;
  }

  const sections = value.sections;

  const sectionsValid =
    PACK_SECTION_KEYS.every((key) =>
      validatePackSection(
        sections[key]
      )
    );

  if (!sectionsValid) {
    return false;
  }

  const review = value.review;

  return (
    isValidDate(review.createdAt) &&
    isValidDate(review.updatedAt) &&
    (
      review.reviewedAt === null ||
      isValidDate(review.reviewedAt)
    ) &&
    (
      review.reviewedBy === null ||
      typeof review.reviewedBy ===
        "string"
    ) &&
    (
      review.nextReviewAt === null ||
      isValidDate(review.nextReviewAt)
    )
  );
}

function shouldIgnoreFile(
  filePath: string
) {
  const normalizedPath =
    filePath.replaceAll("\\", "/");

  return (
    normalizedPath.includes(
      "/content/schemas/"
    ) ||
    normalizedPath.endsWith(
      "/knowledge-index.json"
    ) ||
    normalizedPath.endsWith(
      "/knowledge-pack.template.json"
    )
  );
}

export function loadMedicalContent():
  LoadedMedicalContent {
  const files = getJsonFiles(
    CONTENT_ROOT
  ).filter(
    (filePath) =>
      !shouldIgnoreFile(filePath)
  );

  const knowledgeItems:
    HealthKnowledgeItem[] = [];

  const knowledgePacks:
    KnowledgePack[] = [];

  const issues:
    ContentLoadIssue[] = [];

  for (const filePath of files) {
    const relativeFile = path.relative(
      process.cwd(),
      filePath
    );

    try {
      const value =
        readJsonFile(filePath);

      if (
        validateKnowledgeItem(value)
      ) {
        knowledgeItems.push(value);
        continue;
      }

      if (
        validateKnowledgePack(value)
      ) {
        knowledgePacks.push(value);
        continue;
      }

      issues.push({
        file: relativeFile,
        message:
          "File does not match the OrganHeal knowledge item or knowledge pack contract.",
      });
    } catch (error) {
      issues.push({
        file: relativeFile,
        message:
          error instanceof Error
            ? error.message
            : "Could not parse JSON content.",
      });
    }
  }

  return {
    knowledgeItems,
    knowledgePacks,
    issues,
  };
}

export function loadPublishedKnowledgeItems() {
  return loadMedicalContent()
    .knowledgeItems
    .filter(
      (item) =>
        item.active &&
        item.status === "published"
    );
}

export function loadPublishedKnowledgePacks() {
  return loadMedicalContent()
    .knowledgePacks
    .filter(
      (pack) =>
        pack.status === "published"
    );
}
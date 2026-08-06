import type {
  ClinicalEvidenceSufficiencyResult,
} from "@/lib/health-intelligence/models/clinical-evidence-sufficiency";

export const WHOLE_BODY_HEALTH_DOMAINS = [
  "cardiovascular",
  "renal-urinary",
  "hepatic-biliary",
  "respiratory",
  "neurological",
  "endocrine-metabolic",
  "gastrointestinal",
  "hematological",
  "immune-inflammatory",
  "musculoskeletal",
  "rheumatological",
  "dermatological",
  "reproductive",
  "obstetric-gynecological",
  "pediatric-developmental",
  "mental-behavioral",
  "infectious-disease",
  "oncology",
  "ophthalmology",
  "ear-nose-throat",
  "dental-oral",
  "medication-pharmacology",
  "toxicology",
  "nutrition",
  "lifestyle",
  "genetic-family-history",
  "preventive-screening",
  "general-systemic",
] as const;

export type KnownWholeBodyHealthDomain =
  (typeof WHOLE_BODY_HEALTH_DOMAINS)[number];

/**
 * Known domains use a stable OrganHeal identifier.
 * Unknown or future specialties remain representable without changing
 * every consumer of this model.
 */
export type WholeBodyHealthDomain =
  | KnownWholeBodyHealthDomain
  | `custom:${string}`;

export type ClinicalEvidenceSourceType =
  | "uploaded-report"
  | "generated-analysis"
  | "assessment"
  | "check-in"
  | "health-history"
  | "user-answer"
  | "medication"
  | "symptom"
  | "vital-sign"
  | "laboratory-result"
  | "imaging-result"
  | "clinical-note"
  | "family-history"
  | "lifestyle"
  | "derived-intelligence"
  | "unknown";

export type ClinicalEvidenceCertainty =
  | "confirmed"
  | "reported"
  | "inferred"
  | "suspected"
  | "unknown";

export type ClinicalEvidenceConfidence =
  | "very-low"
  | "low"
  | "moderate"
  | "high"
  | "very-high";

export type ClinicalEvidenceRelevance =
  | "supporting"
  | "contradicting"
  | "contextual"
  | "uncertain";

export type ClinicalRelationshipType =
  | "direct"
  | "associated"
  | "possible-cause"
  | "possible-effect"
  | "risk-factor"
  | "protective-factor"
  | "medication-related"
  | "lifestyle-related"
  | "family-history-related"
  | "temporal"
  | "cross-system"
  | "requires-exclusion"
  | "requires-confirmation"
  | "unknown";

export type ClinicalPriority =
  | "routine"
  | "monitor"
  | "important"
  | "urgent"
  | "emergency";

export type ClinicalKnowledgeNodeType =
  | "finding"
  | "symptom"
  | "condition"
  | "risk"
  | "medication"
  | "procedure"
  | "laboratory-marker"
  | "imaging-observation"
  | "body-system"
  | "health-behavior"
  | "family-history"
  | "question"
  | "missing-information"
  | "action";

export type ClinicalEvidenceReference = {
  id:
    string;

  sourceType:
    ClinicalEvidenceSourceType;

  sourceId:
    string | null;

  label:
    string;

  value:
    string | number | boolean | null;

  unit:
    string | null;

  observedAt:
    string | null;

  certainty:
    ClinicalEvidenceCertainty;

  confidence:
    ClinicalEvidenceConfidence;

  relevance:
    ClinicalEvidenceRelevance;
};

export type WholeBodyClinicalNode = {
  id:
    string;

  type:
    ClinicalKnowledgeNodeType;

  label:
    string;

  description:
    string | null;

  domains:
    WholeBodyHealthDomain[];

  evidence:
    ClinicalEvidenceReference[];

  priority:
    ClinicalPriority;

  confidence:
    ClinicalEvidenceConfidence;
};

export type WholeBodyClinicalRelationship = {
  id:
    string;

  sourceNodeId:
    string;

  targetNodeId:
    string;

  type:
    ClinicalRelationshipType;

  explanation:
    string;

  supportingEvidenceIds:
    string[];

  contradictingEvidenceIds:
    string[];

  confidence:
    ClinicalEvidenceConfidence;

  clinicalSignificance:
    ClinicalPriority;

  missingEvidence:
    string[];
};

export type ClinicalClarificationQuestion = {
  id:
    string;

  question:
    string;

  domain:
    WholeBodyHealthDomain;

  reason:
    string;

  expectedInformation:
    string;

  affectedNodeIds:
    string[];

  affectedRelationshipIds:
    string[];

  priority:
    ClinicalPriority;

  answerMayChange:
    Array<
      | "interpretation"
      | "confidence"
      | "risk"
      | "priority"
      | "next-action"
    >;
};

export type WholeBodyClinicalKnowledgeModel = {
  nodes:
    WholeBodyClinicalNode[];

  relationships:
    WholeBodyClinicalRelationship[];

  clarificationQuestions:
    ClinicalClarificationQuestion[];

  coveredDomains:
    WholeBodyHealthDomain[];

   unresolvedDomains:
    WholeBodyHealthDomain[];

  evidenceSufficiency:
    ClinicalEvidenceSufficiencyResult | null;

  generatedAt:
    string;
};

export function createEmptyWholeBodyClinicalKnowledgeModel():
  WholeBodyClinicalKnowledgeModel {
  return {
    nodes:
      [],

    relationships:
      [],

    clarificationQuestions:
      [],

    coveredDomains:
      [],

        unresolvedDomains:
      [],

    evidenceSufficiency:
      null,

    generatedAt:
      new Date().toISOString(),
  };
}

export function isKnownWholeBodyHealthDomain(
  value:
    string
): value is KnownWholeBodyHealthDomain {
  return (
    WHOLE_BODY_HEALTH_DOMAINS as
      readonly string[]
  ).includes(
    value
  );
}

export function normalizeWholeBodyHealthDomain(
  value:
    string
): WholeBodyHealthDomain {
  const normalizedValue =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  if (
    !normalizedValue
  ) {
    return "general-systemic";
  }

  if (
    isKnownWholeBodyHealthDomain(
      normalizedValue
    )
  ) {
    return normalizedValue;
  }

  return `custom:${normalizedValue}`;
}
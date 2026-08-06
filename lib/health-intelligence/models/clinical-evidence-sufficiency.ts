import type {
  ClinicalEvidenceConfidence,
  WholeBodyHealthDomain,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

export type ClinicalEvidenceSufficiencyStatus =
  | "insufficient"
  | "partial"
  | "sufficient";

export type ClinicalReasoningPermission =
  | "clarify-first"
  | "provisional-answer"
  | "evidence-based-answer";

export type ClinicalEvidenceGapType =
  | "no-evidence"
  | "limited-source-diversity"
  | "no-explicit-relationships"
  | "missing-current-context"
  | "missing-health-history"
  | "missing-user-reported-context"
  | "unresolved-domain";

export type ClinicalEvidenceGap = {
  id:
    string;

  type:
    ClinicalEvidenceGapType;

  label:
    string;

  reason:
    string;

  affectedDomains:
    WholeBodyHealthDomain[];

  impact:
    "low" | "moderate" | "high";
};

export type ClinicalConfidenceProfile = {
  evidenceConfidence:
    ClinicalEvidenceConfidence;

  relationshipConfidence:
    ClinicalEvidenceConfidence;

  reasoningConfidence:
    ClinicalEvidenceConfidence;

  recommendationConfidence:
    ClinicalEvidenceConfidence;
};

export type ClinicalEvidenceSufficiencyResult = {
  status:
    ClinicalEvidenceSufficiencyStatus;

  reasoningPermission:
    ClinicalReasoningPermission;

  completenessScore:
    number;

  evidenceNodeCount:
    number;

  relationshipCount:
    number;

  sourceTypeCount:
    number;

  coveredDomainCount:
    number;

  unresolvedDomainCount:
    number;

  confidence:
    ClinicalConfidenceProfile;

  gaps:
    ClinicalEvidenceGap[];

  highImpactMissingInformation:
    string[];

  canProvideProvisionalInterpretation:
    boolean;

  requiresClarification:
    boolean;

  generatedAt:
    string;
};
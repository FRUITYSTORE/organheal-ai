import type {
  PatientJourneyEvent,
} from "@/lib/application/journey/patient-journey-events.service";

import type {
  PatientJourneySnapshot,
} from "@/lib/application/journey/patient-journey-snapshot.service";

import type {
  PatientClinicalContext,
} from "@/lib/application/clinical/patient-clinical-context.service";

import type {
  UnifiedIntelligenceExperienceModel,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.model";

import type {
  WholeBodyClinicalKnowledgeModel,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

import type {
  StructuredClinicalEvidenceReference,
} from "@/lib/health-intelligence/runtime/clinical-reasoning-state";

export type AssistantReportEvidenceItem = {
  marker: string;
  value: number;
  unit: string | null;

  status:
    | "Low"
    | "Normal"
    | "High"
    | "Detected"
    | null;

  referenceLow:
    number | null;

  referenceHigh:
    number | null;

  referenceSource:
    | "report"
    | "default"
    | null;
};

export type AssistantLatestReportContext = {
  reportId: number;
  fileName: string;
  reportType: string;
  uploadedAt: string | null;
  summary: string | null;
  keyFindings: string | null;
  recommendations: string | null;
  doctorBrief: string | null;
  nextBestAction: string | null;
  riskLevel: string | null;

  /*
   * Existing canonical evidence used by focused
   * assistant reasoning paths.
   */
  reportEvidence:
    AssistantReportEvidenceItem[];

  /*
   * Parser v2 high-confidence report evidence.
   *
   * This is intentionally separate so full report
   * interpretation can use broader evidence without
   * expanding focused cause/next-step requests.
   */
  expandedReportEvidence?:
  AssistantReportEvidenceItem[];
};

export type AssistantHealthScoreContext = {
  score: number;
  level: string;
  confidence: unknown;
  dataCompleteness: number;
};

export type AssistantClinicalMemoryContext = {
  evidence:
    StructuredClinicalEvidenceReference[];

  interviewCount:
    number;
};

export type AssistantResponseHealthContext = {
  overallScore?: number | null;
  strongestOrgan?: string | null;
  priorityOrgan?: string | null;

  labScore?: number | null;

  dailyCheckInScore?: number | null;
  dailyMood?: string | null;

  riskPattern?: string | null;

  healthAge?: number | null;
  healthAgeStatus?: string | null;

  clinicalMemory?:
  | AssistantClinicalMemoryContext
  | null;
  
  doctorBrief?: string | null;
  recommendation?: string | null;

  healthScore?:
    | AssistantHealthScoreContext
    | null;

  healthEngine?: unknown;

  latestReportContext?:
    | AssistantLatestReportContext
    | null;

  patientJourney?:
    | PatientJourneySnapshot
    | null;

  patientJourneyEvents?:
    | PatientJourneyEvent[]
    | null;

  clinicalContext?:
    | PatientClinicalContext
    | null;

  unifiedExperience?:
    | UnifiedIntelligenceExperienceModel
    | null;

  wholeBodyKnowledge?:
    | WholeBodyClinicalKnowledgeModel
    | null;
};

export type AssistantResponseConversationMessage = {
  role: "user" | "assistant";
  content: string;
};
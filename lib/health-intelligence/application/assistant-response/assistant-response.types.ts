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
};

export type AssistantHealthScoreContext = {
  score: number;
  level: string;
  confidence: unknown;
  dataCompleteness: number;
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
};

export type AssistantResponseConversationMessage = {
  role: "user" | "assistant";
  content: string;
};
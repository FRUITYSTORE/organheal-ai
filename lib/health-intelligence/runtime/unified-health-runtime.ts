import "server-only";

import type {
  PatientSummary,
} from "@/lib/models/patient";

import type {
  HealthKnowledgeAudience,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";

import {
  buildClinicalDecision,
} from "@/lib/clinical-decision/clinical-decision.service";

import {
  buildHealthRuntime,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime.builder";

import type {
  HealthIntelligenceContextAudience,
} from "@/lib/health-intelligence/context/health-intelligence-context";

import {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import {
  buildDashboardIntelligenceViewModel,
  type DashboardIntelligenceViewModel,
} from "@/lib/application/dashboard/dashboard-intelligence.view-model";

export type BuildUnifiedHealthRuntimeInput = {
  userId: string;
  patient: PatientSummary;

  language?: HealthKnowledgeLanguage;
  audience?: HealthKnowledgeAudience;

  hasHealthPlan?: boolean;
  hasDoctorBrief?: boolean;
};

type ClinicalDecisionResult = Awaited<
  ReturnType<typeof buildClinicalDecision>
>;

type IntelligenceRuntimeResult = Awaited<
  ReturnType<typeof buildHealthRuntime>
>;

export type UnifiedHealthRuntime = {
  clinicalDecision: ClinicalDecisionResult;

  intelligenceRuntime:
    IntelligenceRuntimeResult;

  timeline:
    ClinicalDecisionResult["timeline"];

  passport:
    ClinicalDecisionResult["passport"];

  knowledge:
    ClinicalDecisionResult["knowledge"];

    journey:
    IntelligenceRuntimeResult["modules"]["journey"];

  story:
    IntelligenceRuntimeResult["modules"]["story"];

  summary:
    IntelligenceRuntimeResult["modules"]["summary"];

      dashboardIntelligence:
    DashboardIntelligenceViewModel | null;
    
  metadata: {
    clinicalStatus:
      ClinicalDecisionResult["metadata"]["status"];

    clinicalCompletedStages:
      ClinicalDecisionResult["metadata"]["completedStages"];

    readyModuleCount: number;
    unavailableModuleCount: number;
    errorModuleCount: number;

    generatedAt: string;
  };
};

function mapRuntimeAudience(
  audience: HealthKnowledgeAudience
): HealthIntelligenceContextAudience {
  if (
    audience ===
    "healthcare-professionals"
  ) {
    return "clinician";
  }

  if (
    audience === "children" ||
    audience === "parents" ||
    audience === "older-adults" ||
    audience === "pregnancy" ||
    audience === "caregivers"
  ) {
    return "patient";
  }

  return "general";
}

function resolveDoctorBriefAvailability(
  patient: PatientSummary,
  explicitValue:
    | boolean
    | undefined
): boolean {
  if (
    explicitValue !== undefined
  ) {
    return explicitValue;
  }

  return patient.healthInsights.some(
    (insight) =>
      typeof insight.doctor_brief ===
        "string" &&
      insight.doctor_brief
        .trim()
        .length > 0
  );
}

export async function buildUnifiedHealthRuntime({
  userId,
  patient,
  language = "en",
  audience = "general",
  hasHealthPlan = false,
  hasDoctorBrief,
}: BuildUnifiedHealthRuntimeInput): Promise<UnifiedHealthRuntime> {
  const resolvedDoctorBrief =
    resolveDoctorBriefAvailability(
      patient,
      hasDoctorBrief
    );

    const intelligence =
  buildHealthIntelligence(
    patient
  );

  const [
    clinicalDecision,
    intelligenceRuntime,
  ] = await Promise.all([
   buildClinicalDecision({
  patient,
  language,
  audience,
  prebuiltIntelligence:
    intelligence,
}),

    buildHealthRuntime({
      userId,
      patient,
      intelligence,
      language,
      audience:
        mapRuntimeAudience(audience),
      hasHealthPlan,
      hasDoctorBrief:
        resolvedDoctorBrief,
    }),
  ]);
  
  const dashboardIntelligence =
    intelligenceRuntime
      .modules
      .summary
      .status === "ready" &&
    intelligenceRuntime
      .modules
      .summary
      .data !== null
      ? buildDashboardIntelligenceViewModel(
          intelligenceRuntime
            .modules
            .summary
            .data
        )
      : null;

  return {
    clinicalDecision,
    intelligenceRuntime,

    timeline:
      clinicalDecision.timeline,

    passport:
      clinicalDecision.passport,

    knowledge:
      clinicalDecision.knowledge,

        journey:
      intelligenceRuntime
        .modules
        .journey,

    story:
      intelligenceRuntime
        .modules
        .story,

    summary:
      intelligenceRuntime
        .modules
        .summary,
            dashboardIntelligence,

    metadata: {
      clinicalStatus:
        clinicalDecision
          .metadata
          .status,

      clinicalCompletedStages:
        clinicalDecision
          .metadata
          .completedStages,

      readyModuleCount:
        intelligenceRuntime
          .readyModuleCount,

      unavailableModuleCount:
        intelligenceRuntime
          .unavailableModuleCount,

      errorModuleCount:
        intelligenceRuntime
          .errorModuleCount,

      generatedAt:
        new Date().toISOString(),
    },
  };
}
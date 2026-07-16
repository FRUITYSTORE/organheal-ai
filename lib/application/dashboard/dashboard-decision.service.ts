import "server-only";

import type {
  HealthKnowledgeAudience,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";

import type {
  PatientSummary,
} from "@/lib/models/patient";

import {
  buildUnifiedHealthRuntime,
} from "@/lib/health-intelligence/runtime/unified-health-runtime";

import type {
  DashboardIntelligenceViewModel,
} from "@/lib/application/dashboard/dashboard-intelligence.view-model";

export type GetDashboardDecisionInput = {
  userId: string;
  patient: PatientSummary;

  language?: HealthKnowledgeLanguage;
  audience?: HealthKnowledgeAudience;

  hasHealthPlan?: boolean;
  hasDoctorBrief?: boolean;
};

type UnifiedRuntimeResult = Awaited<
  ReturnType<
    typeof buildUnifiedHealthRuntime
  >
>;

export type DashboardDecisionResult = {
  intelligence:
    UnifiedRuntimeResult["clinicalDecision"]["intelligence"];

  knowledge:
    UnifiedRuntimeResult["knowledge"];

  passport:
    UnifiedRuntimeResult["passport"];

  timeline:
    UnifiedRuntimeResult["timeline"];

  dashboardIntelligence:
    DashboardIntelligenceViewModel | null;

  summary:
    UnifiedRuntimeResult["summary"];

  pipeline: {
    status:
      UnifiedRuntimeResult["metadata"]["clinicalStatus"];

    completedStages:
      UnifiedRuntimeResult["metadata"]["clinicalCompletedStages"];

    readyModuleCount: number;
    unavailableModuleCount: number;
    errorModuleCount: number;

    generatedAt: string;
  };
};

export async function getDashboardDecision({
  userId,
  patient,
  language = "en",
  audience = "general",
  hasHealthPlan = false,
  hasDoctorBrief,
}: GetDashboardDecisionInput): Promise<DashboardDecisionResult> {
  const runtime =
    await buildUnifiedHealthRuntime({
      userId,
      patient,
      language,
      audience,
      hasHealthPlan,
      hasDoctorBrief,
    });

  return {
    intelligence:
      runtime
        .clinicalDecision
        .intelligence,

    knowledge:
      runtime.knowledge,

    passport:
      runtime.passport,

    timeline:
      runtime.timeline,

    dashboardIntelligence:
      runtime.dashboardIntelligence,

    summary:
      runtime.summary,

    pipeline: {
      status:
        runtime
          .metadata
          .clinicalStatus,

      completedStages:
        runtime
          .metadata
          .clinicalCompletedStages,

      readyModuleCount:
        runtime
          .metadata
          .readyModuleCount,

      unavailableModuleCount:
        runtime
          .metadata
          .unavailableModuleCount,

      errorModuleCount:
        runtime
          .metadata
          .errorModuleCount,

      generatedAt:
        runtime
          .metadata
          .generatedAt,
    },
  };
}
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

export type GetHistoryDecisionInput = {
  userId: string;
  patient: PatientSummary;
  language?: HealthKnowledgeLanguage;
  audience?: HealthKnowledgeAudience;
};

type UnifiedRuntimeResult = Awaited<
  ReturnType<typeof buildUnifiedHealthRuntime>
>;

export type HistoryDecisionResult = {
  timeline:
    UnifiedRuntimeResult["timeline"];

  passport:
    UnifiedRuntimeResult["passport"];

  knowledge:
    UnifiedRuntimeResult["knowledge"];

  journey:
    UnifiedRuntimeResult["journey"];

  runtime: {
    version:
      UnifiedRuntimeResult["intelligenceRuntime"]["version"];

    readyModuleCount: number;
    unavailableModuleCount: number;
    errorModuleCount: number;

    generatedAt: string;
  };

  pipeline: {
    status:
      UnifiedRuntimeResult["metadata"]["clinicalStatus"];

    completedStages:
      UnifiedRuntimeResult["metadata"]["clinicalCompletedStages"];

    generatedAt: string;
  };
};

export async function getHistoryDecision({
  userId,
  patient,
  language = "en",
  audience = "general",
}: GetHistoryDecisionInput): Promise<HistoryDecisionResult> {
  const unifiedRuntime =
    await buildUnifiedHealthRuntime({
      userId,
      patient,
      language,
      audience,

      hasHealthPlan: false,

      hasDoctorBrief:
        patient.healthInsights.some(
          (insight) =>
            typeof insight.doctor_brief ===
              "string" &&
            insight.doctor_brief
              .trim()
              .length > 0
        ),
    });

  return {
    timeline:
      unifiedRuntime.timeline,

    passport:
      unifiedRuntime.passport,

    knowledge:
      unifiedRuntime.knowledge,

    journey:
      unifiedRuntime.journey,

    runtime: {
      version:
        unifiedRuntime
          .intelligenceRuntime
          .version,

      readyModuleCount:
        unifiedRuntime
          .metadata
          .readyModuleCount,

      unavailableModuleCount:
        unifiedRuntime
          .metadata
          .unavailableModuleCount,

      errorModuleCount:
        unifiedRuntime
          .metadata
          .errorModuleCount,

      generatedAt:
        unifiedRuntime
          .metadata
          .generatedAt,
    },

    pipeline: {
      status:
        unifiedRuntime
          .metadata
          .clinicalStatus,

      completedStages:
        unifiedRuntime
          .metadata
          .clinicalCompletedStages,

      generatedAt:
        unifiedRuntime
          .clinicalDecision
          .metadata
          .generatedAt,
    },
  };
}
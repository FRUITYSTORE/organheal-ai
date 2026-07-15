import "server-only";

import type {
  HealthKnowledgeAudience,
  HealthKnowledgeLanguage,
} from "@/lib/health-knowledge/models/knowledge-item";

import type {
  PatientSummary,
} from "@/lib/models/patient";

import {
  buildClinicalDecision,
} from "@/lib/clinical-decision/clinical-decision.service";

import {
  buildHealthRuntime,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime.builder";

import type {
  HealthIntelligenceContextAudience,
} from "@/lib/health-intelligence/context/health-intelligence-context";

export type GetHistoryDecisionInput = {
  userId: string;
  patient: PatientSummary;
  language?: HealthKnowledgeLanguage;
  audience?: HealthKnowledgeAudience;
};

type ClinicalDecisionResult = Awaited<
  ReturnType<typeof buildClinicalDecision>
>;

type RuntimeResult = Awaited<
  ReturnType<typeof buildHealthRuntime>
>;

export type HistoryDecisionResult = {
  timeline: ClinicalDecisionResult["timeline"];

  passport: ClinicalDecisionResult["passport"];

  knowledge: ClinicalDecisionResult["knowledge"];

  journey: RuntimeResult["modules"]["journey"];

  runtime: {
    version: RuntimeResult["version"];
    readyModuleCount: number;
    unavailableModuleCount: number;
    errorModuleCount: number;
    generatedAt: string;
  };

  pipeline: {
    status:
      ClinicalDecisionResult["metadata"]["status"];

    completedStages:
      ClinicalDecisionResult["metadata"]["completedStages"];

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

export async function getHistoryDecision({
  userId,
  patient,
  language = "en",
  audience = "general",
}: GetHistoryDecisionInput): Promise<HistoryDecisionResult> {
  const [decision, runtime] =
    await Promise.all([
      buildClinicalDecision({
        patient,
        language,
        audience,
      }),

      buildHealthRuntime({
        userId,
        patient,
        language,
        audience:
          mapRuntimeAudience(audience),

        hasHealthPlan: false,

        hasDoctorBrief:
          patient.healthInsights.some(
            (insight) =>
              typeof insight.doctor_brief ===
                "string" &&
              insight.doctor_brief.trim()
                .length > 0
          ),
      }),
    ]);

  return {
    timeline: decision.timeline,
    passport: decision.passport,
    knowledge: decision.knowledge,

    journey:
      runtime.modules.journey,

    runtime: {
      version:
        runtime.version,

      readyModuleCount:
        runtime.readyModuleCount,

      unavailableModuleCount:
        runtime.unavailableModuleCount,

      errorModuleCount:
        runtime.errorModuleCount,

      generatedAt:
        runtime.generatedAt,
    },

    pipeline: {
      status:
        decision.metadata.status,

      completedStages:
        decision.metadata.completedStages,

      generatedAt:
        decision.metadata.generatedAt,
    },
  };
}
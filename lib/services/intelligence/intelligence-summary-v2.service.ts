import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  supabase,
} from "@/lib/supabase";

import {
  buildUnifiedHealthRuntime,
} from "@/lib/health-intelligence/runtime/unified-health-runtime";

import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

type IntelligenceSummaryLanguage =
  | "en"
  | "ar";

export async function getCombinedIntelligenceSummary(
  userId:
    string,
  language:
    IntelligenceSummaryLanguage = "en",
  client:
    SupabaseClient = supabase
) {
  const patientSummary =
    await getPatientSummary(
      userId,
      client
    );

  const unifiedRuntime =
    await buildUnifiedHealthRuntime({
      userId,

      patient:
        patientSummary,

      language,

      audience:
        "general",
    });

  const healthIntelligence =
    unifiedRuntime
      .clinicalDecision
      .intelligence;

  return {
    intelligenceSummary: {
      assessments:
        patientSummary.assessments,

      latestCheckIn:
        patientSummary.latestCheckIn,

      healthIntelligence,
    },

    healthInsights:
      patientSummary.healthInsights,

    uploadedReports:
      patientSummary.uploadedReports,

    summary:
      unifiedRuntime.summary,
  };
}
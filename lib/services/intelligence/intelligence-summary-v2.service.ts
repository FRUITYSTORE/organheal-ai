import "server-only";

import {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";
import {
  buildUnifiedHealthRuntime,
} from "@/lib/health-intelligence/runtime/unified-health-runtime";
import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

type IntelligenceSummaryLanguage =
  | "en"
  | "ar";

export async function getIntelligenceSummaryV2(
  userId: string,
  language:
    IntelligenceSummaryLanguage = "en"
) {
  const patientSummary =
    await getPatientSummary(userId);

  const unifiedRuntime =
    await buildUnifiedHealthRuntime({
      userId,
      patient: patientSummary,
      language,
      audience: "general",
    });

  return {
    summary: unifiedRuntime.summary,
  };
}

export async function getCombinedIntelligenceSummary(
  userId: string,
  language:
    IntelligenceSummaryLanguage = "en"
) {
  const patientSummary =
    await getPatientSummary(userId);

  const healthIntelligence =
    buildHealthIntelligence(patientSummary);

  const unifiedRuntime =
    await buildUnifiedHealthRuntime({
      userId,
      patient: patientSummary,
      language,
      audience: "general",
    });

  return {
    intelligenceSummary: {
      assessments: patientSummary.assessments,
      latestCheckIn: patientSummary.latestCheckIn,
      healthIntelligence,
    },
    healthInsights: patientSummary.healthInsights,
    uploadedReports: patientSummary.uploadedReports,
    summary: unifiedRuntime.summary,
  };
}
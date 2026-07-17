import "server-only";

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
      patient:
        patientSummary,
      language,
      audience:
        "general",
    });

  return {
    summary:
      unifiedRuntime.summary,
  };
}
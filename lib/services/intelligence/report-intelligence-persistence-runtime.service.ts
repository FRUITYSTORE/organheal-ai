import {
  persistReportIntelligenceAtomic,
} from "@/lib/repositories/insight.repository";

type PersistReportIntelligenceInput = {
  userId: string;
  insightId: number;
  reportId: number | null;
  intelligence: Record<string, unknown>;
  generatedResult: unknown;
};

export type PersistReportIntelligenceResult =
  | {
      success: true;
    }
  | {
      success: false;
      stage: "health-insight" | "generated-result";
      error: unknown;
    };

function getNullableString(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

export async function persistReportIntelligence({
  insightId,
  reportId,
  intelligence,
  generatedResult,
}: PersistReportIntelligenceInput): Promise<PersistReportIntelligenceResult> {
  try {
    await persistReportIntelligenceAtomic({
      insightId,
      reportId,
      medicalCategory: getNullableString(
        intelligence.medical_category
      ),
      aiStatus: getNullableString(
        intelligence.ai_status
      ),
      riskLevel: getNullableString(
        intelligence.risk_level
      ),
      summary: getNullableString(
        intelligence.summary
      ),
      keyFindings: getNullableString(
        intelligence.key_findings
      ),
      riskSignals: getNullableString(
        intelligence.risk_signals
      ),
      recommendations: getNullableString(
        intelligence.recommendations
      ),
      doctorBrief: getNullableString(
        intelligence.doctor_brief
      ),
      nextBestAction: getNullableString(
        intelligence.next_best_action
      ),
      generatedResult,
    });
  } catch (error) {
    return {
      success: false,
      stage: "generated-result",
      error,
    };
  }

  return {
    success: true,
  };
}
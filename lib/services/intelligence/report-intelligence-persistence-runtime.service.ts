import {
  saveGeneratedIntelligenceResult,
  updateHealthInsight,
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

export async function persistReportIntelligence({
  userId,
  insightId,
  reportId,
  intelligence,
  generatedResult,
}: PersistReportIntelligenceInput): Promise<PersistReportIntelligenceResult> {
  try {
    await updateHealthInsight(userId, insightId, intelligence);
  } catch (error) {
    return {
      success: false,
      stage: "health-insight",
      error,
    };
  }

  try {
    await saveGeneratedIntelligenceResult({
      userId,
      insightId,
      reportId,
      result: generatedResult,
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
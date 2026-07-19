import {
  getGeneratedResultByInsightId,
} from "@/lib/repositories/insight.repository";

type LoadSavedReportIntelligenceInput = {
  userId: string;
  insightId: number;
};

type SavedGeneratedResult = Awaited<
  ReturnType<typeof getGeneratedResultByInsightId>
>;

export type LoadSavedReportIntelligenceResult =
  | {
      success: true;
      savedGeneratedResult: SavedGeneratedResult;
    }
  | {
      success: false;
      errorMessage: string;
    };

export async function loadSavedReportIntelligence({
  userId,
  insightId,
}: LoadSavedReportIntelligenceInput): Promise<LoadSavedReportIntelligenceResult> {
  try {
    const savedGeneratedResult =
      await getGeneratedResultByInsightId(userId, insightId);

    return {
      success: true,
      savedGeneratedResult,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage:
        error instanceof Error ? error.message : String(error),
    };
  }
}
import {
  buildHealthInsightUpdate,
} from "@/lib/services/intelligence/intelligence-persistence.service";
import {
  persistReportIntelligence,
} from "@/lib/services/intelligence/report-intelligence-persistence-runtime.service";
import {
  buildReportIntelligenceResult,
  type GeneratedIntelligenceResult,
} from "@/lib/services/intelligence/report-intelligence-result.service";
import {
  prepareReportMarkerRuntime,
} from "@/lib/services/intelligence/report-marker-runtime.service";
import {
  loadReportTextRuntime,
} from "@/lib/services/intelligence/report-text-runtime.service";

type AssessmentInput = {
  organ_name: string;
  score: number;
  created_at: string;
};

type DailyCheckInInput = {
  mood: string | null;
  wellness_score: number | null;
  created_at: string;
};

type ReportInsightInput = {
  id: number;
  report_id: number | null;
  report_type: string | null;
  file_path?: string | null;
  file_name?: string | null;
};

type GenerateReportIntelligenceRuntimeInput = {
  userId: string;
  insight: ReportInsightInput;
  assessments: AssessmentInput[];
  dailyCheckIn: DailyCheckInInput | null;
};

type HealthInsightUpdate = ReturnType<
  typeof buildHealthInsightUpdate
>;

export type GenerateReportIntelligenceRuntimeResult =
  | {
      success: true;
      extractedText: string;
      generatedResult: GeneratedIntelligenceResult;
      intelligence: HealthInsightUpdate;
    }
  | {
      success: false;
      stage:
        | "report-text"
        | "health-insight"
        | "generated-result";
      errorMessage: string;
      requiresLogin: boolean;
    };

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

export async function generateReportIntelligenceRuntime({
  userId,
  insight,
  assessments,
  dailyCheckIn,
}: GenerateReportIntelligenceRuntimeInput): Promise<GenerateReportIntelligenceRuntimeResult> {
  const reportTextResult = await loadReportTextRuntime({
    userId,
    insightId: insight.id,
    reportId: insight.report_id,
    filePath: insight.file_path,
    fileName: insight.file_name,
  });

  if (
    reportTextResult.errorMessage ||
    !reportTextResult.extractedText
  ) {
    return {
      success: false,
      stage: "report-text",
      errorMessage:
        reportTextResult.errorMessage ||
        "No readable report text was extracted yet.",
      requiresLogin: reportTextResult.requiresLogin,
    };
  }

  const extractedText = reportTextResult.extractedText;

  const {
    detectedMarkers,
    historicalMarkerRows,
  } = await prepareReportMarkerRuntime({
    userId,
    reportId: insight.report_id,
    extractedText,
  });

  const {
    generatedResultPayload,
    markerSummary,
    radiologySummary,
    isRadiologyReport,
    clinicalPatterns,
  } = buildReportIntelligenceResult({
    extractedText,
    reportType: insight.report_type,
    detectedMarkers,
    assessments,
    dailyCheckIn,
    historicalMarkerRows,
  });

  const intelligence = buildHealthInsightUpdate({
    extractedText,
    reportType: insight.report_type,
    markerSummary,
    radiologySummary,
    isRadiologyReport,
    clinicalPatterns,
    unifiedHealth: generatedResultPayload.unifiedHealth,
  });

  const persistenceResult = await persistReportIntelligence({
    userId,
    insightId: insight.id,
    reportId: insight.report_id,
    intelligence,
    generatedResult: generatedResultPayload,
  });

  if (!persistenceResult.success) {
    return {
      success: false,
      stage: persistenceResult.stage,
      errorMessage: getErrorMessage(
        persistenceResult.error
      ),
      requiresLogin: false,
    };
  }

  return {
    success: true,
    extractedText,
    generatedResult: generatedResultPayload,
    intelligence,
  };
}
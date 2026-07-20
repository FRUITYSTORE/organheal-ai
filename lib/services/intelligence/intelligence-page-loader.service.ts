import {
  getLatestGeneratedResultByInsightIds,
  getRecentHealthInsights,
  type HealthInsightSummary,
  type SavedGeneratedIntelligenceResult,
} from "@/lib/repositories/insight.repository";
import {
  getUploadedReportsByIds,
  type UploadedReportSummary,
} from "@/lib/repositories/reports.repository";
import type {
  HealthIntelligenceSummaryData,
} from "@/lib/health-intelligence/engines/health-intelligence-summary.engine";
import type {
  HealthRuntimeModuleResult,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime";
import {
  getIntelligenceSummary,
} from "@/lib/services/intelligence/intelligence.service";

export type IntelligencePageLanguage = "en" | "ar";

export type IntelligencePageInsight =
  HealthInsightSummary & {
    extraction_status: string | null;
    extracted_text: string | null;
    extracted_at: string | null;
    file_name: string;
    file_path: string | null;
    uploaded_at: string;
  };

export type IntelligencePageLoaderData = {
  intelligenceSummary: Awaited<
    ReturnType<typeof getIntelligenceSummary>
  >;
  intelligenceSummaryV2:
    | HealthRuntimeModuleResult<HealthIntelligenceSummaryData>
    | null;
  insights: IntelligencePageInsight[];
  latestGeneratedResult:
    | SavedGeneratedIntelligenceResult
    | null;
};

export type IntelligencePageLoaderResult =
  | {
      success: true;
      data: IntelligencePageLoaderData;
    }
  | {
      success: false;
      errorMessage: string;
    };

type IntelligenceSummaryApiPayload = {
  summary?:
    | HealthRuntimeModuleResult<HealthIntelligenceSummaryData>
    | null;
};

function mergeInsightsWithReports(
  insights: HealthInsightSummary[],
  reports: UploadedReportSummary[]
): IntelligencePageInsight[] {
  return insights.map((insight) => {
    const report = reports.find(
      (reportItem) => reportItem.id === insight.report_id
    );

    return {
      ...insight,
      file_name: report?.file_name || "Medical report",
      file_path: report?.file_path || null,
      uploaded_at: report?.created_at || insight.created_at,
      extraction_status:
        report?.extraction_status || "Pending",
      extracted_text: report?.extracted_text || null,
      extracted_at: report?.extracted_at || null,
    };
  });
}

async function loadUnifiedIntelligenceSummary(
  userId: string,
  language: IntelligencePageLanguage
): Promise<
  | HealthRuntimeModuleResult<HealthIntelligenceSummaryData>
  | null
> {
  try {
    const response = await fetch(
      "/api/intelligence-summary",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          language,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Could not load the unified intelligence summary."
      );
    }

    const payload =
      (await response.json()) as IntelligenceSummaryApiPayload;

    return payload.summary ?? null;
  } catch (error) {
    console.error(
      "Unified intelligence summary error:",
      error
    );

    return null;
  }
}

export async function loadIntelligencePage(
  userId: string,
  language: IntelligencePageLanguage
): Promise<IntelligencePageLoaderResult> {
  const [
    intelligenceSummaryResult,
    intelligenceSummaryV2Result,
    insightsResult,
  ] = await Promise.allSettled([
    getIntelligenceSummary(userId),
    loadUnifiedIntelligenceSummary(userId, language),
    getRecentHealthInsights(userId, 20),
  ]);

  if (intelligenceSummaryResult.status === "rejected") {
    return {
      success: false,
      errorMessage:
        intelligenceSummaryResult.reason instanceof Error
          ? `Database error: ${intelligenceSummaryResult.reason.message}`
          : "Database error",
    };
  }

  if (insightsResult.status === "rejected") {
    return {
      success: false,
      errorMessage:
        language === "ar"
          ? "تعذر تحميل نتائج الذكاء الصحي."
          : "Could not load health intelligence results.",
    };
  }

  const intelligenceSummary =
    intelligenceSummaryResult.value;

  const intelligenceSummaryV2 =
    intelligenceSummaryV2Result.status === "fulfilled"
      ? intelligenceSummaryV2Result.value
      : null;

  const insights = insightsResult.value;

  const reportIds = insights
    .map((insight) => insight.report_id)
    .filter(
      (reportId): reportId is number =>
        reportId !== null
    );

  const insightIds = insights.map(
    (insight) => insight.id
  );

  const [
    reportsResult,
    latestGeneratedResultResult,
  ] = await Promise.allSettled([
    reportIds.length > 0
      ? getUploadedReportsByIds(userId, reportIds)
      : Promise.resolve([] as UploadedReportSummary[]),
    insightIds.length > 0
      ? getLatestGeneratedResultByInsightIds(
          userId,
          insightIds
        )
      : Promise.resolve(
          null as SavedGeneratedIntelligenceResult | null
        ),
  ]);

  const reports =
    reportsResult.status === "fulfilled"
      ? reportsResult.value
      : [];

  const latestGeneratedResult =
    latestGeneratedResultResult.status === "fulfilled"
      ? latestGeneratedResultResult.value
      : null;

  const mergedInsights =
    mergeInsightsWithReports(
      insights,
      reports
    );

  return {
    success: true,
    data: {
      intelligenceSummary,
      intelligenceSummaryV2,
      insights: mergedInsights,
      latestGeneratedResult,
    },
  };
}
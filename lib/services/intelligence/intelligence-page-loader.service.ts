import {
  supabase,
} from "@/lib/supabase";

import type {
  AssessmentSummary,
} from "@/lib/models/assessment";

import type {
  HealthIntelligenceResult,
} from "@/lib/health-intelligence/models/health-intelligence-result";

import type {
  HealthIntelligenceSummaryData,
} from "@/lib/health-intelligence/engines/health-intelligence-summary.engine";

import type {
  HealthRuntimeModuleResult,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime";

import type {
  DailyCheckInSummary,
} from "@/lib/repositories/checkin.repository";

import {
  getLatestGeneratedResultByInsightIds,
  type HealthInsightSummary,
  type SavedGeneratedIntelligenceResult,
} from "@/lib/repositories/insight.repository";

import {
  getUploadedReportsByIds,
  type UploadedReportSummary,
} from "@/lib/repositories/reports.repository";

export type IntelligencePageLanguage =
  | "en"
  | "ar";

export type LegacyIntelligenceSummary = {
  assessments:
    AssessmentSummary[];

  latestCheckIn:
    DailyCheckInSummary | null;

  healthIntelligence:
    HealthIntelligenceResult;
};

export type IntelligencePageInsight =
  HealthInsightSummary & {
    extraction_status:
      string | null;

    extracted_text:
      string | null;

    extracted_at:
      string | null;

    file_name:
      string;

    file_path:
      string | null;

    uploaded_at:
      string;
  };

export type IntelligencePageLoaderData = {
  intelligenceSummary:
    LegacyIntelligenceSummary;

  intelligenceSummaryV2:
    | HealthRuntimeModuleResult<
        HealthIntelligenceSummaryData
      >
    | null;

  insights:
    IntelligencePageInsight[];

  latestGeneratedResult:
    | SavedGeneratedIntelligenceResult
    | null;
};

export type IntelligencePageLoaderResult =
  | {
      success:
        true;

      data:
        IntelligencePageLoaderData;
    }
  | {
      success:
        false;

      errorMessage:
        string;
    };

type IntelligenceSummaryApiPayload = {
  intelligenceSummary?:
    LegacyIntelligenceSummary;

  healthInsights?:
    HealthInsightSummary[];

  uploadedReports?:
    UploadedReportSummary[];

  summary?:
    | HealthRuntimeModuleResult<
        HealthIntelligenceSummaryData
      >
    | null;
};

function mergeInsightsWithReports(
  insights:
    HealthInsightSummary[],
  reports:
    UploadedReportSummary[]
): IntelligencePageInsight[] {
  const reportsById =
    new Map(
      reports.map(
        (report) => [
          Number(
            report.id
          ),
          report,
        ]
      )
    );

  return insights.map(
    (insight) => {
      const report =
        insight.report_id !== null
          ? reportsById.get(
              Number(
                insight.report_id
              )
            )
          : undefined;

      return {
        ...insight,

        file_name:
          report?.file_name ||
          "Medical report",

        file_path:
          report?.file_path ??
          null,

        uploaded_at:
          report?.created_at ||
          insight.created_at,

        extraction_status:
          report?.extraction_status ||
          "Pending",

        extracted_text:
          report?.extracted_text ??
          null,

        extracted_at:
          report?.extracted_at ??
          null,
      };
    }
  );
}

async function loadIntelligenceSummaries(
  language:
    IntelligencePageLanguage,
  requestedReportId?:
    number
): Promise<
  IntelligenceSummaryApiPayload
> {
  const {
    data:
      sessionData,
    error:
      sessionError,
  } =
    await supabase.auth
      .getSession();

  const accessToken =
    sessionData.session
      ?.access_token;

  if (
    sessionError ||
    !accessToken
  ) {
    throw new Error(
      "Your session has expired. Please sign in again."
    );
  }

  const validRequestedReportId =
    typeof requestedReportId ===
      "number" &&
    Number.isInteger(
      requestedReportId
    ) &&
    requestedReportId > 0
      ? requestedReportId
      : undefined;

  const response =
    await fetch(
      "/api/intelligence-summary",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${accessToken}`,
        },

        body:
          JSON.stringify({
            language,

            reportId:
              validRequestedReportId,
          }),
      }
    );

  if (!response.ok) {
    const errorPayload =
      (await response
        .json()
        .catch(
          () => null
        )) as
        | {
            error?:
              string;
          }
        | null;

    throw new Error(
      errorPayload?.error ||
        "Could not load the intelligence summaries."
    );
  }

  return (
    await response.json()
  ) as IntelligenceSummaryApiPayload;
}

export async function loadIntelligencePage(
  userId:
    string,
  language:
    IntelligencePageLanguage,
  requestedReportId?:
    number
): Promise<
  IntelligencePageLoaderResult
> {
  let summaryPayload:
    IntelligenceSummaryApiPayload;

  try {
    summaryPayload =
      await loadIntelligenceSummaries(
        language,
        requestedReportId
      );
  } catch (error) {
    return {
      success:
        false,

      errorMessage:
        error instanceof Error
          ? `Database error: ${error.message}`
          : "Database error",
    };
  }

  if (
    !summaryPayload
      .intelligenceSummary
  ) {
    return {
      success:
        false,

      errorMessage:
        language === "ar"
          ? "تعذر تحميل ملخص الذكاء الصحي."
          : "Could not load the health intelligence summary.",
    };
  }

  const intelligenceSummary =
    summaryPayload
      .intelligenceSummary;

  const intelligenceSummaryV2 =
    summaryPayload.summary ??
    null;

  const insights =
    summaryPayload
      .healthInsights ??
    [];

  const reportIds =
    Array.from(
      new Set(
        insights
          .map(
            (insight) =>
              insight.report_id
          )
          .filter(
            (
              reportId
            ): reportId is number =>
              reportId !== null
          )
      )
    );

  const validRequestedReportId =
    typeof requestedReportId ===
      "number" &&
    Number.isInteger(
      requestedReportId
    ) &&
    requestedReportId > 0
      ? requestedReportId
      : null;

  if (
    validRequestedReportId !==
      null &&
    !reportIds.includes(
      validRequestedReportId
    )
  ) {
    reportIds.unshift(
      validRequestedReportId
    );
  }

  const availableReports =
    summaryPayload
      .uploadedReports ??
    [];

  const availableReportIds =
    new Set(
      availableReports.map(
        (report) =>
          Number(
            report.id
          )
      )
    );

  const missingReportIds =
    reportIds.filter(
      (reportId) =>
        !availableReportIds.has(
          reportId
        )
    );

  const insightIds =
    insights.map(
      (insight) =>
        insight.id
    );

  const [
    reportsResult,
    latestGeneratedResultResult,
  ] =
    await Promise.allSettled([
      missingReportIds.length >
      0
        ? getUploadedReportsByIds(
            userId,
            missingReportIds
          )
        : Promise.resolve(
            [] as
              UploadedReportSummary[]
          ),

      insightIds.length > 0
        ? getLatestGeneratedResultByInsightIds(
            userId,
            insightIds
          )
        : Promise.resolve(
            null as
              | SavedGeneratedIntelligenceResult
              | null
          ),
    ]);

  const additionalReports =
    reportsResult.status ===
    "fulfilled"
      ? reportsResult.value
      : [];

  const reports = [
    ...availableReports,
    ...additionalReports,
  ];

  const latestGeneratedResult =
    latestGeneratedResultResult
      .status ===
    "fulfilled"
      ? latestGeneratedResultResult
          .value
      : null;

  const mergedInsights =
    mergeInsightsWithReports(
      insights,
      reports
    );

  return {
    success:
      true,

    data: {
      intelligenceSummary,

      intelligenceSummaryV2,

      insights:
        mergedInsights,

      latestGeneratedResult,
    },
  };
}
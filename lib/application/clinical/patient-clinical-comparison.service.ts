import type {
  PatientSummary,
} from "@/lib/models/patient";

import type {
  HealthInsightSummary,
} from "@/lib/repositories/insight.repository";

import type {
  UploadedReportSummary,
} from "@/lib/repositories/reports.repository";

export type ClinicalReportComparisonItem = {
  report:
    UploadedReportSummary;

  insight:
    | HealthInsightSummary
    | null;
};

export type PatientClinicalComparison = {
  latest:
    | ClinicalReportComparisonItem
    | null;

  previous:
    | ClinicalReportComparisonItem
    | null;

  hasComparison:
    boolean;

  comparisonReady:
    boolean;

  missingInformation:
    string[];
};

export type BuildPatientClinicalComparisonInput = {
  patientSummary:
    PatientSummary;
};

function getTimestamp(
  value:
    | string
    | null
    | undefined
): number {
  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function sortReportsNewestFirst(
  reports:
    UploadedReportSummary[]
): UploadedReportSummary[] {
  return [...reports].sort(
    (left, right) =>
      getTimestamp(
        right.created_at
      ) -
      getTimestamp(
        left.created_at
      )
  );
}

function findPreviousComparableReport(
  latestReport:
    UploadedReportSummary,
  olderReports:
    UploadedReportSummary[]
): UploadedReportSummary | null {
  const latestReportType =
    latestReport.report_type
      ?.trim()
      .toLocaleLowerCase() ??
    "";

  if (!latestReportType) {
    return olderReports[0] ?? null;
  }

  return (
    olderReports.find(
      (report) =>
        (
          report.report_type
            ?.trim()
            .toLocaleLowerCase() ??
          ""
        ) ===
        latestReportType
    ) ??
    null
  );
}

function getLatestInsightForReport(
  reportId: number,
  insights:
    HealthInsightSummary[]
): HealthInsightSummary | null {
  const matchingInsights =
    insights.filter(
      (insight) =>
        insight.report_id ===
        reportId
    );

  if (
    matchingInsights.length === 0
  ) {
    return null;
  }

  return [...matchingInsights].sort(
    (left, right) =>
      getTimestamp(
        right.created_at
      ) -
      getTimestamp(
        left.created_at
      )
  )[0];
}

function buildComparisonItem(
  report:
    UploadedReportSummary,
  insights:
    HealthInsightSummary[]
): ClinicalReportComparisonItem {
  return {
    report,

    insight:
      getLatestInsightForReport(
        report.id,
        insights
      ),
  };
}

export function buildPatientClinicalComparison({
  patientSummary,
}: BuildPatientClinicalComparisonInput): PatientClinicalComparison {
  const sortedReports =
    sortReportsNewestFirst(
      patientSummary.uploadedReports
    );

  const latestReport =
    sortedReports[0] ??
    null;

  const previousReport =
  latestReport
    ? findPreviousComparableReport(
        latestReport,
        sortedReports.slice(1)
      )
    : null;

  const latest =
    latestReport
      ? buildComparisonItem(
          latestReport,
          patientSummary.healthInsights
        )
      : null;

  const previous =
    previousReport
      ? buildComparisonItem(
          previousReport,
          patientSummary.healthInsights
        )
      : null;

  const missingInformation:
    string[] = [];

  if (!latestReport) {
    missingInformation.push(
      "latest_report"
    );
  }

  if (!previousReport) {
    missingInformation.push(
      "previous_report"
    );
  }

  if (
    latestReport &&
    !latest?.insight
  ) {
    missingInformation.push(
      "latest_report_insight"
    );
  }

  if (
    previousReport &&
    !previous?.insight
  ) {
    missingInformation.push(
      "previous_report_insight"
    );
  }

  return {
    latest,

    previous,

    hasComparison:
      Boolean(
        latest &&
        previous
      ),

    comparisonReady:
      Boolean(
        latest?.insight &&
        previous?.insight
      ),

    missingInformation,
  };
}
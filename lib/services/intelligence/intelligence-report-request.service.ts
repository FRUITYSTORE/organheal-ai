export type IntelligenceReportRequest = {
  requestedReportId: number;
  requestedInsightId: number;
  shouldAutoAnalyze: boolean;
  hasRequestedReport: boolean;
  hasRequestedInsight: boolean;
  requestKey: string;
};

export function getIntelligenceReportRequest(
  search: string
): IntelligenceReportRequest {
  const params = new URLSearchParams(search);

  const requestedReportId = Number(
    params.get("reportId") || 0
  );

  const requestedInsightId = Number(
    params.get("insightId") || 0
  );

  const shouldAutoAnalyze =
    params.get("auto") === "1";

  const hasRequestedReport =
    requestedReportId > 0 &&
    !Number.isNaN(requestedReportId);

  const hasRequestedInsight =
    requestedInsightId > 0 &&
    !Number.isNaN(requestedInsightId);

  const requestKey =
    `${requestedReportId || 0}:` +
    `${requestedInsightId || 0}:` +
    `${shouldAutoAnalyze ? "auto" : "view"}`;

  return {
    requestedReportId,
    requestedInsightId,
    shouldAutoAnalyze,
    hasRequestedReport,
    hasRequestedInsight,
    requestKey,
  };
}
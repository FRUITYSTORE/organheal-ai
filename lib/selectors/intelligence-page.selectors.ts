export type IntelligenceReportSelectionItem = {
  id: number;
  report_id: number | null;
  ai_status: string | null;
};

type GetFocusedReportInsightInput<
  TInsight extends IntelligenceReportSelectionItem
> = {
  healthInsights: TInsight[];
  requestedReportId: number;
  activeGeneratedInsightId: number | null;
};

export function getFocusedReportInsight<
  TInsight extends IntelligenceReportSelectionItem
>({
  healthInsights,
  requestedReportId,
  activeGeneratedInsightId,
}: GetFocusedReportInsightInput<TInsight>): TInsight | null {
  const requestedInsight =
    requestedReportId > 0 && !Number.isNaN(requestedReportId)
      ? healthInsights.find(
          (item) =>
            Number(item.report_id) === requestedReportId ||
            Number(item.id) === requestedReportId
        )
      : undefined;

  if (requestedInsight) {
    return requestedInsight;
  }

  const activeGeneratedInsight = activeGeneratedInsightId
    ? healthInsights.find(
        (item) => item.id === activeGeneratedInsightId
      )
    : undefined;

  if (activeGeneratedInsight) {
    return activeGeneratedInsight;
  }

  return (
    healthInsights.find(
      (item) => item.ai_status !== "Generated"
    ) ??
    healthInsights[0] ??
    null
  );
}
export type IntelligenceReportStatisticsItem = {
  ai_status: string | null;
  extraction_status?: string | null;
};

export type IntelligenceReportStatistics = {
  totalReportInsights: number;
  generatedReportsCount: number;
  pendingReportsCount: number;
  completedExtractionCount: number;
};

export function getIntelligenceReportStatistics<
  TInsight extends IntelligenceReportStatisticsItem
>(
  healthInsights: TInsight[]
): IntelligenceReportStatistics {
  const totalReportInsights = healthInsights.length;

  const generatedReportsCount = healthInsights.filter(
    (item) => item.ai_status === "Generated"
  ).length;

  const pendingReportsCount = Math.max(
    totalReportInsights - generatedReportsCount,
    0
  );

  const completedExtractionCount = healthInsights.filter(
    (item) => item.extraction_status === "Completed"
  ).length;

  return {
    totalReportInsights,
    generatedReportsCount,
    pendingReportsCount,
    completedExtractionCount,
  };
}
export type IntelligenceReportListItem = {
  id: number;
};

type GetIntelligenceReportListViewInput<
  TInsight extends IntelligenceReportListItem
> = {
  healthInsights: TInsight[];
  visibleReportsCount: number;
  reportsPageSize: number;
  focusedReportInsight: TInsight | null;
};

export type IntelligenceReportListView<
  TInsight extends IntelligenceReportListItem
> = {
  visibleHealthInsights: TInsight[];
  compactHealthInsights: TInsight[];
  hasOlderReports: boolean;
  canShowLessReports: boolean;
};

export function getIntelligenceReportListView<
  TInsight extends IntelligenceReportListItem
>({
  healthInsights,
  visibleReportsCount,
  reportsPageSize,
  focusedReportInsight,
}: GetIntelligenceReportListViewInput<TInsight>): IntelligenceReportListView<TInsight> {
  const visibleHealthInsights = healthInsights.slice(
    0,
    visibleReportsCount
  );

  const compactHealthInsights = focusedReportInsight
    ? visibleHealthInsights.filter(
        (item) => item.id !== focusedReportInsight.id
      )
    : visibleHealthInsights;

  return {
    visibleHealthInsights,
    compactHealthInsights,
    hasOlderReports:
      healthInsights.length > visibleReportsCount,
    canShowLessReports:
      visibleReportsCount > reportsPageSize,
  };
}
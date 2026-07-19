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
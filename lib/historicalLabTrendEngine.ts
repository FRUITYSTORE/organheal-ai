export type LabTrendPoint = {
  marker: string;
  value: number;
  date: string;
};

export type LabTrendResult = {
  marker: string;
  earliestValue: number;
  latestValue: number;
  changeAmount: number;
  trendDirection: "Improving" | "Stable" | "Worsening";
  trendSummary: string;
};

export function buildHistoricalLabTrends(
  points: LabTrendPoint[]
): LabTrendResult[] {
  const grouped = points.reduce<Record<string, LabTrendPoint[]>>(
    (acc, point) => {
      if (!acc[point.marker]) acc[point.marker] = [];
      acc[point.marker].push(point);
      return acc;
    },
    {}
  );

  return Object.entries(grouped)
    .filter(([, markerPoints]) => markerPoints.length >= 2)
    .map(([marker, markerPoints]) => {
      const sorted = markerPoints.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const earliestValue = sorted[0].value;
      const latestValue = sorted[sorted.length - 1].value;
      const changeAmount = Number((latestValue - earliestValue).toFixed(2));

      let trendDirection: "Improving" | "Stable" | "Worsening" = "Stable";

      if (Math.abs(changeAmount) >= 5) {
        if (
          ["LDL", "Triglycerides", "ALT", "AST", "Bilirubin", "Creatinine", "HbA1c", "Glucose"].includes(marker)
        ) {
          trendDirection = changeAmount < 0 ? "Improving" : "Worsening";
        } else if (["HDL", "Vitamin D", "eGFR", "Hemoglobin"].includes(marker)) {
          trendDirection = changeAmount > 0 ? "Improving" : "Worsening";
        }
      }

      return {
        marker,
        earliestValue,
        latestValue,
        changeAmount,
        trendDirection,
        trendSummary: `${marker} changed from ${earliestValue} to ${latestValue}. Trend: ${trendDirection}.`,
      };
    });
}
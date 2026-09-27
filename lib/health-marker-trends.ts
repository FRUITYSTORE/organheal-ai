import {
  buildHistoricalLabTrends,
  buildHistoricalLabTrendSeries,
  classifyMarkerDirection,
  type LabTrendPoint,
  type LabTrendResult,
  type LabTrendSeries,
} from "@/lib/historicalLabTrendEngine";
import type { ReportMedicalMarkerEvidence } from "@/lib/repositories/report-markers.repository";

export type MarkerDirection = "Improving" | "Stable" | "Worsening";

export type MarkerTrend = {
  trend: LabTrendResult;
  series: LabTrendSeries;
  latestStatus: ReportMedicalMarkerEvidence["marker_status"] | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  // Direction over the last few readings only, for display badges. Kept
  // separate from trend.trendDirection (earliest vs. latest across the whole
  // history), which still drives which marker gets headlined — this only
  // fixes what the badge itself says, e.g. a marker that spiked months ago
  // and has been improving since no longer reads as "Worsening".
  recentDirection: MarkerDirection;
};

// How many of the most recent readings define "recent" for the badge. 3
// keeps a little noise tolerance; with only 2 readings it is simply those two.
const RECENT_WINDOW = 3;

function classifyRecentDirection(series: LabTrendSeries, marker: string): MarkerDirection {
  const window = series.points.slice(-RECENT_WINDOW);
  const changeAmount = Number(
    (window[window.length - 1].value - window[0].value).toFixed(2)
  );

  return classifyMarkerDirection(marker, changeAmount);
}

function toTrendPoints(rows: ReportMedicalMarkerEvidence[]): LabTrendPoint[] {
  return rows.map((row) => ({
    marker: row.marker_name,
    value: row.marker_value,
    unit: row.marker_unit,
    date: row.created_at,
  }));
}

// Combines the existing earliest/latest classification with the full point
// series for charting, plus the most recent reading's status and reference
// range (for shading the "normal" band). A marker only appears here when it
// has at least two comparable readings — the same rule buildHistoricalLabTrends
// already applies, so this never disagrees with it.
export function buildMarkerTrends(rows: ReportMedicalMarkerEvidence[]): MarkerTrend[] {
  const points = toTrendPoints(rows);
  const trends = buildHistoricalLabTrends(points);
  const seriesByMarker = new Map(
    buildHistoricalLabTrendSeries(points).map((series) => [series.marker, series])
  );

  // Most recent row per marker, for the reference band and current status.
  const latestByMarker = new Map<string, ReportMedicalMarkerEvidence>();

  for (const row of rows) {
    const existing = latestByMarker.get(row.marker_name);

    if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
      latestByMarker.set(row.marker_name, row);
    }
  }

  const entries: MarkerTrend[] = [];

  for (const trend of trends) {
    const series = seriesByMarker.get(trend.marker);
    const latest = latestByMarker.get(trend.marker);

    if (!series) {
      continue;
    }

    entries.push({
      trend,
      series,
      latestStatus: latest?.marker_status ?? null,
      referenceLow: latest?.reference_low ?? null,
      referenceHigh: latest?.reference_high ?? null,
      recentDirection: classifyRecentDirection(series, trend.marker),
    });
  }

  return entries;
}

// Picks one marker to headline on the homepage: a real change (Improving or
// Worsening) first, otherwise the marker with the most readings, so the
// chart shown is never a flat, uninformative line.
export function pickHeadlineMarkerTrend(trends: MarkerTrend[]): MarkerTrend | null {
  if (trends.length === 0) {
    return null;
  }

  const moving = trends.filter((entry) => entry.trend.trendDirection !== "Stable");

  if (moving.length > 0) {
    return [...moving].sort((a, b) => b.series.points.length - a.series.points.length)[0];
  }

  return [...trends].sort((a, b) => b.series.points.length - a.series.points.length)[0];
}

import { describe, expect, it } from "vitest";

import {
  buildHistoricalLabTrendSeries,
  buildHistoricalLabTrends,
} from "../lib/historicalLabTrendEngine";
import { buildMarkerTrends, pickHeadlineMarkerTrend } from "../lib/health-marker-trends";
import type { ReportMedicalMarkerEvidence } from "../lib/repositories/report-markers.repository";

function row(
  overrides: Partial<ReportMedicalMarkerEvidence>
): ReportMedicalMarkerEvidence {
  return {
    report_id: 1,
    marker_name: "LDL",
    marker_value: 100,
    marker_unit: "mg/dL",
    marker_status: "Normal",
    reference_low: 0,
    reference_high: 130,
    reference_source: "default",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildHistoricalLabTrendSeries", () => {
  it("mirrors buildHistoricalLabTrends' rules: needs 2+ points and compatible units", () => {
    const points = [
      { marker: "LDL", value: 160, unit: "mg/dL", date: "2026-01-01" },
      { marker: "LDL", value: 130, unit: "mg/dL", date: "2026-04-01" },
      { marker: "LDL", value: 110, unit: "mg/dL", date: "2026-07-01" },
      { marker: "HDL", value: 40, unit: "mg/dL", date: "2026-01-01" },
    ];

    const trends = buildHistoricalLabTrends(points);
    const series = buildHistoricalLabTrendSeries(points);

    // Both only ever include markers with 2+ comparable readings: HDL is
    // dropped by both since it only has one point here.
    expect(trends.map((t) => t.marker)).toEqual(["LDL"]);
    expect(series).toHaveLength(1);
    expect(series[0].marker).toBe("LDL");
    expect(series[0].points.map((p) => p.value)).toEqual([160, 130, 110]);
    expect(series[0].points.map((p) => p.date)).toEqual([
      "2026-01-01",
      "2026-04-01",
      "2026-07-01",
    ]);
  });

  it("keeps every point in date order even when input is unsorted", () => {
    const points = [
      { marker: "Glucose", value: 110, unit: "mg/dL", date: "2026-06-01" },
      { marker: "Glucose", value: 95, unit: "mg/dL", date: "2026-01-01" },
    ];

    expect(buildHistoricalLabTrendSeries(points)[0].points.map((p) => p.value)).toEqual([
      95, 110,
    ]);
  });

  it("drops a marker with incompatible units instead of comparing them", () => {
    const points = [
      { marker: "HDL", value: 40, unit: "mg/dL", date: "2026-01-01" },
      { marker: "HDL", value: 1.0, unit: "mmol/L", date: "2026-06-01" },
    ];

    expect(buildHistoricalLabTrendSeries(points)).toEqual([]);
  });
});

describe("buildMarkerTrends", () => {
  it("attaches the latest status and reference range to a marker that has a real trend", () => {
    const rows = [
      row({ marker_value: 160, created_at: "2026-01-01T00:00:00Z", marker_status: "High" }),
      row({
        marker_value: 100,
        created_at: "2026-06-01T00:00:00Z",
        marker_status: "Normal",
        reference_high: 130,
      }),
    ];

    const trends = buildMarkerTrends(rows);

    expect(trends).toHaveLength(1);
    expect(trends[0].trend.marker).toBe("LDL");
    expect(trends[0].trend.trendDirection).toBe("Improving");
    expect(trends[0].series.points).toHaveLength(2);
    expect(trends[0].latestStatus).toBe("Normal");
    expect(trends[0].referenceHigh).toBe(130);
  });

  it("returns nothing for a marker with only one reading", () => {
    expect(buildMarkerTrends([row({})])).toEqual([]);
  });

  it("keeps multiple markers independent of each other", () => {
    const rows = [
      row({ marker_name: "LDL", marker_value: 160, created_at: "2026-01-01T00:00:00Z" }),
      row({ marker_name: "LDL", marker_value: 110, created_at: "2026-06-01T00:00:00Z" }),
      row({ marker_name: "HDL", marker_value: 40, created_at: "2026-01-01T00:00:00Z", reference_low: 40, reference_high: null }),
      row({ marker_name: "HDL", marker_value: 55, created_at: "2026-06-01T00:00:00Z", reference_low: 40, reference_high: null }),
    ];

    const trends = buildMarkerTrends(rows);

    expect(trends.map((t) => t.trend.marker).sort()).toEqual(["HDL", "LDL"]);
  });
});

describe("recentDirection", () => {
  it("reports the recent improvement even when the marker is still Worsening overall", () => {
    // Mirrors the AST case seen in production: a rise months ago, then a
    // clear recent recovery. trend.trendDirection stays "Worsening"
    // (earliest vs. latest across the whole history), but the badge should
    // say "Improving" because the last few readings are trending down.
    const rows = [
      row({ marker_name: "AST", marker_value: 19, created_at: "2026-06-01T00:00:00Z" }),
      row({ marker_name: "AST", marker_value: 65, created_at: "2026-07-15T00:00:00Z" }),
      row({ marker_name: "AST", marker_value: 60, created_at: "2026-08-10T00:00:00Z" }),
      row({ marker_name: "AST", marker_value: 45, created_at: "2026-08-25T00:00:00Z" }),
      row({ marker_name: "AST", marker_value: 30, created_at: "2026-09-05T00:00:00Z" }),
    ];

    const [trend] = buildMarkerTrends(rows);

    expect(trend.trend.trendDirection).toBe("Worsening");
    expect(trend.recentDirection).toBe("Improving");
  });

  it("matches the overall direction when only two readings exist", () => {
    const rows = [
      row({ marker_name: "LDL", marker_value: 160, created_at: "2026-01-01T00:00:00Z" }),
      row({ marker_name: "LDL", marker_value: 100, created_at: "2026-06-01T00:00:00Z" }),
    ];

    const [trend] = buildMarkerTrends(rows);

    expect(trend.trend.trendDirection).toBe("Improving");
    expect(trend.recentDirection).toBe("Improving");
  });

  it("stays Stable when the last few readings barely move", () => {
    const rows = [
      row({ marker_name: "AST", marker_value: 65, created_at: "2026-06-01T00:00:00Z" }),
      row({ marker_name: "AST", marker_value: 20, created_at: "2026-07-01T00:00:00Z" }),
      row({ marker_name: "AST", marker_value: 21, created_at: "2026-08-01T00:00:00Z" }),
      row({ marker_name: "AST", marker_value: 19, created_at: "2026-09-01T00:00:00Z" }),
    ];

    const [trend] = buildMarkerTrends(rows);

    expect(trend.recentDirection).toBe("Stable");
  });
});

describe("pickHeadlineMarkerTrend", () => {
  it("returns null when there is nothing to show", () => {
    expect(pickHeadlineMarkerTrend([])).toBeNull();
  });

  it("prefers a marker that actually moved over one that stayed flat", () => {
    const rows = [
      row({ marker_name: "LDL", marker_value: 100, created_at: "2026-01-01T00:00:00Z" }),
      row({ marker_name: "LDL", marker_value: 101, created_at: "2026-06-01T00:00:00Z" }),
      row({ marker_name: "Glucose", marker_value: 110, created_at: "2026-01-01T00:00:00Z" }),
      row({ marker_name: "Glucose", marker_value: 85, created_at: "2026-06-01T00:00:00Z" }),
    ];

    const headline = pickHeadlineMarkerTrend(buildMarkerTrends(rows));

    expect(headline?.trend.marker).toBe("Glucose");
    expect(headline?.trend.trendDirection).toBe("Improving");
  });

  it("falls back to the marker with the most readings when nothing moved", () => {
    const rows = [
      row({ marker_name: "LDL", marker_value: 100, created_at: "2026-01-01T00:00:00Z" }),
      row({ marker_name: "LDL", marker_value: 100, created_at: "2026-06-01T00:00:00Z" }),
      row({ marker_name: "HDL", marker_value: 45, created_at: "2026-01-01T00:00:00Z" }),
      row({ marker_name: "HDL", marker_value: 45, created_at: "2026-03-01T00:00:00Z" }),
      row({ marker_name: "HDL", marker_value: 45, created_at: "2026-06-01T00:00:00Z" }),
    ];

    expect(pickHeadlineMarkerTrend(buildMarkerTrends(rows))?.trend.marker).toBe("HDL");
  });
});

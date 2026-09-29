import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {},
}));

import { pickLatestHeartMarkers } from "../lib/heart-age/latest-heart-markers";

describe("pickLatestHeartMarkers", () => {
  it("returns null for both markers when there is no data", () => {
    const result = pickLatestHeartMarkers([]);
    expect(result.totalCholesterol).toBeNull();
    expect(result.hdlCholesterol).toBeNull();
  });

  it("picks the most recent value when a marker appears in multiple reports", () => {
    const result = pickLatestHeartMarkers([
      {
        marker_name: "Total Cholesterol",
        marker_value: 210,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        marker_name: "Total Cholesterol",
        marker_value: 195,
        created_at: "2026-06-01T00:00:00.000Z",
      },
      {
        marker_name: "Total Cholesterol",
        marker_value: 240,
        created_at: "2026-03-01T00:00:00.000Z",
      },
    ]);

    expect(result.totalCholesterol).toEqual({
      value: 195,
      reportDate: "2026-06-01T00:00:00.000Z",
    });
  });

  it("resolves Total Cholesterol and HDL independently", () => {
    const result = pickLatestHeartMarkers([
      {
        marker_name: "Total Cholesterol",
        marker_value: 200,
        created_at: "2026-02-01T00:00:00.000Z",
      },
      {
        marker_name: "HDL",
        marker_value: 45,
        created_at: "2026-05-01T00:00:00.000Z",
      },
      {
        marker_name: "LDL",
        marker_value: 130,
        created_at: "2026-05-01T00:00:00.000Z",
      },
    ]);

    expect(result.totalCholesterol?.value).toBe(200);
    expect(result.hdlCholesterol?.value).toBe(45);
  });

  it("ignores markers it doesn't care about (e.g. LDL, Glucose)", () => {
    const result = pickLatestHeartMarkers([
      {
        marker_name: "Glucose",
        marker_value: 95,
        created_at: "2026-05-01T00:00:00.000Z",
      },
      {
        marker_name: "LDL",
        marker_value: 130,
        created_at: "2026-05-01T00:00:00.000Z",
      },
    ]);

    expect(result.totalCholesterol).toBeNull();
    expect(result.hdlCholesterol).toBeNull();
  });
});

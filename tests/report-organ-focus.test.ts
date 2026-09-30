import { describe, expect, it } from "vitest";

import { detectLabMarkers, type LabMarkerResult } from "../lib/labMarkerDetector";
import { MAX_ORGANS_PER_VIDEO, deriveReportOrganFocus } from "../lib/video-studio/report-organ-focus";

function marker(overrides: Partial<LabMarkerResult> & Pick<LabMarkerResult, "marker" | "category">): LabMarkerResult {
  return { value: 1, unit: "mg/dL", status: "Normal", note: "", ...overrides };
}

describe("deriveReportOrganFocus", () => {
  it("shows no organ when the report has no organ marker, rather than a made-up one", () => {
    expect(deriveReportOrganFocus([])).toEqual([]);
    expect(deriveReportOrganFocus([marker({ marker: "Vitamin D", category: "Vitamins", status: "Low" })])).toEqual([]);
  });

  it("picks the organ from the report's own markers", () => {
    const [focus] = deriveReportOrganFocus([
      marker({ marker: "ALT", category: "Liver", value: 88, unit: "U/L", status: "High" }),
    ]);

    expect(focus).toEqual({
      organ: "liver",
      markers: [{ name: "ALT", value: 88, unit: "U/L", status: "High" }],
      highlighted: ["liverCells"],
    });
  });

  it("lights up only the structures an out-of-range value points to", () => {
    const [liver] = deriveReportOrganFocus([
      marker({ marker: "ALT", category: "Liver", status: "Normal" }),
      marker({ marker: "Bilirubin", category: "Liver", status: "High" }),
    ]);

    expect(liver.highlighted).toEqual(["bileDucts"]);
    expect(liver.markers.map((m) => m.name)).toEqual(["Bilirubin", "ALT"]);

    const [calm] = deriveReportOrganFocus([marker({ marker: "TSH", category: "Thyroid", status: "Normal" })]);
    expect(calm).toMatchObject({ organ: "thyroid", highlighted: [] });
  });

  it("puts the organ with more out-of-range values first and caps the count", () => {
    const organs = deriveReportOrganFocus([
      marker({ marker: "TSH", category: "Thyroid", status: "High" }),
      marker({ marker: "LDL", category: "Lipids", status: "High" }),
      marker({ marker: "HDL", category: "Lipids", status: "Low" }),
      marker({ marker: "Creatinine", category: "Kidney", status: "High" }),
    ]);

    expect(organs).toHaveLength(MAX_ORGANS_PER_VIDEO);
    expect(organs[0]).toMatchObject({ organ: "heart", highlighted: ["coronaryArteries"] });
  });

  it("only gives the second slot to an organ with an out-of-range value", () => {
    const organs = deriveReportOrganFocus([
      marker({ marker: "Hemoglobin", category: "Blood Count", status: "Low" }),
      marker({ marker: "Ferritin", category: "Iron", status: "Low" }),
      marker({ marker: "Glucose", category: "Metabolic", status: "Normal" }),
    ]);

    expect(organs.map((focus) => focus.organ)).toEqual(["blood"]);
    expect(organs[0].highlighted).toEqual(["redCells"]);
  });

  it("works end to end on real report text through the site's own detector", () => {
    const organs = deriveReportOrganFocus(detectLabMarkers("LDL 172 mg/dL  HDL 38 mg/dL  Total Cholesterol 241 mg/dL"));

    expect(organs[0]?.organ).toBe("heart");
    expect(organs[0]?.markers.map((m) => m.name)).toEqual(expect.arrayContaining(["LDL", "HDL", "Total Cholesterol"]));
  });
});

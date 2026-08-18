import {
  describe,
  expect,
  it,
} from "vitest";

import {
  detectLabMarkers,
} from "@/lib/labMarkerDetector";

describe(
  "Lab marker detector",
  () => {
    it(
      "does not match AST inside fasting glucose",
      () => {
        const results =
          detectLabMarkers(`
            Laboratory Results

            Fasting glucose 128 mg/dL
          `);

        const glucose =
          results.find(
            (result) =>
              result.marker ===
              "Glucose"
          );

        const ast =
          results.find(
            (result) =>
              result.marker ===
              "AST"
          );

        expect(
          glucose?.value
        ).toBe(
          128
        );

        expect(
          ast
        ).toBeUndefined();
      }
    );

    it(
      "still detects a real AST value",
      () => {
        const results =
          detectLabMarkers(`
            Laboratory Results

            AST 42 U/L
            Fasting glucose 128 mg/dL
          `);

        const ast =
          results.find(
            (result) =>
              result.marker ===
              "AST"
          );

        const glucose =
          results.find(
            (result) =>
              result.marker ===
              "Glucose"
          );

        expect(
          ast?.value
        ).toBe(
          42
        );

        expect(
          glucose?.value
        ).toBe(
          128
        );
      }
    );

    it(
      "extracts report-specific AST and ALT reference ranges from the real report layout",
      () => {
        const results =
          detectLabMarkers(`
            Laboratory Results

            Fasting glucose 128 mg/dL

            ALT 68 U/L 7-55 - HIGH
            AST 42 U/L 8-48
          `);

        const alt =
          results.find(
            (result) =>
              result.marker ===
              "ALT"
          );

        const ast =
          results.find(
            (result) =>
              result.marker ===
              "AST"
          );

        expect(
          alt?.value
        ).toBe(
          68
        );

        expect(
          alt?.referenceLow
        ).toBe(
          7
        );

        expect(
          alt?.referenceHigh
        ).toBe(
          55
        );

        expect(
          alt?.referenceSource
        ).toBe(
          "report"
        );

        expect(
          alt?.status
        ).toBe(
          "High"
        );

        expect(
          ast?.value
        ).toBe(
          42
        );

        expect(
          ast?.referenceLow
        ).toBe(
          8
        );

        expect(
          ast?.referenceHigh
        ).toBe(
          48
        );

        expect(
          ast?.referenceSource
        ).toBe(
          "report"
        );

        expect(
          ast?.status
        ).toBe(
          "Normal"
        );
      }
    );
  }
);
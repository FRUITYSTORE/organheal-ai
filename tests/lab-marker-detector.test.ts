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
  }
);
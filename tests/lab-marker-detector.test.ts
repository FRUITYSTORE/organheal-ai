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
        it(
      "does not capture the next marker value for HbA1c",
      () => {
        const results =
          detectLabMarkers(`
            Laboratory Results

            HbA1c 6.6 %
            Total Cholesterol 258 mg/dL
          `);

        const hba1c =
          results.find(
            (result) =>
              result.marker ===
              "HbA1c"
          );

        const totalCholesterol =
          results.find(
            (result) =>
              result.marker ===
              "Total Cholesterol"
          );

        expect(
          hba1c?.value
        ).toBe(
          6.6
        );

        expect(
          totalCholesterol?.value
        ).toBe(
          258
        );
      }
    );

    it(
      "does not treat CKD-EPI 2021 as the eGFR result",
      () => {
        const results =
          detectLabMarkers(`
            Kidney Function

            eGFR (CKD-EPI 2021) 105 mL/min/1.73m²
          `);

        const egfr =
          results.find(
            (result) =>
              result.marker ===
              "eGFR"
          );

        expect(
          egfr?.value
        ).toBe(
          105
        );

        expect(
          egfr?.value
        ).not.toBe(
          2021
        );
      }
    );
        it(
      "keeps challenge-report marker values associated with the correct tests",
      () => {
        const results =
          detectLabMarkers(`
            Synthetic Laboratory Report

            Fasting glucose 128 mg/dL
            HbA1c 6.6 %
            Total Cholesterol 258 mg/dL
            LDL 174 mg/dL
            HDL 0.93 mmol/L
            Triglycerides 240 mg/dL

            Creatinine 0.88 mg/dL
            eGFR (CKD-EPI 2021) 105 mL/min/1.73m²

            ALT 68 U/L
            AST 32 U/L

            Vitamin D 18 ng/mL
            Ferritin 11 ng/mL
          `);

        const getValue =
          (
            marker:
              string
          ) =>
            results.find(
              (result) =>
                result.marker ===
                marker
            )?.value;

        expect(
          getValue(
            "Glucose"
          )
        ).toBe(
          128
        );

        expect(
          getValue(
            "HbA1c"
          )
        ).toBe(
          6.6
        );

        expect(
          getValue(
            "Total Cholesterol"
          )
        ).toBe(
          258
        );

        expect(
          getValue(
            "LDL"
          )
        ).toBe(
          174
        );

        expect(
          getValue(
            "HDL"
          )
        ).toBe(
          0.93
        );

        expect(
          getValue(
            "Triglycerides"
          )
        ).toBe(
          240
        );

        expect(
          getValue(
            "Creatinine"
          )
        ).toBe(
          0.88
        );

        expect(
          getValue(
            "eGFR"
          )
        ).toBe(
          105
        );

        expect(
          getValue(
            "ALT"
          )
        ).toBe(
          68
        );

        expect(
          getValue(
            "AST"
          )
        ).toBe(
          32
        );

        expect(
          getValue(
            "Vitamin D"
          )
        ).toBe(
          18
        );

        expect(
          getValue(
            "Ferritin"
          )
        ).toBe(
          11
        );
      }
    );
        it(
      "preserves the HDL unit reported in the laboratory report",
      () => {
        const results =
          detectLabMarkers(`
            Lipid Profile

            HDL 0.93 mmol/L
          `);

        const hdl =
          results.find(
            (result) =>
              result.marker ===
              "HDL"
          );

        expect(
          hdl?.value
        ).toBe(
          0.93
        );

        expect(
          hdl?.unit
        ).toBe(
          "mmol/L"
        );
      }
    );

    it(
      "preserves the standard reported unit for LDL",
      () => {
        const results =
          detectLabMarkers(`
            Lipid Profile

            LDL 174 mg/dL
          `);

        const ldl =
          results.find(
            (result) =>
              result.marker ===
              "LDL"
          );

        expect(
          ldl?.value
        ).toBe(
          174
        );

        expect(
          ldl?.unit
        ).toBe(
          "mg/dL"
        );
      }
    );

    it(
      "preserves the reported eGFR unit after a method qualifier",
      () => {
        const results =
          detectLabMarkers(`
            Kidney Function

            eGFR (CKD-EPI 2021) 105 mL/min/1.73m²
          `);

        const egfr =
          results.find(
            (result) =>
              result.marker ===
              "eGFR"
          );

        expect(
          egfr?.value
        ).toBe(
          105
        );

        expect(
          egfr?.unit
        ).toBe(
          "mL/min/1.73m²"
        );
      }
    );
    it(
  "prefers the actual Hemoglobin A1c result over later explanatory HbA1c text",
  () => {
    const results =
      detectLabMarkers(`
        GLYCEMIC MARKERS

        Hemoglobin A1c 6.6 % 4.0 - 5.6 H
        Estimated average glucose 143 mg/dL
        Calculated from HbA1c

        LIPID PROFILE

        Total cholesterol 258 mg/dL
      `);

    const hba1c =
      results.find(
        (result) =>
          result.marker ===
          "HbA1c"
      );

    expect(
      hba1c?.value
    ).toBe(
      6.6
    );

    expect(
      hba1c?.unit
    ).toBe(
      "%"
    );

    expect(
      hba1c?.value
    ).not.toBe(
      258
    );
  }
);
  }
);
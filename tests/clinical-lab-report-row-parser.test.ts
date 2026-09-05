import {
  describe,
  expect,
  it,
} from "vitest";

import {
  parseClinicalLabReportRows,
} from "@/lib/clinical-lab-report-row-parser";

describe(
  "clinical lab report row parser",
  () => {
    it(
      "extracts laboratory rows without requiring predefined marker names",
      () => {
        const rows =
          parseClinicalLabReportRows(`
GLYCEMIC MARKERS
Hemoglobin A1c 6.6 % 4.0 - 5.6 H

LIPID PROFILE
Total cholesterol 258 mg/dL 0 - 200 H
HDL 0.93 mmol/L
LDL 174 mg/dL 0 - 100 H

KIDNEY FUNCTION
eGFR 105 mL/min/1.73m²

ADDITIONAL TESTS
hs-CRP 6.8 mg/L
Vitamin B12 255 pg/mL
Ferritin 11 ng/mL 30 - 400 L
Urine albumin/creatinine ratio 31 mg/g
          `);

        expect(
          rows
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rawName:
                "Hemoglobin A1c",
              value:
                6.6,
              unit:
                "%",
            }),

            expect.objectContaining({
              rawName:
                "Total cholesterol",
              value:
                258,
              unit:
                "mg/dL",
            }),

            expect.objectContaining({
              rawName:
                "HDL",
              value:
                0.93,
              unit:
                "mmol/L",
            }),

            expect.objectContaining({
              rawName:
                "eGFR",
              value:
                105,
              unit:
                "mL/min/1.73m²",
            }),

            expect.objectContaining({
              rawName:
                "hs-CRP",
              value:
                6.8,
              unit:
                "mg/L",
            }),

            expect.objectContaining({
              rawName:
                "Vitamin B12",
              value:
                255,
              unit:
                "pg/mL",
            }),

            expect.objectContaining({
              rawName:
                "Ferritin",
              value:
                11,
              unit:
                "ng/mL",
            }),

            expect.objectContaining({
              rawName:
                "Urine albumin/creatinine ratio",
              value:
                31,
              unit:
                "mg/g",
            }),
          ])
        );
      }
    );

    it(
      "keeps repeated potassium results as separate evidence rows",
      () => {
        const rows =
          parseClinicalLabReportRows(`
Potassium 5.7 mmol/L 3.5 - 5.1 H
Potassium 4.3 mmol/L 3.5 - 5.1
          `);

        const potassiumRows =
          rows.filter(
            (row) =>
              row.rawName ===
              "Potassium"
          );

        expect(
          potassiumRows
        ).toHaveLength(
          2
        );

        expect(
          potassiumRows.map(
            (row) =>
              row.value
          )
        ).toEqual([
          5.7,
          4.3,
        ]);
      }
    );

    it(
      "extracts CBC and iron-related tests without hard-coded aliases",
      () => {
        const rows =
          parseClinicalLabReportRows(`
MCV 78 fL 80 - 100 L
MCH 25 pg 27 - 33 L
Serum iron 42 µg/dL 50 - 170 L
Ferritin 11 ng/mL 30 - 400 L
          `);

        expect(
          rows.map(
            (row) =>
              row.rawName
          )
        ).toEqual([
          "MCV",
          "MCH",
          "Serum iron",
          "Ferritin",
        ]);
      }
    );
  }
);
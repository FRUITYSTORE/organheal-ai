import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildClinicalLabRowEvidence,
} from "@/lib/services/intelligence/clinical-lab-row-evidence.service";

describe(
  "clinical lab row evidence",
  () => {
    it(
      "builds canonical evidence from generic laboratory rows",
      () => {
        const evidence =
          buildClinicalLabRowEvidence(`
Hemoglobin A1c 6.6 % 4.0 - 5.6 H
HDL 0.93 mmol/L
hs-CRP 6.8 mg/L
Vitamin B12 255 pg/mL
Urine albumin/creatinine ratio 31 mg/g
          `);

        expect(
          evidence
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              markerName:
                "HbA1c",

              markerValue:
                6.6,

              markerUnit:
                "%",

              markerStatus:
                "High",

              normalizationConfidence:
                "high",
            }),

            expect.objectContaining({
              markerName:
                "HDL",

              markerValue:
                0.93,

              markerUnit:
                "mmol/L",

              markerStatus:
                "Detected",
            }),

            expect.objectContaining({
              markerName:
                "hs-CRP",

              markerValue:
                6.8,

              markerUnit:
                "mg/L",
            }),

            expect.objectContaining({
              markerName:
                "Vitamin B12",

              markerValue:
                255,

              markerUnit:
                "pg/mL",
            }),

            expect.objectContaining({
              markerName:
                "Urine ACR",

              markerValue:
                31,

              markerUnit:
                "mg/g",
            }),
          ])
        );
      }
    );

    it(
      "uses report reference ranges instead of hard-coded clinical thresholds",
      () => {
        const evidence =
          buildClinicalLabRowEvidence(`
Novel Biomarker XYZ 12.5 mg/L 10 - 20
          `);

        expect(
          evidence[0]
        ).toMatchObject({
          markerName:
            "Novel Biomarker XYZ",

          markerValue:
            12.5,

          markerStatus:
            "Normal",

          referenceLow:
            10,

          referenceHigh:
            20,

          referenceSource:
            "report",

          normalizationConfidence:
            "low",
        });
      }
    );

    it(
      "keeps repeated results as separate evidence before persistence deduplication",
      () => {
        const evidence =
          buildClinicalLabRowEvidence(`
Potassium 5.7 mmol/L 3.5 - 5.1 H
Potassium 4.3 mmol/L 3.5 - 5.1
          `);

        expect(
          evidence.filter(
            (item) =>
              item.markerName ===
              "Potassium"
          )
        ).toHaveLength(
          2
        );
      }
    );
  }
);
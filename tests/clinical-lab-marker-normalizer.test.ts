import {
  describe,
  expect,
  it,
} from "vitest";

import {
  normalizeClinicalLabMarkerName,
} from "@/lib/clinical-lab-marker-normalizer";

describe(
  "clinical lab marker normalizer",
  () => {
    it(
      "normalizes common HbA1c labels to one canonical marker",
      () => {
        const labels = [
          "HbA1c",
          "Hb A1c",
          "Hemoglobin A1c",
          "Glycated Hemoglobin",
        ];

        for (
          const label
          of labels
        ) {
          expect(
            normalizeClinicalLabMarkerName(
              label
            )
          ).toMatchObject({
            canonicalName:
              "HbA1c",

            confidence:
              "high",
          });
        }
      }
    );

    it(
      "normalizes urine albumin creatinine ratio labels",
      () => {
        const result =
          normalizeClinicalLabMarkerName(
            "Urine albumin/creatinine ratio"
          );

        expect(
          result
        ).toMatchObject({
          canonicalName:
            "Urine ACR",

          confidence:
            "high",
        });
      }
    );

    it(
      "normalizes high sensitivity CRP labels",
      () => {
        const result =
          normalizeClinicalLabMarkerName(
            "High-sensitivity CRP"
          );

        expect(
          result
        ).toMatchObject({
          canonicalName:
            "hs-CRP",

          confidence:
            "high",
        });
      }
    );

    it(
      "preserves unknown laboratory names instead of discarding them",
      () => {
        const result =
          normalizeClinicalLabMarkerName(
            "Novel Biomarker XYZ"
          );

        expect(
          result
        ).toEqual({
          rawName:
            "Novel Biomarker XYZ",

          canonicalName:
            "Novel Biomarker XYZ",

          confidence:
            "low",
        });
      }
    );
  }
);
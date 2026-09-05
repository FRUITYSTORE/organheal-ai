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
    it(
  "normalizes repeated-result qualifiers without losing the raw marker name",
  () => {
    expect(
      normalizeClinicalLabMarkerName(
        "Potassium - initial"
      )
    ).toEqual({
      rawName:
        "Potassium - initial",

      canonicalName:
        "Potassium",

      confidence:
        "high",
    });

    expect(
      normalizeClinicalLabMarkerName(
        "Potassium - repeat"
      )
    ).toEqual({
      rawName:
        "Potassium - repeat",

      canonicalName:
        "Potassium",

      confidence:
        "high",
    });
  }
);
it(
  "normalizes additional clinical markers from flattened reports",
  () => {
    const cases = [
      ["LDL cholesterol - calculated", "LDL"],
      ["Non-HDL cholesterol", "Non-HDL Cholesterol"],
      ["TSH", "TSH"],
      ["Free T4", "Free T4"],
      ["25-OH Vitamin D", "Vitamin D"],
      ["RBC count", "RBC"],
      ["WBC count", "WBC"],
    ] as const;

    for (
      const [
        rawName,
        canonicalName,
      ] of cases
    ) {
      expect(
        normalizeClinicalLabMarkerName(
          rawName
        )
      ).toEqual({
        rawName,
        canonicalName,
        confidence:
          "high",
      });
    }
  }
);
  }
);
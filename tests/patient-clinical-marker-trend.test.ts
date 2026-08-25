import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildPatientClinicalMarkerTrends,
} from "@/lib/application/clinical/patient-clinical-marker-trend.service";

import type {
  ClinicalMarkerComparisonEvidence,
} from "@/lib/application/clinical/patient-clinical-comparison-evidence.service";

function createMarkerComparison(
  overrides:
    Partial<ClinicalMarkerComparisonEvidence> = {}
): ClinicalMarkerComparisonEvidence {
  return {
    marker:
      "LDL",

    unit:
      "mg/dL",

    previousValue:
      174,

    latestValue:
      132,

    delta:
      -42,

    changed:
      true,

    previousStatus:
      "High",

    latestStatus:
      "High",

    statusChanged:
      false,

    previousReferenceLow:
      0,

    previousReferenceHigh:
      100,

    latestReferenceLow:
      0,

    latestReferenceHigh:
      100,

    previousReferenceSource:
      "default",

    latestReferenceSource:
      "default",

    ...overrides,
  };
}

describe(
  "patient clinical marker trend",
  () => {
    it(
      "identifies persistent abnormality with numeric change",
      () => {
        const result =
          buildPatientClinicalMarkerTrends([
            createMarkerComparison(),
          ]);

        expect(
          result
        ).toContainEqual({
          marker:
            "LDL",

          unit:
            "mg/dL",

          previousValue:
            174,

          latestValue:
            132,

          delta:
            -42,

          previousStatus:
            "High",

          latestStatus:
            "High",

          interpretation:
            "persistent_abnormal_numeric_change",

          canConfirmClinicalDirection:
            false,
        });
      }
    );

    it(
      "identifies a transition from abnormal to normal without calling it clinical improvement",
      () => {
        const result =
          buildPatientClinicalMarkerTrends([
            createMarkerComparison({
              latestValue:
                95,

              delta:
                -79,

              latestStatus:
                "Normal",

              statusChanged:
                true,
            }),
          ]);

        expect(
          result[0]
            .interpretation
        ).toBe(
          "abnormal_to_normal"
        );

        expect(
          result[0]
            .canConfirmClinicalDirection
        ).toBe(false);
      }
    );

    it(
      "identifies a transition from normal to abnormal without calling it clinical worsening",
      () => {
        const result =
          buildPatientClinicalMarkerTrends([
            createMarkerComparison({
              previousValue:
                95,

              latestValue:
                132,

              delta:
                37,

              previousStatus:
                "Normal",

              latestStatus:
                "High",

              statusChanged:
                true,
            }),
          ]);

        expect(
          result[0]
            .interpretation
        ).toBe(
          "normal_to_abnormal"
        );

        expect(
          result[0]
            .canConfirmClinicalDirection
        ).toBe(false);
      }
    );

    it(
      "identifies numeric-only change when status remains normal",
      () => {
        const result =
          buildPatientClinicalMarkerTrends([
            createMarkerComparison({
              previousValue:
                80,

              latestValue:
                90,

              delta:
                10,

              previousStatus:
                "Normal",

              latestStatus:
                "Normal",

              statusChanged:
                false,
            }),
          ]);

        expect(
          result[0]
            .interpretation
        ).toBe(
          "normal_numeric_change"
        );
      }
    );
  }
);
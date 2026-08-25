import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildPatientClinicalDirection,
} from "@/lib/application/clinical/patient-clinical-direction.service";

import type {
  PatientClinicalComparisonEvidence,
} from "@/lib/application/clinical/patient-clinical-comparison-evidence.service";

import type {
  PatientClinicalReasoning,
} from "@/lib/application/clinical/patient-clinical-reasoning.service";

import type {
  PatientClinicalMarkerTrend,
} from "@/lib/application/clinical/patient-clinical-marker-trend.service";

describe(
  "patient clinical direction marker trends",
  () => {
    it(
      "preserves a normal-to-abnormal marker transition as a clinical signal without confirming worsening",
      () => {
        const evidence:
          PatientClinicalComparisonEvidence = {
          status:
            "insufficient",

          latestReportId:
            702,

          previousReportId:
            701,

          latestReportDate:
            "2026-08-20T08:00:00.000Z",

          previousReportDate:
            "2026-06-20T08:00:00.000Z",

          fields:
            [],

          markerComparisons:
            [],

          comparableFieldCount:
            0,

          changedFieldCount:
            0,

          unchangedFieldCount:
            0,

          missingFields:
            [],

          limitations:
            [],
        };

        const reasoning:
          PatientClinicalReasoning = {
          state:
            "verified_changes",

          comparisonReady:
            false,

          confidence:
            "low",

          significantChanges:
            [],

          stableAreas:
            [],

          objectiveMarkerChanges:
            [],

          insufficientEvidence:
            [],

          verifiedChangeCount:
            0,

          objectiveMarkerChangeCount:
            0,

          stableFieldCount:
            0,

          comparableFieldCount:
            0,

          canConfirmDirection:
            false,

          direction:
            null,

          limitations:
            [],
        };

        const markerTrends:
          PatientClinicalMarkerTrend[] = [
            {
              marker:
                "LDL",

              unit:
                "mg/dL",

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

              interpretation:
                "normal_to_abnormal",

              canConfirmClinicalDirection:
                false,
            },
          ];

        const result =
          buildPatientClinicalDirection({
            evidence,
            reasoning,
            markerTrends,
          });

        expect(
          result.supportingSignals
        ).toContainEqual({
          code:
            "marker_normal_to_abnormal",

          field:
            "marker",

          previousValue:
            "LDL: 95 mg/dL (Normal)",

          latestValue:
            "LDL: 132 mg/dL (High)",
        });

        expect(
          result.direction
        ).toBe(
          "inconclusive"
        );

        expect(
          result.canConfirmClinicalDirection
        ).toBe(false);
      }
    );
  }
);
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildPatientClinicalReasoning,
} from "@/lib/application/clinical/patient-clinical-reasoning.service";

import type {
  PatientClinicalComparisonEvidence,
} from "@/lib/application/clinical/patient-clinical-comparison-evidence.service";

describe(
  "patient clinical reasoning marker comparison",
  () => {
    it(
      "recognizes an objective marker change even when text comparison fields are unavailable",
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

          markerComparisons: [
            {
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
            },
          ],

          comparableFieldCount:
            0,

          changedFieldCount:
            0,

          unchangedFieldCount:
            0,

          missingFields: [
            "report_type",
            "risk_level",
            "summary",
            "key_findings",
            "recommendations",
            "next_best_action",
          ],

          limitations: [
            "No shared structured fields are available for comparison.",
          ],
        };

        const reasoning =
          buildPatientClinicalReasoning({
            evidence,
          });

        expect(
          reasoning.state
        ).toBe(
          "verified_changes"
        );

        expect(
          reasoning.objectiveMarkerChanges
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
        });

        expect(
          reasoning.objectiveMarkerChangeCount
        ).toBe(
        1
        );

        expect(
          reasoning.verifiedChangeCount
        ).toBe(
        0
        );

        expect(
          reasoning.canConfirmDirection
        ).toBe(false);

        expect(
          reasoning.direction
        ).toBeNull();
      }
    );
  }
);
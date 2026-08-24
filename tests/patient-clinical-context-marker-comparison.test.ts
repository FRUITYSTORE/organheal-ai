import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildPatientClinicalContext,
} from "@/lib/application/clinical/patient-clinical-context.service";

import {
  createPatientSummaryFixture,
  createUploadedReportFixture,
} from "./fixtures/patient-summary.fixture";

describe(
  "patient clinical context marker comparison",
  () => {
    it(
      "preserves objective longitudinal marker evidence in the clinical context",
      () => {
        const previousReport =
          createUploadedReportFixture({
            id:
              701,

            report_type:
              "cardiovascular",

            created_at:
              "2026-06-20T08:00:00.000Z",
          });

        const latestReport =
          createUploadedReportFixture({
            id:
              702,

            report_type:
              "cardiovascular",

            created_at:
              "2026-08-20T08:00:00.000Z",
          });

        const patientSummary =
          createPatientSummaryFixture({
            uploadedReports: [
              previousReport,
              latestReport,
            ],

            reportMarkers: [
              {
                report_id:
                  701,

                marker_name:
                  "LDL",

                marker_value:
                  174,

                marker_unit:
                  "mg/dL",

                marker_status:
                  "High",

                reference_low:
                  0,

                reference_high:
                  100,

                reference_source:
                  "default",

                created_at:
                  "2026-06-20T08:05:00.000Z",
              },

              {
                report_id:
                  702,

                marker_name:
                  "LDL",

                marker_value:
                  132,

                marker_unit:
                  "mg/dL",

                marker_status:
                  "High",

                reference_low:
                  0,

                reference_high:
                  100,

                reference_source:
                  "default",

                created_at:
                  "2026-08-20T08:05:00.000Z",
              },
            ],

            healthInsights:
              [],
          });

        const context =
          buildPatientClinicalContext({
            patientSummary,
          });

        expect(
          context
            .evidence
            .markerComparisons
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

          changed:
            true,
        });

        expect(
          context.reasoning.canConfirmDirection
        ).toBe(false);

        expect(
          context.reasoning.direction
        ).toBeNull();
      }
    );
  }
);
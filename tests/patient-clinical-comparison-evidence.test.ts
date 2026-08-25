import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildPatientClinicalComparison,
} from "@/lib/application/clinical/patient-clinical-comparison.service";

import {
  buildPatientClinicalComparisonEvidence,
} from "@/lib/application/clinical/patient-clinical-comparison-evidence.service";

import {
  createPatientSummaryFixture,
  createUploadedReportFixture,
} from "./fixtures/patient-summary.fixture";

describe(
  "patient clinical comparison evidence",
  () => {
    it(
      "detects a comparable objective marker change across clinically comparable reports",
      () => {
        const previousReport =
          createUploadedReportFixture({
            id:
              501,

            report_type:
              "cardiovascular",

            created_at:
              "2026-06-20T08:00:00.000Z",
          });

        const latestReport =
          createUploadedReportFixture({
            id:
              502,

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
                  501,

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
                  502,

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

        const comparison =
          buildPatientClinicalComparison({
            patientSummary,
          });

        const evidence =
          buildPatientClinicalComparisonEvidence({
            comparison,

            reportMarkers:
              patientSummary.reportMarkers,
          });

        expect(
          evidence.markerComparisons
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
        });
      }
    );
  }
);

it(
  "does not compare the same marker when report units differ",
  () => {
    const previousReport =
      createUploadedReportFixture({
        id:
          601,

        report_type:
          "cardiovascular",

        created_at:
          "2026-06-20T08:00:00.000Z",
      });

    const latestReport =
      createUploadedReportFixture({
        id:
          602,

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
              601,

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
              602,

            marker_name:
              "LDL",

            marker_value:
              3.4,

            marker_unit:
              "mmol/L",

            marker_status:
              "High",

            reference_low:
              0,

            reference_high:
              2.6,

            reference_source:
              "default",

            created_at:
              "2026-08-20T08:05:00.000Z",
          },
        ],

        healthInsights:
          [],
      });

    const comparison =
      buildPatientClinicalComparison({
        patientSummary,
      });

    const evidence =
      buildPatientClinicalComparisonEvidence({
        comparison,

        reportMarkers:
          patientSummary.reportMarkers,
      });

    expect(
      evidence.markerComparisons
    ).toEqual([]);
  }
);
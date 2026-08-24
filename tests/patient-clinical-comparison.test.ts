import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildPatientClinicalComparison,
} from "@/lib/application/clinical/patient-clinical-comparison.service";

import {
  createPatientSummaryFixture,
  createUploadedReportFixture,
} from "./fixtures/patient-summary.fixture";

describe(
  "patient clinical comparison",
  () => {
    it(
      "selects the previous clinically comparable report instead of merely the second newest report",
      () => {
        const latestCardiovascularReport =
          createUploadedReportFixture({
            id:
              303,

            file_name:
              "cardiovascular-august.pdf",

            report_type:
              "cardiovascular",

            created_at:
              "2026-08-20T08:00:00.000Z",
          });

        const newerRenalReport =
          createUploadedReportFixture({
            id:
              302,

            file_name:
              "renal-july.pdf",

            report_type:
              "renal",

            created_at:
              "2026-07-20T08:00:00.000Z",
          });

        const previousCardiovascularReport =
          createUploadedReportFixture({
            id:
              301,

            file_name:
              "cardiovascular-june.pdf",

            report_type:
              "cardiovascular",

            created_at:
              "2026-06-20T08:00:00.000Z",
          });

        const patientSummary =
          createPatientSummaryFixture({
            uploadedReports: [
              previousCardiovascularReport,
              newerRenalReport,
              latestCardiovascularReport,
            ],

            healthInsights:
              [],
          });

        const result =
          buildPatientClinicalComparison({
            patientSummary,
          });

        expect(
          result.latest?.report.id
        ).toBe(
          303
        );

        expect(
          result.previous?.report.id
        ).toBe(
          301
        );

        expect(
          result.previous
            ?.report
            .report_type
        ).toBe(
          "cardiovascular"
        );
      }
    );
  }
);
it(
  "falls back to the second newest report when the latest report has no report type",
  () => {
    const latestReport =
      createUploadedReportFixture({
        id:
          403,

        file_name:
          "latest-report.pdf",

        report_type:
          null,

        created_at:
          "2026-08-20T08:00:00.000Z",
      });

    const secondNewestReport =
      createUploadedReportFixture({
        id:
          402,

        file_name:
          "second-report.pdf",

        report_type:
          "renal",

        created_at:
          "2026-07-20T08:00:00.000Z",
      });

    const oldestReport =
      createUploadedReportFixture({
        id:
          401,

        file_name:
          "oldest-report.pdf",

        report_type:
          "cardiovascular",

        created_at:
          "2026-06-20T08:00:00.000Z",
      });

    const patientSummary =
      createPatientSummaryFixture({
        uploadedReports: [
          oldestReport,
          latestReport,
          secondNewestReport,
        ],

        healthInsights:
          [],
      });

    const result =
      buildPatientClinicalComparison({
        patientSummary,
      });

    expect(
      result.latest?.report.id
    ).toBe(
      403
    );

    expect(
      result.previous?.report.id
    ).toBe(
      402
    );
  }
);
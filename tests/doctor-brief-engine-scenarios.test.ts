import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  PatientSummary,
} from "@/lib/models/patient";

import {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import {
  createPatientSummaryFixture,
} from "./fixtures/patient-summary.fixture";

describe(
  "doctor brief engine scenarios",
  () => {
    it(
      "includes longitudinal report context when separate reports share the same clinical domain",
      () => {
        const patient:
          PatientSummary = {
          ...createPatientSummaryFixture({
            assessments: [],
            latestCheckIn:
              null,
            healthInsights:
              [],
            generatedResults:
              [],
          }),

          uploadedReports: [
            {
              id: 201,

              file_name:
                "lipid-panel-january.pdf",

              file_path:
                "user/reports/lipid-panel-january.pdf",

              report_type:
                "cardiovascular",

              extraction_status:
                "Completed",

              extracted_text:
                "January lipid panel.",

              created_at:
                "2026-01-10T08:00:00.000Z",

              extracted_at:
                "2026-01-10T08:02:00.000Z",
            },

            {
              id: 202,

              file_name:
                "lipid-panel-august.pdf",

              file_path:
                "user/reports/lipid-panel-august.pdf",

              report_type:
                "cardiovascular",

              extraction_status:
                "Completed",

              extracted_text:
                "August lipid panel.",

              created_at:
                "2026-08-10T08:00:00.000Z",

              extracted_at:
                "2026-08-10T08:02:00.000Z",
            },
          ],
        };

        const intelligence =
          buildHealthIntelligence(
            patient
          );

        expect(
          intelligence
            .doctorBrief
            .data
            .brief
        ).toContain(
          "Longitudinal Context:"
        );

        expect(
          intelligence
            .doctorBrief
            .data
            .brief
        ).toContain(
          "cardiovascular"
        );
      }
    );
  }
);
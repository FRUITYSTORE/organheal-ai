import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  buildAssistantMultiReportComparison,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/assistant-multi-report-comparison.service";

import {
  renderAssistantMultiReportComparison,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/render-assistant-multi-report-comparison";

vi.mock(
  "@/lib/repositories/report-markers.repository",
  () => ({
    getMedicalReportMarkersByReportIds:
      vi.fn(
        async () => [
          {
            report_id:
              1,

            marker_name:
              "LDL",

            marker_value:
              180,

            marker_unit:
              "mg/dL",

            marker_status:
              "High",

            reference_low:
              0,

            reference_high:
              100,

            reference_source:
              "report",

            created_at:
              "2026-07-01T00:00:00.000Z",
          },

          {
            report_id:
              2,

            marker_name:
              "LDL",

            marker_value:
              160,

            marker_unit:
              "mg/dL",

            marker_status:
              "High",

            reference_low:
              0,

            reference_high:
              100,

            reference_source:
              "report",

            created_at:
              "2026-08-01T00:00:00.000Z",
          },

          {
            report_id:
              3,

            marker_name:
              "LDL",

            marker_value:
              140,

            marker_unit:
              "mg/dL",

            marker_status:
              "High",

            reference_low:
              0,

            reference_high:
              100,

            reference_source:
              "report",

            created_at:
              "2026-09-01T00:00:00.000Z",
          },
        ]
      ),
  })
);

describe(
  "assistant multi report comparison",
  () => {
    it(
      "builds and renders a real longitudinal comparison",
      async () => {
        const comparison =
          await buildAssistantMultiReportComparison({
            userId:
              "user-1",

            reports: [
              {
                id:
                  3,

                file_name:
                  "3.pdf",

                extraction_status:
                  "completed",

                created_at:
                  "2026-09-01T00:00:00.000Z",
              },

              {
                id:
                  2,

                file_name:
                  "2.pdf",

                extraction_status:
                  "completed",

                created_at:
                  "2026-08-01T00:00:00.000Z",
              },

              {
                id:
                  1,

                file_name:
                  "1.pdf",

                extraction_status:
                  "completed",

                created_at:
                  "2026-07-01T00:00:00.000Z",
              },
            ],

            client:
              {} as never,
          });

        expect(
          comparison.reportCount
        ).toBe(
          3
        );

        expect(
          comparison.markerSeries[0]
            ?.clinicalTrend
        ).toBe(
          "improved"
        );

        const response =
          renderAssistantMultiReportComparison(
            comparison,
            "ar"
          );

        expect(
          response
        ).toContain(
          "LDL"
        );

        expect(
          response
        ).toContain(
          "180 mg/dL → 160 mg/dL → 140 mg/dL"
        );

        expect(
          response
        ).toContain(
          "التحسن"
        );
      }
    );
  }
);
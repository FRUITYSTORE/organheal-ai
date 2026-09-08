import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildPatientClinicalLongitudinalComparison,
} from "@/lib/application/clinical/patient-clinical-longitudinal-comparison.service";

import type {
  ReportMedicalMarkerEvidence,
} from "@/lib/repositories/report-markers.repository";

import type {
  UploadedReportSummary,
} from "@/lib/repositories/reports.repository";

function report(
  id:
    number,
  createdAt:
    string
): UploadedReportSummary {
  return {
    id,

    file_name:
      `report-${id}.pdf`,

    extraction_status:
      "completed",

    created_at:
      createdAt,
  };
}

function marker(
  reportId:
    number,
  markerName:
    string,
  value:
    number,
  unit:
    string,
  status:
    ReportMedicalMarkerEvidence["marker_status"],
  referenceLow:
    number | null,
  referenceHigh:
    number | null
): ReportMedicalMarkerEvidence {
  return {
    report_id:
      reportId,

    marker_name:
      markerName,

    marker_value:
      value,

    marker_unit:
      unit,

    marker_status:
      status,

    reference_low:
      referenceLow,

    reference_high:
      referenceHigh,

    reference_source:
      "report",

    created_at:
      "2026-01-01T00:00:00.000Z",
  };
}

describe(
  "patient clinical longitudinal comparison",
  () => {
    it(
      "builds a three-report chronological marker series",
      () => {
        const result =
          buildPatientClinicalLongitudinalComparison({
            reports: [
              report(
                3,
                "2026-09-01T00:00:00.000Z"
              ),

              report(
                2,
                "2026-08-01T00:00:00.000Z"
              ),

              report(
                1,
                "2026-07-01T00:00:00.000Z"
              ),
            ],

            reportMarkers: [
              marker(
                3,
                "LDL",
                140,
                "mg/dL",
                "High",
                0,
                100
              ),

              marker(
                2,
                "LDL",
                160,
                "mg/dL",
                "High",
                0,
                100
              ),

              marker(
                1,
                "LDL",
                180,
                "mg/dL",
                "High",
                0,
                100
              ),
            ],
          });

        expect(
          result.reportIds
        ).toEqual([
          3,
          2,
          1,
        ]);

        expect(
          result.markerSeries[0]
            ?.points.map(
              (
                point
              ) =>
                point.value
            )
        ).toEqual([
          180,
          160,
          140,
        ]);

        expect(
          result.markerSeries[0]
            ?.direction
        ).toBe(
          "decreasing"
        );

        expect(
          result.markerSeries[0]
            ?.clinicalTrend
        ).toBe(
          "improved"
        );
      }
    );

    it(
      "detects worsening when values move farther outside the reference range",
      () => {
        const result =
          buildPatientClinicalLongitudinalComparison({
            reports: [
              report(
                3,
                "2026-09-01T00:00:00.000Z"
              ),

              report(
                2,
                "2026-08-01T00:00:00.000Z"
              ),

              report(
                1,
                "2026-07-01T00:00:00.000Z"
              ),
            ],

            reportMarkers: [
              marker(
                1,
                "ALT",
                45,
                "U/L",
                "High",
                0,
                40
              ),

              marker(
                2,
                "ALT",
                55,
                "U/L",
                "High",
                0,
                40
              ),

              marker(
                3,
                "ALT",
                70,
                "U/L",
                "High",
                0,
                40
              ),
            ],
          });

        expect(
          result.markerSeries[0]
            ?.clinicalTrend
        ).toBe(
          "worsened"
        );
      }
    );

    it(
      "returns mixed when the longitudinal direction reverses",
      () => {
        const result =
          buildPatientClinicalLongitudinalComparison({
            reports: [
              report(
                3,
                "2026-09-01T00:00:00.000Z"
              ),

              report(
                2,
                "2026-08-01T00:00:00.000Z"
              ),

              report(
                1,
                "2026-07-01T00:00:00.000Z"
              ),
            ],

            reportMarkers: [
              marker(
                1,
                "Glucose",
                130,
                "mg/dL",
                "High",
                70,
                99
              ),

              marker(
                2,
                "Glucose",
                110,
                "mg/dL",
                "High",
                70,
                99
              ),

              marker(
                3,
                "Glucose",
                125,
                "mg/dL",
                "High",
                70,
                99
              ),
            ],
          });

        expect(
          result.markerSeries[0]
            ?.direction
        ).toBe(
          "mixed"
        );

        expect(
          result.markerSeries[0]
            ?.clinicalTrend
        ).toBe(
          "mixed"
        );
      }
    );

    it(
      "refuses comparison when marker units differ",
      () => {
        const result =
          buildPatientClinicalLongitudinalComparison({
            reports: [
              report(
                2,
                "2026-09-01T00:00:00.000Z"
              ),

              report(
                1,
                "2026-08-01T00:00:00.000Z"
              ),
            ],

            reportMarkers: [
              marker(
                1,
                "HDL",
                45,
                "mg/dL",
                "Normal",
                40,
                100
              ),

              marker(
                2,
                "HDL",
                1.2,
                "mmol/L",
                "Normal",
                1,
                2
              ),
            ],
          });

        expect(
          result.markerSeries[0]
            ?.comparable
        ).toBe(
          false
        );

        expect(
          result.markerSeries[0]
            ?.clinicalTrend
        ).toBe(
          "insufficient"
        );
      }
    );

    it(
      "does not call numeric change clinical improvement without reference boundaries",
      () => {
        const result =
          buildPatientClinicalLongitudinalComparison({
            reports: [
              report(
                2,
                "2026-09-01T00:00:00.000Z"
              ),

              report(
                1,
                "2026-08-01T00:00:00.000Z"
              ),
            ],

            reportMarkers: [
              marker(
                1,
                "Marker X",
                10,
                "unit",
                "Detected",
                null,
                null
              ),

              marker(
                2,
                "Marker X",
                5,
                "unit",
                "Detected",
                null,
                null
              ),
            ],
          });

        expect(
          result.markerSeries[0]
            ?.direction
        ).toBe(
          "decreasing"
        );

        expect(
          result.markerSeries[0]
            ?.clinicalTrend
        ).toBe(
          "insufficient"
        );
      }
    );

    it(
      "does not treat a missing marker in one report as improvement or worsening",
      () => {
        const result =
          buildPatientClinicalLongitudinalComparison({
            reports: [
              report(
                3,
                "2026-09-01T00:00:00.000Z"
              ),

              report(
                2,
                "2026-08-01T00:00:00.000Z"
              ),

              report(
                1,
                "2026-07-01T00:00:00.000Z"
              ),
            ],

            reportMarkers: [
              marker(
                1,
                "Ferritin",
                10,
                "ng/mL",
                "Low",
                20,
                300
              ),

              marker(
                3,
                "Ferritin",
                25,
                "ng/mL",
                "Normal",
                20,
                300
              ),
            ],
          });

        const series =
          result.markerSeries[0];

        expect(
          series?.points
        ).toHaveLength(
          2
        );

        expect(
          series?.clinicalTrend
        ).toBe(
          "improved"
        );
      }
    );
  }
);
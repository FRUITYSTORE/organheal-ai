import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "@/lib/labMarkerDetector",
  () => ({
    detectLabMarkers:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/repositories/report-markers.repository",
  () => ({
    saveMedicalReportMarkers:
      vi.fn(),

    getHistoricalMedicalMarkers:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/services/intelligence/report-evidence-events-runtime.service",
  () => ({
    persistClinicalLabEvidenceEvents:
      vi.fn(),
  })
);

import {
  detectLabMarkers,
} from "@/lib/labMarkerDetector";

import {
  getHistoricalMedicalMarkers,
  saveMedicalReportMarkers,
} from "@/lib/repositories/report-markers.repository";

import {
  persistClinicalLabEvidenceEvents,
} from "@/lib/services/intelligence/report-evidence-events-runtime.service";

import {
  prepareReportMarkerRuntime,
} from "@/lib/services/intelligence/report-marker-runtime.service";

const mockedDetectLabMarkers =
  vi.mocked(
    detectLabMarkers
  );

const mockedSaveMedicalReportMarkers =
  vi.mocked(
    saveMedicalReportMarkers
  );

const mockedGetHistoricalMedicalMarkers =
  vi.mocked(
    getHistoricalMedicalMarkers
  );

const mockedPersistClinicalLabEvidenceEvents =
  vi.mocked(
    persistClinicalLabEvidenceEvents
  );

describe(
  "report marker runtime",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();

        mockedDetectLabMarkers
          .mockReturnValue([
            {
              marker:
                "HbA1c",

              value:
                6.6,

              unit:
                "%",

              status:
                "High",

              note:
                "HbA1c is elevated.",

              category:
                "Metabolic",

              referenceLow:
                4,

              referenceHigh:
                5.6,

              referenceSource:
                "report",
            },
          ]);

        mockedGetHistoricalMedicalMarkers
          .mockResolvedValue([
            {
              marker_name:
                "HbA1c",

              marker_value:
                6.2,

              marker_unit:
                "%",

              created_at:
                "2026-08-01T08:00:00.000Z",
            },
          ]);

        mockedSaveMedicalReportMarkers
          .mockResolvedValue();

        mockedPersistClinicalLabEvidenceEvents
          .mockResolvedValue();
      }
    );

    it(
      "persists legacy markers and Parser v2 evidence in parallel",
      async () => {
        const result =
          await prepareReportMarkerRuntime({
            userId:
              "user-1",

            reportId:
              111,

            extractedText:
              "Hemoglobin A1c 6.6 % 4.0 - 5.6 H",
          });

        expect(
          mockedSaveMedicalReportMarkers
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedSaveMedicalReportMarkers
        ).toHaveBeenCalledWith([
          expect.objectContaining({
            userId:
              "user-1",

            reportId:
              111,

            markerName:
              "HbA1c",

            markerValue:
              6.6,

            markerUnit:
              "%",
          }),
        ]);

        expect(
          mockedPersistClinicalLabEvidenceEvents
        ).toHaveBeenCalledWith({
          userId:
            "user-1",

          reportId:
            111,

          extractedText:
            "Hemoglobin A1c 6.6 % 4.0 - 5.6 H",
        });

        expect(
          result.detectedMarkers
        ).toHaveLength(
          1
        );

        expect(
          result.historicalMarkerRows
        ).toHaveLength(
          1
        );
      }
    );

    it(
      "does not break legacy report intelligence when Parser v2 persistence fails",
      async () => {
        mockedPersistClinicalLabEvidenceEvents
          .mockRejectedValueOnce(
            new Error(
              "Parser v2 persistence failed"
            )
          );

        const consoleError =
          vi.spyOn(
            console,
            "error"
          )
            .mockImplementation(
              () => {}
            );

        const result =
          await prepareReportMarkerRuntime({
            userId:
              "user-1",

            reportId:
              111,

            extractedText:
              "Hemoglobin A1c 6.6 %",
          });

        expect(
          mockedSaveMedicalReportMarkers
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedPersistClinicalLabEvidenceEvents
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          result.detectedMarkers
        ).toHaveLength(
          1
        );

        expect(
          result.historicalMarkerRows
        ).toHaveLength(
          1
        );

        consoleError
          .mockRestore();
      }
    );

    it(
      "does not persist report-bound evidence when reportId is null",
      async () => {
        await prepareReportMarkerRuntime({
          userId:
            "user-1",

          reportId:
            null,

          extractedText:
            "Hemoglobin A1c 6.6 %",
        });

        expect(
          mockedSaveMedicalReportMarkers
        ).not.toHaveBeenCalled();

        expect(
          mockedPersistClinicalLabEvidenceEvents
        ).not.toHaveBeenCalled();

        expect(
          mockedGetHistoricalMedicalMarkers
        ).toHaveBeenCalledWith(
          "user-1"
        );
      }
    );
  }
);
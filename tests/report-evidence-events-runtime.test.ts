import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "@/lib/repositories/report-evidence-events.repository",
  () => ({
    saveReportEvidenceEvents:
      vi.fn(),
  })
);

import {
  saveReportEvidenceEvents,
} from "@/lib/repositories/report-evidence-events.repository";

import {
  persistClinicalLabEvidenceEvents,
} from "@/lib/services/intelligence/report-evidence-events-runtime.service";

const mockedSaveReportEvidenceEvents =
  vi.mocked(
    saveReportEvidenceEvents
  );

describe(
  "report evidence events runtime",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();
      }
    );

    it(
      "persists generic report rows with stable sequence indexes",
      async () => {
        await persistClinicalLabEvidenceEvents({
          userId:
            "user-1",

          reportId:
            111,

          extractedText:
            `
Hemoglobin A1c 6.6 % 4.0 - 5.6 H
hs-CRP 6.8 mg/L
Vitamin B12 255 pg/mL
            `,
        });

        expect(
          mockedSaveReportEvidenceEvents
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedSaveReportEvidenceEvents
        ).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              reportId:
                111,

              sequenceIndex:
                0,

              canonicalMarkerName:
                "HbA1c",

              markerValue:
                6.6,

              contextType:
                "result",
            }),

            expect.objectContaining({
              canonicalMarkerName:
                "hs-CRP",

              markerValue:
                6.8,
            }),

            expect.objectContaining({
              canonicalMarkerName:
                "Vitamin B12",

              markerValue:
                255,
            }),
          ])
        );
      }
    );

    it(
      "marks later occurrences of the same marker as repeats",
      async () => {
        await persistClinicalLabEvidenceEvents({
          userId:
            "user-1",

          reportId:
            111,

          extractedText:
            `
Potassium 5.7 mmol/L 3.5 - 5.1 H
Potassium 4.3 mmol/L 3.5 - 5.1
            `,
        });

        const events =
          mockedSaveReportEvidenceEvents
            .mock
            .calls[0]?.[0];

        expect(
          events
        ).toHaveLength(
          2
        );

        expect(
          events?.[0]
            .contextType
        ).toBe(
          "result"
        );

        expect(
          events?.[1]
            .contextType
        ).toBe(
          "repeat"
        );

        expect(
          events?.map(
            (item) =>
              item.markerValue
          )
        ).toEqual([
          5.7,
          4.3,
        ]);
      }
    );

    it(
      "does not persist anything when no laboratory rows are detected",
      async () => {
        await persistClinicalLabEvidenceEvents({
          userId:
            "user-1",

          reportId:
            111,

          extractedText:
            "This report contains no structured laboratory rows.",
        });

        expect(
          mockedSaveReportEvidenceEvents
        ).not.toHaveBeenCalled();
      }
    );
  }
);
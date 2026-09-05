import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "@/lib/supabase",
  () => ({
    supabase: {},
  })
);

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  getReportEvidenceEventsByReportId,
  saveReportEvidenceEvents,
} from "@/lib/repositories/report-evidence-events.repository";

describe(
  "report evidence events repository",
  () => {
    it(
      "upserts repeated marker results by sequence instead of marker name",
      async () => {
        const upsert =
          vi.fn()
            .mockResolvedValue({
              error:
                null,
            });

        const from =
          vi.fn()
            .mockReturnValue({
              upsert,
            });

        const client = {
          from,
        } as unknown as SupabaseClient;

        await saveReportEvidenceEvents(
          [
            {
              userId:
                "user-1",

              reportId:
                111,

              sequenceIndex:
                12,

              rawMarkerName:
                "Potassium",

              canonicalMarkerName:
                "Potassium",

              markerValue:
                5.7,

              markerUnit:
                "mmol/L",

              referenceLow:
                3.5,

              referenceHigh:
                5.1,

              markerStatus:
                "High",

              flag:
                "H",

              rawLine:
                "Potassium 5.7 mmol/L 3.5 - 5.1 H",

              normalizationConfidence:
                "high",

              contextType:
                "result",
            },

            {
              userId:
                "user-1",

              reportId:
                111,

              sequenceIndex:
                13,

              rawMarkerName:
                "Potassium",

              canonicalMarkerName:
                "Potassium",

              markerValue:
                4.3,

              markerUnit:
                "mmol/L",

              referenceLow:
                3.5,

              referenceHigh:
                5.1,

              markerStatus:
                "Normal",

              flag:
                null,

              rawLine:
                "Potassium 4.3 mmol/L 3.5 - 5.1",

              normalizationConfidence:
                "high",

              contextType:
                "repeat",
            },
          ],
          client
        );

        expect(
          from
        ).toHaveBeenCalledWith(
          "medical_report_evidence_events"
        );

        expect(
          upsert
        ).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              report_id:
                111,

              sequence_index:
                12,

              canonical_marker_name:
                "Potassium",

              marker_value:
                5.7,
            }),

            expect.objectContaining({
              report_id:
                111,

              sequence_index:
                13,

              canonical_marker_name:
                "Potassium",

              marker_value:
                4.3,
            }),
          ]),
          {
            onConflict:
              "user_id,report_id,sequence_index",
          }
        );
      }
    );

    it(
      "loads report evidence events in sequence order",
      async () => {
        const order =
          vi.fn()
            .mockResolvedValue({
              data: [
                {
                  id:
                    "event-1",

                  report_id:
                    111,

                  sequence_index:
                    12,

                  raw_marker_name:
                    "Potassium",

                  canonical_marker_name:
                    "Potassium",

                  marker_value:
                    5.7,

                  marker_unit:
                    "mmol/L",

                  reference_low:
                    3.5,

                  reference_high:
                    5.1,

                  marker_status:
                    "High",

                  flag:
                    "H",

                  raw_line:
                    "Potassium 5.7 mmol/L 3.5 - 5.1 H",

                  normalization_confidence:
                    "high",

                  context_type:
                    "result",

                  created_at:
                    "2026-09-05T10:00:00.000Z",

                  updated_at:
                    "2026-09-05T10:00:00.000Z",
                },

                {
                  id:
                    "event-2",

                  report_id:
                    111,

                  sequence_index:
                    13,

                  raw_marker_name:
                    "Potassium",

                  canonical_marker_name:
                    "Potassium",

                  marker_value:
                    4.3,

                  marker_unit:
                    "mmol/L",

                  reference_low:
                    3.5,

                  reference_high:
                    5.1,

                  marker_status:
                    "Normal",

                  flag:
                    null,

                  raw_line:
                    "Potassium 4.3 mmol/L 3.5 - 5.1",

                  normalization_confidence:
                    "high",

                  context_type:
                    "repeat",

                  created_at:
                    "2026-09-05T10:01:00.000Z",

                  updated_at:
                    "2026-09-05T10:01:00.000Z",
                },
              ],

              error:
                null,
            });

        const secondEq =
          vi.fn()
            .mockReturnValue({
              order,
            });

        const firstEq =
          vi.fn()
            .mockReturnValue({
              eq:
                secondEq,
            });

        const select =
          vi.fn()
            .mockReturnValue({
              eq:
                firstEq,
            });

        const from =
          vi.fn()
            .mockReturnValue({
              select,
            });

        const client = {
          from,
        } as unknown as SupabaseClient;

        const result =
          await getReportEvidenceEventsByReportId(
            "user-1",
            111,
            client
          );

        expect(
          order
        ).toHaveBeenCalledWith(
          "sequence_index",
          {
            ascending:
              true,
          }
        );

        expect(
          result
        ).toHaveLength(
          2
        );

        expect(
          result.map(
            (item) =>
              item.marker_value
          )
        ).toEqual([
          5.7,
          4.3,
        ]);
      }
    );

    it(
      "does not write when there are no evidence events",
      async () => {
        const from =
          vi.fn();

        const client = {
          from,
        } as unknown as SupabaseClient;

        await saveReportEvidenceEvents(
          [],
          client
        );

        expect(
          from
        ).not.toHaveBeenCalled();
      }
    );
  }
);
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
  getMedicalReportMarkersForPatient,
  saveMedicalReportMarkers,
} from "@/lib/repositories/report-markers.repository";

describe(
  "report markers repository",
  () => {
    it(
      "upserts report markers using the report marker identity",
      async () => {
        const upsert =
          vi.fn()
            .mockResolvedValue({
              error: null,
            });

        const from =
          vi.fn()
            .mockReturnValue({
              upsert,
            });

        const client = {
          from,
        } as unknown as SupabaseClient;

        await saveMedicalReportMarkers(
          [
            {
              userId:
                "user-1",

              reportId:
                105,

              markerName:
                "LDL",

              markerValue:
                174,

              markerUnit:
                "mg/dL",

              markerStatus:
                "High",

              referenceLow:
                0,

              referenceHigh:
                100,

              referenceSource:
                "default",
            },
          ],
          client
        );

        expect(
          from
        ).toHaveBeenCalledWith(
          "medical_report_markers"
        );

        expect(
          upsert
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          upsert
        ).toHaveBeenCalledWith(
          [
            {
              user_id:
                "user-1",

              report_id:
                105,

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
            },
          ],
          {
            onConflict:
              "user_id,report_id,marker_name",
          }
        );
      }
    );

    it(
      "does not write when there are no markers",
      async () => {
        const from =
          vi.fn();

        const client = {
          from,
        } as unknown as SupabaseClient;

        await saveMedicalReportMarkers(
          [],
          client
        );

        expect(
          from
        ).not.toHaveBeenCalled();
      }
    );
  }
);it(
  "loads patient report markers in one query ordered newest first",
  async () => {
    const order =
      vi.fn()
        .mockResolvedValue({
          data: [
            {
              report_id:
                105,

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
                "2026-08-24T10:00:00.000Z",
            },

            {
              report_id:
                104,

              marker_name:
                "LDL",

              marker_value:
                150,

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
                "2026-07-24T10:00:00.000Z",
            },
          ],

          error:
            null,
        });

    const eq =
      vi.fn()
        .mockReturnValue({
          order,
        });

    const select =
      vi.fn()
        .mockReturnValue({
          eq,
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
      await getMedicalReportMarkersForPatient(
        "user-1",
        client
      );

    expect(
      from
    ).toHaveBeenCalledWith(
      "medical_report_markers"
    );

    expect(
      eq
    ).toHaveBeenCalledWith(
      "user_id",
      "user-1"
    );

    expect(
      order
    ).toHaveBeenCalledWith(
      "created_at",
      {
        ascending:
          false,
      }
    );

    expect(
      result
    ).toHaveLength(
      2
    );

    expect(
      result[0]
    ).toMatchObject({
      report_id:
        105,

      marker_name:
        "LDL",

      marker_value:
        174,
    });
  }
);
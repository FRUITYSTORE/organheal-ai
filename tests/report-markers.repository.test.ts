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
);
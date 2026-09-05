import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildHistoricalLabTrends,
} from "@/lib/historicalLabTrendEngine";

describe(
  "historical lab trend engine",
  () => {
    it(
      "builds a trend when the marker uses the same unit",
      () => {
        const trends =
          buildHistoricalLabTrends(
            [
              {
                marker:
                  "LDL",

                value:
                  150,

                unit:
                  "mg/dL",

                date:
                  "2026-07-01T08:00:00.000Z",
              },

              {
                marker:
                  "LDL",

                value:
                  174,

                unit:
                  "mg/dL",

                date:
                  "2026-09-01T08:00:00.000Z",
              },
            ]
          );

        expect(
          trends
        ).toHaveLength(
          1
        );

        expect(
          trends[0]
        ).toMatchObject({
          marker:
            "LDL",

          unit:
            "mg/dL",

          earliestValue:
            150,

          latestValue:
            174,

          changeAmount:
            24,

          trendDirection:
            "Worsening",
        });
      }
    );

    it(
      "does not compare the same marker across different units",
      () => {
        const trends =
          buildHistoricalLabTrends(
            [
              {
                marker:
                  "HDL",

                value:
                  39,

                unit:
                  "mg/dL",

                date:
                  "2026-07-01T08:00:00.000Z",
              },

              {
                marker:
                  "HDL",

                value:
                  0.93,

                unit:
                  "mmol/L",

                date:
                  "2026-09-01T08:00:00.000Z",
              },
            ]
          );

        expect(
          trends
        ).toEqual(
          []
        );
      }
    );

    it(
      "does not calculate a numeric trend when the unit is missing",
      () => {
        const trends =
          buildHistoricalLabTrends(
            [
              {
                marker:
                  "Glucose",

                value:
                  110,

                unit:
                  null,

                date:
                  "2026-07-01T08:00:00.000Z",
              },

              {
                marker:
                  "Glucose",

                value:
                  128,

                unit:
                  null,

                date:
                  "2026-09-01T08:00:00.000Z",
              },
            ]
          );

        expect(
          trends
        ).toEqual(
          []
        );
      }
    );

    it(
      "treats harmless unit casing differences as the same unit",
      () => {
        const trends =
          buildHistoricalLabTrends(
            [
              {
                marker:
                  "LDL",

                value:
                  174,

                unit:
                  "mg/dL",

                date:
                  "2026-07-01T08:00:00.000Z",
              },

              {
                marker:
                  "LDL",

                value:
                  160,

                unit:
                  "MG/DL",

                date:
                  "2026-09-01T08:00:00.000Z",
              },
            ]
          );

        expect(
          trends
        ).toHaveLength(
          1
        );

        expect(
          trends[0]
            .latestValue
        ).toBe(
          160
        );
      }
    );
  }
);
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getFocusedReportInsight,
  getIntelligenceReportListView,
  getIntelligenceReportStatistics,
} from "@/lib/selectors/intelligence-page.selectors";

type TestInsight = {
  id: number;
  report_id: number | null;
  ai_status: string | null;
  extraction_status?: string | null;
  label: string;
};

const healthInsights: TestInsight[] = [
  {
    id: 901,
    report_id: 101,
    ai_status: "Generated",
    extraction_status: "Completed",
    label: "Old generated report",
  },
  {
    id: 902,
    report_id: 202,
    ai_status: "Pending",
    extraction_status: "Pending",
    label: "Latest uploaded report",
  },
  {
    id: 903,
    report_id: 303,
    ai_status: "Generated",
    extraction_status: "Completed",
    label: "Another generated report",
  },
];

describe(
  "intelligence report selection regression",
  () => {
    it(
      "selects the insight linked to the requested uploaded report ID",
      () => {
        const focusedInsight =
          getFocusedReportInsight({
            healthInsights,
            requestedReportId:
              202,
            activeGeneratedInsightId:
              901,
          });

        expect(
          focusedInsight
        ).toBe(
          healthInsights[1]
        );

        expect(
          focusedInsight
        ).toMatchObject({
          id:
            902,

          report_id:
            202,

          label:
            "Latest uploaded report",
        });
      }
    );

    it(
      "gives the requested report priority over an active generated insight",
      () => {
        const focusedInsight =
          getFocusedReportInsight({
            healthInsights,
            requestedReportId:
              202,
            activeGeneratedInsightId:
              903,
          });

        expect(
          focusedInsight?.id
        ).toBe(
          902
        );

        expect(
          focusedInsight?.report_id
        ).toBe(
          202
        );
      }
    );

    it(
      "supports a requested identifier that directly matches the insight ID",
      () => {
        const focusedInsight =
          getFocusedReportInsight({
            healthInsights,
            requestedReportId:
              903,
            activeGeneratedInsightId:
              null,
          });

        expect(
          focusedInsight
        ).toBe(
          healthInsights[2]
        );

        expect(
          focusedInsight?.id
        ).toBe(
          903
        );
      }
    );

    it(
      "uses the active generated insight only when no requested report is found",
      () => {
        const focusedInsight =
          getFocusedReportInsight({
            healthInsights,
            requestedReportId:
              999,
            activeGeneratedInsightId:
              903,
          });

        expect(
          focusedInsight
        ).toBe(
          healthInsights[2]
        );
      }
    );

    it(
      "falls back to the first pending report when there is no request or active result",
      () => {
        const focusedInsight =
          getFocusedReportInsight({
            healthInsights,
            requestedReportId:
              0,
            activeGeneratedInsightId:
              null,
          });

        expect(
          focusedInsight
        ).toBe(
          healthInsights[1]
        );

        expect(
          focusedInsight?.ai_status
        ).toBe(
          "Pending"
        );
      }
    );

    it(
      "falls back to the first report when every report is already generated",
      () => {
        const generatedOnly =
          healthInsights.map(
            (item) => ({
              ...item,
              ai_status:
                "Generated",
            })
          );

        const focusedInsight =
          getFocusedReportInsight({
            healthInsights:
              generatedOnly,
            requestedReportId:
              0,
            activeGeneratedInsightId:
              null,
          });

        expect(
          focusedInsight
        ).toBe(
          generatedOnly[0]
        );
      }
    );

    it(
      "returns null when no report insights exist",
      () => {
        const focusedInsight =
          getFocusedReportInsight({
            healthInsights:
              [],

            requestedReportId:
              202,

            activeGeneratedInsightId:
              null,
          });

        expect(
          focusedInsight
        ).toBeNull();
      }
    );

    it(
      "removes the focused report from the compact report list",
      () => {
        const focusedInsight =
          getFocusedReportInsight({
            healthInsights,
            requestedReportId:
              202,
            activeGeneratedInsightId:
              null,
          });

        const listView =
          getIntelligenceReportListView({
            healthInsights,

            visibleReportsCount:
              3,

            reportsPageSize:
              2,

            focusedReportInsight:
              focusedInsight,
          });

        expect(
          listView.visibleHealthInsights
        ).toEqual(
          healthInsights
        );

        expect(
          listView.compactHealthInsights
            .map(
              (item) =>
                item.id
            )
        ).toEqual([
          901,
          903,
        ]);

        expect(
          listView.compactHealthInsights
            .some(
              (item) =>
                item.id ===
                focusedInsight?.id
            )
        ).toBe(
          false
        );

        expect(
          listView.canShowLessReports
        ).toBe(
          true
        );

        expect(
          listView.hasOlderReports
        ).toBe(
          false
        );
      }
    );

    it(
      "keeps report statistics synchronized with generated and pending states",
      () => {
        const statistics =
          getIntelligenceReportStatistics(
            healthInsights
          );

        expect(
          statistics
        ).toEqual({
          totalReportInsights:
            3,

          generatedReportsCount:
            2,

          pendingReportsCount:
            1,

          completedExtractionCount:
            2,
        });
      }
    );
  }
);
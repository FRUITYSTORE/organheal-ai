import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getIntelligenceReportRequest,
} from "@/lib/services/intelligence/intelligence-report-request.service";

describe(
  "intelligence report request regression",
  () => {
    it(
      "preserves the uploaded report ID and enables automatic analysis",
      () => {
        const request =
          getIntelligenceReportRequest(
            "?reportId=123&auto=1"
          );

        expect(
          request
        ).toEqual({
          requestedReportId:
            123,

          requestedInsightId:
            0,

          shouldAutoAnalyze:
            true,

          hasRequestedReport:
            true,

          hasRequestedInsight:
            false,

          requestKey:
            "123:0:auto",
        });
      }
    );

    it(
      "keeps report ID and insight ID as separate identifiers",
      () => {
        const request =
          getIntelligenceReportRequest(
            "?reportId=123&insightId=456"
          );

        expect(
          request.requestedReportId
        ).toBe(
          123
        );

        expect(
          request.requestedInsightId
        ).toBe(
          456
        );

        expect(
          request.hasRequestedReport
        ).toBe(
          true
        );

        expect(
          request.hasRequestedInsight
        ).toBe(
          true
        );

        expect(
          request.requestKey
        ).toBe(
          "123:456:view"
        );
      }
    );

    it(
      "supports selecting an insight directly without a report ID",
      () => {
        const request =
          getIntelligenceReportRequest(
            "?insightId=456&auto=1"
          );

        expect(
          request.requestedReportId
        ).toBe(
          0
        );

        expect(
          request.requestedInsightId
        ).toBe(
          456
        );

        expect(
          request.hasRequestedReport
        ).toBe(
          false
        );

        expect(
          request.hasRequestedInsight
        ).toBe(
          true
        );

        expect(
          request.shouldAutoAnalyze
        ).toBe(
          true
        );

        expect(
          request.requestKey
        ).toBe(
          "0:456:auto"
        );
      }
    );

    it(
      "enables automatic analysis only when auto equals exactly one",
      () => {
        expect(
          getIntelligenceReportRequest(
            "?reportId=25&auto=1"
          ).shouldAutoAnalyze
        ).toBe(
          true
        );

        expect(
          getIntelligenceReportRequest(
            "?reportId=25&auto=true"
          ).shouldAutoAnalyze
        ).toBe(
          false
        );

        expect(
          getIntelligenceReportRequest(
            "?reportId=25&auto=0"
          ).shouldAutoAnalyze
        ).toBe(
          false
        );

        expect(
          getIntelligenceReportRequest(
            "?reportId=25"
          ).shouldAutoAnalyze
        ).toBe(
          false
        );
      }
    );

    it(
      "rejects missing, invalid, zero and negative report identifiers",
      () => {
        const searches = [
          "",
          "?reportId=",
          "?reportId=abc",
          "?reportId=0",
          "?reportId=-10",
        ];

        for (
          const search of
          searches
        ) {
          const request =
            getIntelligenceReportRequest(
              search
            );

          expect(
            request.hasRequestedReport
          ).toBe(
            false
          );
        }
      }
    );

    it(
      "normalizes invalid identifiers inside the request key",
      () => {
        const request =
          getIntelligenceReportRequest(
            "?reportId=invalid&insightId=invalid&auto=1"
          );

        expect(
          Number.isNaN(
            request.requestedReportId
          )
        ).toBe(
          true
        );

        expect(
          Number.isNaN(
            request.requestedInsightId
          )
        ).toBe(
          true
        );

        expect(
          request.hasRequestedReport
        ).toBe(
          false
        );

        expect(
          request.hasRequestedInsight
        ).toBe(
          false
        );

        expect(
          request.requestKey
        ).toBe(
          "0:0:auto"
        );
      }
    );

    it(
      "produces a stable key for the same report request",
      () => {
        const firstRequest =
          getIntelligenceReportRequest(
            "?reportId=77&auto=1"
          );

        const repeatedRequest =
          getIntelligenceReportRequest(
            "?reportId=77&auto=1"
          );

        const viewRequest =
          getIntelligenceReportRequest(
            "?reportId=77"
          );

        expect(
          repeatedRequest.requestKey
        ).toBe(
          firstRequest.requestKey
        );

        expect(
          viewRequest.requestKey
        ).not.toBe(
          firstRequest.requestKey
        );

        expect(
          firstRequest.requestKey
        ).toBe(
          "77:0:auto"
        );

        expect(
          viewRequest.requestKey
        ).toBe(
          "77:0:view"
        );
      }
    );
  }
);
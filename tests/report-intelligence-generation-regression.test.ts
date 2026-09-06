import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "@/lib/services/intelligence/report-text-runtime.service",
  () => ({
    loadReportTextRuntime:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/services/intelligence/report-marker-runtime.service",
  () => ({
    prepareReportMarkerRuntime:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/services/intelligence/report-intelligence-result.service",
  () => ({
    buildReportIntelligenceResult:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/services/intelligence/intelligence-persistence.service",
  () => ({
    buildHealthInsightUpdate:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/services/intelligence/report-intelligence-persistence-runtime.service",
  () => ({
    persistReportIntelligence:
      vi.fn(),
  })
);

import {
  generateReportIntelligenceRuntime,
} from "@/lib/services/intelligence/report-intelligence-generation-runtime.service";

import {
  loadReportTextRuntime,
} from "@/lib/services/intelligence/report-text-runtime.service";

import {
  prepareReportMarkerRuntime,
} from "@/lib/services/intelligence/report-marker-runtime.service";

import {
  buildReportIntelligenceResult,
  type GeneratedIntelligenceResult,
} from "@/lib/services/intelligence/report-intelligence-result.service";

import {
  buildHealthInsightUpdate,
} from "@/lib/services/intelligence/intelligence-persistence.service";

import {
  persistReportIntelligence,
} from "@/lib/services/intelligence/report-intelligence-persistence-runtime.service";

const mockedLoadReportTextRuntime =
  vi.mocked(
    loadReportTextRuntime
  );

const mockedPrepareReportMarkerRuntime =
  vi.mocked(
    prepareReportMarkerRuntime
  );

const mockedBuildReportIntelligenceResult =
  vi.mocked(
    buildReportIntelligenceResult
  );

const mockedBuildHealthInsightUpdate =
  vi.mocked(
    buildHealthInsightUpdate
  );

const mockedPersistReportIntelligence =
  vi.mocked(
    persistReportIntelligence
  );

const EXTRACTED_TEXT =
  "This is readable medical report text containing enough characters for intelligence generation.";

const generatedResultPayload:
  GeneratedIntelligenceResult = {
    strategy: {
      status:
        "ready",
    },

    unifiedHealth: {
      healthForecast:
        "Stable",

      priorityGoal:
        "Continue follow-up",

      nextBestAction:
        "Review the current health plan",
    },

    digitalTwin: {
      primarySystem:
        "Cardiovascular",
    },

    crossSource: {
      confidenceLevel:
        "moderate",

      confidenceScore:
        70,
    },

    timeline: {
      trendDirection:
        "stable",
    },

    longitudinalRisk: {
      status:
        "stable",
    },

    forecast: {
      currentScore:
        75,

      forecastScore:
        78,
    },

    healthStory:
      "The current health direction is stable.",

    actionPlan: {
      priority:
        "routine",
    },

    executiveSummary: {
      currentScore:
        75,
    },

    labTrends:
      [],
  };

const intelligenceUpdate = {
  ai_status:
    "Generated",

  medical_category:
    "Laboratory",

  risk_level:
    "stable",

  summary:
    "Stable laboratory context.",

  key_findings:
    "No critical finding.",

  risk_signals:
    "No urgent risk signal.",

  recommendations:
    "Continue routine follow-up.",

  doctor_brief:
    "Stable laboratory context.",

  next_best_action:
    "Continue the current health plan.",
};

function prepareSuccessfulMocks() {
  mockedLoadReportTextRuntime
  .mockResolvedValue({
    status:
      "ready",

    extractedText:
      EXTRACTED_TEXT,

    errorMessage:
      null,

    requiresLogin:
      false,

    jobId:
      null,

    requestId:
      null,
  });

  mockedPrepareReportMarkerRuntime
    .mockResolvedValue({
      detectedMarkers:
        [],

      historicalMarkerRows:
        [],
    });

  mockedBuildReportIntelligenceResult
    .mockReturnValue({
      generatedResultPayload,

      markerSummary: {
        summary:
          "Stable laboratory context.",

        keyFindings:
          "No critical finding.",

        riskSignals:
          "No urgent risk signal.",

        recommendations:
          "Continue routine follow-up.",
      },

      radiologySummary: {
        summary:
          "No radiology summary.",

        riskSignals:
          "No radiology risk signal.",

        recommendations:
          "No radiology recommendation.",
      },

      isRadiologyReport:
        false,

      clinicalPatterns:
        [],
    });

  mockedBuildHealthInsightUpdate
    .mockReturnValue(
      intelligenceUpdate
    );

  mockedPersistReportIntelligence
    .mockResolvedValue({
      success:
        true,
    });
}

describe(
  "report intelligence generation regression",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();

        prepareSuccessfulMocks();
      }
    );

    it(
      "keeps insight ID and report ID attached to the selected report through loading and persistence",
      async () => {
        const result =
          await generateReportIntelligenceRuntime({
            userId:
              "user-123",

            insight: {
              id:
                902,

              report_id:
                202,

              report_type:
                "lab",

              file_path:
                "user-123/report-202.pdf",

              file_name:
                "report-202.pdf",
            },

            assessments:
              [],

            dailyCheckIn:
              null,
          });

        expect(
          mockedLoadReportTextRuntime
        ).toHaveBeenCalledWith({
          userId:
            "user-123",

          insightId:
            902,

          reportId:
            202,

          filePath:
            "user-123/report-202.pdf",

          fileName:
            "report-202.pdf",
        });

        expect(
          mockedPrepareReportMarkerRuntime
        ).toHaveBeenCalledWith({
          userId:
            "user-123",

          reportId:
            202,

          extractedText:
            EXTRACTED_TEXT,
        });

        expect(
          mockedPersistReportIntelligence
        ).toHaveBeenCalledWith({
          userId:
            "user-123",

          insightId:
            902,

          reportId:
            202,

          intelligence:
            intelligenceUpdate,

          generatedResult:
            generatedResultPayload,
        });

        expect(
          result
        ).toEqual({
          success:
            true,

          extractedText:
            EXTRACTED_TEXT,

          generatedResult:
            generatedResultPayload,

          intelligence:
            intelligenceUpdate,
        });
      }
    );

    it(
      "does not confuse an insight ID with its linked uploaded report ID",
      async () => {
        await generateReportIntelligenceRuntime({
          userId:
            "user-456",

          insight: {
            id:
              7001,

            report_id:
              88,

            report_type:
              "clinical",

            file_path:
              "user-456/report-88.pdf",

            file_name:
              "report-88.pdf",
          },

          assessments:
            [],

          dailyCheckIn:
            null,
        });

        expect(
          mockedLoadReportTextRuntime
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            insightId:
              7001,

            reportId:
              88,
          })
        );

        expect(
          mockedPrepareReportMarkerRuntime
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            reportId:
              88,
          })
        );

        expect(
          mockedPersistReportIntelligence
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            insightId:
              7001,

            reportId:
              88,
          })
        );

        expect(
          mockedPersistReportIntelligence
        ).not.toHaveBeenCalledWith(
          expect.objectContaining({
            insightId:
              88,

            reportId:
              7001,
          })
        );
      }
    );

    it(
      "passes report evidence into the result builder without changing patient context",
      async () => {
        const assessments = [
          {
            organ_name:
              "Heart",

            score:
              72,

            created_at:
              "2026-08-01T08:00:00.000Z",
          },
        ];

        const dailyCheckIn = {
          mood:
            "Good",

          wellness_score:
            75,

          created_at:
            "2026-08-02T08:00:00.000Z",
        };

        const detectedMarkers:
  Awaited<
    ReturnType<
      typeof prepareReportMarkerRuntime
    >
  >["detectedMarkers"] = [];

        const historicalMarkerRows = [
          {
            marker_name:
              "LDL",

            marker_value:
              3.5,

            marker_unit:
              "mg/dL",

              created_at:
              "2026-07-01T08:00:00.000Z",
          },
        ];

        mockedPrepareReportMarkerRuntime
          .mockResolvedValue({
            detectedMarkers,

            historicalMarkerRows,
          });

        await generateReportIntelligenceRuntime({
          userId:
            "user-context",

          insight: {
            id:
              55,

            report_id:
              44,

            report_type:
              "lab",

            file_path:
              "user-context/report-44.pdf",

            file_name:
              "report-44.pdf",
          },

          assessments,

          dailyCheckIn,
        });

        expect(
          mockedBuildReportIntelligenceResult
        ).toHaveBeenCalledWith({
          extractedText:
            EXTRACTED_TEXT,

          reportType:
            "lab",

          detectedMarkers,

          assessments,

          dailyCheckIn,

          historicalMarkerRows,

          language:
            "en",
        });
      }
    );

    it(
      "does not build or persist intelligence when report text loading fails",
      async () => {
       mockedLoadReportTextRuntime
  .mockResolvedValue({
    status:
      "failed",

    extractedText:
      null,

    errorMessage:
      "PDF extraction failed.",

    requiresLogin:
      false,

    jobId:
      null,

    requestId:
      null,
  });

        const result =
          await generateReportIntelligenceRuntime({
            userId:
              "user-failed-text",

            insight: {
              id:
                10,

              report_id:
                20,

              report_type:
                "lab",

              file_path:
                "user-failed-text/report.pdf",

              file_name:
                "report.pdf",
            },

            assessments:
              [],

            dailyCheckIn:
              null,
          });

        expect(
          result
        ).toEqual({
          success:
            false,

          stage:
            "report-text",

          errorMessage:
            "PDF extraction failed.",

          requiresLogin:
            false,
        });

        expect(
          mockedPrepareReportMarkerRuntime
        ).not.toHaveBeenCalled();

        expect(
          mockedBuildReportIntelligenceResult
        ).not.toHaveBeenCalled();

        expect(
          mockedBuildHealthInsightUpdate
        ).not.toHaveBeenCalled();

        expect(
          mockedPersistReportIntelligence
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "preserves the login requirement when report text loading reports an expired session",
      async () => {
        mockedLoadReportTextRuntime
  .mockResolvedValue({
    status:
      "failed",

    extractedText:
      null,

    errorMessage:
      "Your session expired. Please login again.",

    requiresLogin:
      true,

    jobId:
      null,

    requestId:
      null,
  });

        const result =
          await generateReportIntelligenceRuntime({
            userId:
              "expired-session-user",

            insight: {
              id:
                33,

              report_id:
                44,

              report_type:
                "lab",
            },

            assessments:
              [],

            dailyCheckIn:
              null,
          });

        expect(
          result
        ).toEqual({
          success:
            false,

          stage:
            "report-text",

          errorMessage:
            "Your session expired. Please login again.",

          requiresLogin:
            true,
        });

        expect(
          mockedPersistReportIntelligence
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns generated-result failure when persistence fails",
      async () => {
        mockedPersistReportIntelligence
          .mockResolvedValue({
            success:
              false,

            stage:
              "generated-result",

            error:
              new Error(
                "Atomic persistence failed"
              ),
          });

        const result =
          await generateReportIntelligenceRuntime({
            userId:
              "user-persistence-failure",

            insight: {
              id:
                81,

              report_id:
                91,

              report_type:
                "lab",
            },

            assessments:
              [],

            dailyCheckIn:
              null,
          });

        expect(
          result
        ).toEqual({
          success:
            false,

          stage:
            "generated-result",

          errorMessage:
            "Atomic persistence failed",

          requiresLogin:
            false,
        });

        expect(
          mockedPersistReportIntelligence
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            insightId:
              81,

            reportId:
              91,
          })
        );
      }
    );

    it(
      "returns the exact generated result and intelligence update that were persisted",
      async () => {
        const result =
          await generateReportIntelligenceRuntime({
            userId:
              "user-result",

            insight: {
              id:
                101,

              report_id:
                202,

              report_type:
                "lab",
            },

            assessments:
              [],

            dailyCheckIn:
              null,
          });

        expect(
          result.success
        ).toBe(
          true
        );

        if (!result.success) {
          throw new Error(
            "Expected successful report intelligence generation."
          );
        }

        expect(
          result.generatedResult
        ).toBe(
          generatedResultPayload
        );

        expect(
          result.intelligence
        ).toBe(
          intelligenceUpdate
        );

        expect(
          mockedPersistReportIntelligence
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            generatedResult:
              result.generatedResult,

            intelligence:
              result.intelligence,
          })
        );
      }
    );
  }
);
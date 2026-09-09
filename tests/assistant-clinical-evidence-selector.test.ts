import {
  describe,
  expect,
  it,
} from "vitest";

import {
  selectAssistantClinicalExplanationEvidence,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-evidence-selector";

function createLatestReport() {
  const reportEvidence = [
    {
      marker:
        "LDL",
      value:
        174,
    },

    {
      marker:
        "Triglycerides",
      value:
        240,
    },
  ];

  const expandedReportEvidence = [
    ...reportEvidence,

    {
      marker:
        "Ferritin",
      value:
        11,
    },

    {
      marker:
        "Vitamin D",
      value:
        18,
    },

    {
      marker:
        "ALT",
      value:
        68,
    },

    {
      marker:
        "Albumin/Creatinine Ratio",
      value:
        31,
    },
  ];

  return {
    latestReport:
      {
        reportEvidence,

        expandedReportEvidence,
      } as never,

    reportEvidence,

    expandedReportEvidence,
  };
}

describe(
  "Assistant clinical evidence selector",
  () => {
    it(
      "keeps focused full-mode conversations on focused report evidence",
      () => {
        const {
          latestReport,
          reportEvidence,
        } =
          createLatestReport();

        const result =
          selectAssistantClinicalExplanationEvidence({
            latestReport,

            mode:
              "full",

            responseScope:
              "focused",
          });

        expect(
          result
        ).toBe(
          reportEvidence
        );

        expect(
          result
        ).toHaveLength(
          2
        );
      }
    );

    it(
      "uses expanded Parser v2 evidence for explicit full-report analysis",
      () => {
        const {
          latestReport,
          expandedReportEvidence,
        } =
          createLatestReport();

        const result =
          selectAssistantClinicalExplanationEvidence({
            latestReport,

            mode:
              "full",

            responseScope:
              "full-report",
          });

        expect(
          result
        ).toBe(
          expandedReportEvidence
        );

        expect(
          result
        ).toHaveLength(
          6
        );
      }
    );

    it(
      "keeps focused cause-reasoning on focused report evidence",
      () => {
        const {
          latestReport,
          reportEvidence,
        } =
          createLatestReport();

        const result =
          selectAssistantClinicalExplanationEvidence({
            latestReport,

            mode:
              "cause-reasoning",

            responseScope:
              "focused",
          });

        expect(
          result
        ).toBe(
          reportEvidence
        );
      }
    );

    it(
      "keeps focused next-step answers on focused report evidence",
      () => {
        const {
          latestReport,
          reportEvidence,
        } =
          createLatestReport();

        const result =
          selectAssistantClinicalExplanationEvidence({
            latestReport,

            mode:
              "next-step",

            responseScope:
              "focused",
          });

        expect(
          result
        ).toBe(
          reportEvidence
        );
      }
    );

    it(
      "preserves legacy full-mode expanded evidence behavior",
      () => {
        const {
          latestReport,
          expandedReportEvidence,
        } =
          createLatestReport();

        const result =
          selectAssistantClinicalExplanationEvidence({
            latestReport,

            mode:
              "full",

            responseScope:
              "legacy",
          });

        expect(
          result
        ).toBe(
          expandedReportEvidence
        );
      }
    );
  }
);

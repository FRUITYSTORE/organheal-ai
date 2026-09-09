import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildAssistantResponseContract,
} from "@/lib/health-intelligence/application/assistant-response-contract.service";

function createResult() {
  return {
    response:
      "Test assistant response.",

    reasoning: {
      mode:
        "answer",

      status:
        "answered",

      confidence:
        "high",

      questionIntent:
        "general",

      clarifyingQuestion:
        null,

      clinicalNarrative:
        null,

      clinicalDecisionTrace:
        null,

      clinicalHypothesisRanking:
        null,

      clinicalConfidenceCalibration:
        null,

      productNavigation:
        null,
    },
  } as never;
}

describe(
  "Assistant active report response contract",
  () => {
    it(
      "returns the trusted active report id when supplied",
      () => {
        const contract =
          buildAssistantResponseContract(
            createResult(),
            "interview-1",
            "en",
            105
          );

        expect(
          contract.activeReportId
        ).toBe(
          105
        );
      }
    );

    it(
      "omits activeReportId when report state was not evaluated",
      () => {
        const contract =
          buildAssistantResponseContract(
            createResult(),
            "interview-1",
            "en"
          );

        expect(
          "activeReportId" in
            contract
        ).toBe(
          false
        );
      }
    );

    it(
      "returns null when the active single-report state is explicitly cleared",
      () => {
        const contract =
          buildAssistantResponseContract(
            createResult(),
            "interview-1",
            "en",
            null
          );

        expect(
          contract.activeReportId
        ).toBeNull();
      }
    );
  }
);
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  resolveAssistantSemanticRouting,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/resolve-assistant-semantic-routing";

import {
  resolveAssistantSemanticRoutingWithModel,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-model.service";

describe(
  "deterministic multi-report routing",
  () => {
    it(
      "resolves an explicit Arabic latest-3 report comparison",
      () => {
        const result =
          resolveAssistantSemanticRouting(
            "قارن آخر 3 تقارير عندي. ما أهم شيء تحسن، وما الذي ساء أو ما زال يحتاج متابعة؟"
          );

        expect(
          result.domain
        ).toBe(
          "clinical_question"
        );

        expect(
          result.confidence
        ).toBe(
          "high"
        );

        expect(
          result.source
        ).toBe(
          "deterministic"
        );

        expect(
          result.understanding
            ?.primaryGoal
        ).toBe(
          "compare"
        );

        expect(
          result.understanding
            ?.needsReportEvidence
        ).toBe(
          true
        );

        expect(
          result.understanding
            ?.needsHistory
        ).toBe(
          true
        );

        expect(
          result.understanding
            ?.reportReference
        ).toEqual({
          kind:
            "latest",

          count:
            3,

          value:
            null,
        });
      }
    );

    it(
      "normalizes Arabic-Indic report counts",
      () => {
        const result =
          resolveAssistantSemanticRouting(
            "قارن آخر ٣ تقارير عندي"
          );

        expect(
          result.understanding
            ?.reportReference
        ).toEqual({
          kind:
            "latest",

          count:
            3,

          value:
            null,
        });
      }
    );

    it(
      "resolves an explicit English latest-N report comparison",
      () => {
        const result =
          resolveAssistantSemanticRouting(
            "Compare my latest 3 reports"
          );

        expect(
          result.understanding
            ?.reportReference
        ).toEqual({
          kind:
            "latest",

          count:
            3,

          value:
            null,
        });
      }
    );

    it(
      "does not call the semantic model for a trusted structured comparison",
      async () => {
        const message =
          "قارن آخر 3 تقارير عندي";

        const deterministicDecision =
          resolveAssistantSemanticRouting(
            message
          );

        const classify =
          vi
            .fn()
            .mockRejectedValue(
              new Error(
                "Semantic model must not be called."
              )
            );

        const result =
          await resolveAssistantSemanticRoutingWithModel({
            input: {
              currentMessage:
                message,

              language:
                "ar",

              conversation:
                [],

              deterministicDecision,
            },

            client: {
              classify,
            },
          });

        expect(
          classify
        ).not.toHaveBeenCalled();

        expect(
          result
        ).toBe(
          deterministicDecision
        );

        expect(
          result.understanding
            ?.reportReference
            ?.count
        ).toBe(
          3
        );
      }
    );

    it(
      "does not guess a report count when the user did not provide one",
      () => {
        const result =
          resolveAssistantSemanticRouting(
            "Compare my latest reports"
          );

        expect(
          result.understanding
            ?.reportReference
            ?.count
        ).not.toBe(
          3
        );
      }
    );
  }
);
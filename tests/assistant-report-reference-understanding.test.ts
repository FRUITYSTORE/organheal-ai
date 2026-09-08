import {
  describe,
  expect,
  it,
} from "vitest";

import {
  validateAssistantSemanticRoutingDecision,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/validate-assistant-semantic-routing";

import type {
  AssistantSemanticReportReference,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-routing.types";

function createDecision(
  reportReference:
    AssistantSemanticReportReference | null
) {
  return {
    domain:
      "clinical_question",

    confidence:
      "high",

    productDestination:
      null,

    requiresConversationContext:
      false,

    reason:
      "The request refers to report evidence.",

    understanding: {
      goals: [
        "summarize",
      ],

      primaryGoal:
        "summarize",

      subject: {
        kind:
          "report",

        value:
          null,
      },

      reportReference,

      referentStatus:
        "resolved",

      referentConfidence:
        "high",

      isFollowUp:
        false,

      refersToPreviousTurn:
        false,

      needsReportEvidence:
        true,

      needsHistory:
        false,

      asksForDiagnosis:
        false,

      asksForUrgency:
        false,

      asksForAction:
        false,

      requestedDepth:
        "normal",
    },
  };
}

describe(
  "assistant report reference understanding",
  () => {
    it(
      "represents the latest report",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision(
            createDecision({
              kind:
                "latest",

              count:
                1,

              value:
                null,
            })
          );

        expect(
          result?.understanding
            ?.reportReference
        ).toEqual({
          kind:
            "latest",

          count:
            1,

          value:
            null,
        });
      }
    );

    it(
      "represents the latest three uploaded reports",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision(
            createDecision({
              kind:
                "latest",

              count:
                3,

              value:
                null,
            })
          );

        expect(
          result?.understanding
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
      "represents a previous report reference",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision(
            createDecision({
              kind:
                "previous",

              count:
                1,

              value:
                null,
            })
          );

        expect(
          result?.understanding
            ?.reportReference?.kind
        ).toBe(
          "previous"
        );
      }
    );

    it(
      "represents the report currently discussed in conversation",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision(
            createDecision({
              kind:
                "current-conversation",

              count:
                1,

              value:
                null,
            })
          );

        expect(
          result?.understanding
            ?.reportReference?.kind
        ).toBe(
          "current-conversation"
        );
      }
    );

    it(
      "represents a specifically identified report",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision(
            createDecision({
              kind:
                "specific",

              count:
                1,

              value:
                "September 2026",
            })
          );

        expect(
          result?.understanding
            ?.reportReference
        ).toEqual({
          kind:
            "specific",

          count:
            1,

          value:
            "September 2026",
        });
      }
    );

    it(
      "represents a report range",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision(
            createDecision({
              kind:
                "range",

              count:
                null,

              value:
                "last 3 months",
            })
          );

        expect(
          result?.understanding
            ?.reportReference
        ).toEqual({
          kind:
            "range",

          count:
            null,

          value:
            "last 3 months",
        });
      }
    );

    it(
      "allows an unspecified report reference without inventing a report",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision(
            createDecision({
              kind:
                "unspecified",

              count:
                null,

              value:
                null,
            })
          );

        expect(
          result?.understanding
            ?.reportReference?.kind
        ).toBe(
          "unspecified"
        );

        expect(
          result?.understanding
            ?.reportReference?.count
        ).toBeNull();
      }
    );

    it(
      "rejects an invalid report count",
      () => {
        const decision =
          createDecision({
            kind:
              "latest",

            count:
              1,

            value:
              null,
          });

        if (
          decision.understanding
            .reportReference
        ) {
          decision.understanding
            .reportReference.count =
              0;
        }

        expect(
          validateAssistantSemanticRoutingDecision(
            decision
          )
        ).toBeNull();
      }
    );

    it(
      "keeps older semantic decisions backwards compatible",
      () => {
        const decision =
          createDecision(
            null
          );

        const {
          reportReference:
            _reportReference,
          ...legacyUnderstanding
        } =
          decision.understanding;

        const result =
          validateAssistantSemanticRoutingDecision({
            ...decision,

            understanding:
              legacyUnderstanding,
          });

        expect(
          result?.understanding
            ?.reportReference
        ).toBeNull();
      }
    );
  }
);
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  validateAssistantSemanticRoutingDecision,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/validate-assistant-semantic-routing";

import {
  mapSemanticUnderstandingToAssistantIntent,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/map-semantic-understanding-to-assistant-intent";

describe(
  "assistant semantic understanding",
  () => {
    it(
      "preserves multiple goals in one clinical message",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision({
            domain:
              "clinical_question",

            confidence:
              "high",

            productDestination:
              null,

            requiresConversationContext:
              false,

            reason:
              "The user asks why a result is high, whether it is serious, and what to do next.",

            understanding: {
              goals: [
                "cause",
                "risk",
                "next-step",
              ],

              primaryGoal:
                "cause",

              subject: {
                kind:
                  "marker",

                value:
                  "glucose",
              },

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
                true,

              asksForAction:
                true,

              requestedDepth:
                "normal",
            },
          });

        expect(
          result?.understanding
            ?.goals
        ).toEqual([
          "cause",
          "risk",
          "next-step",
        ]);

        expect(
          result?.understanding
            ?.asksForAction
        ).toBe(
          true
        );

        expect(
          result?.understanding
            ?.asksForUrgency
        ).toBe(
          true
        );
      }
    );

    it(
      "represents a short contextual follow-up without requiring an explicit marker name",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision({
            domain:
              "clinical_question",

            confidence:
              "high",

            productDestination:
              null,

            requiresConversationContext:
              true,

            reason:
              "The message refers to the finding discussed in the preceding turn.",

            understanding: {
              goals: [
                "cause",
              ],

              primaryGoal:
                "cause",

              subject: {
                kind:
                  "previous-topic",

                value:
                  "LDL",
              },

              isFollowUp:
                true,

              refersToPreviousTurn:
                true,

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
          });

        expect(
          result?.understanding
            ?.isFollowUp
        ).toBe(
          true
        );

        expect(
          result?.understanding
            ?.subject
        ).toEqual({
          kind:
            "previous-topic",

          value:
            "LDL",
        });
      }
    );

    it(
      "maps semantic cause reasoning to the legacy clinical intent",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision({
            domain:
              "clinical_question",

            confidence:
              "high",

            productDestination:
              null,

            requiresConversationContext:
              true,

            reason:
              null,

            understanding: {
              goals: [
                "cause",
              ],

              primaryGoal:
                "cause",

              subject: {
                kind:
                  "previous-topic",

                value:
                  "LDL",
              },

              isFollowUp:
                true,

              refersToPreviousTurn:
                true,

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
                "brief",
            },
          });

        expect(
          mapSemanticUnderstandingToAssistantIntent(
            result
          )
        ).toBe(
          "cause-reasoning"
        );
      }
    );

    it(
      "maps an action request to next-step",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision({
            domain:
              "clinical_question",

            confidence:
              "high",

            productDestination:
              null,

            requiresConversationContext:
              true,

            reason:
              null,

            understanding: {
              goals: [
                "next-step",
              ],

              primaryGoal:
                "next-step",

              subject: {
                kind:
                  "previous-topic",

                value:
                  null,
              },

              isFollowUp:
                true,

              refersToPreviousTurn:
                true,

              needsReportEvidence:
                true,

              needsHistory:
                false,

              asksForDiagnosis:
                false,

              asksForUrgency:
                false,

              asksForAction:
                true,

              requestedDepth:
                "brief",
            },
          });

        expect(
          mapSemanticUnderstandingToAssistantIntent(
            result
          )
        ).toBe(
          "next-step"
        );
      }
    );

    it(
      "maps a danger or significance question to risk",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision({
            domain:
              "clinical_question",

            confidence:
              "high",

            productDestination:
              null,

            requiresConversationContext:
              true,

            reason:
              null,

            understanding: {
              goals: [
                "significance",
                "risk",
              ],

              primaryGoal:
                "significance",

              subject: {
                kind:
                  "previous-topic",

                value:
                  null,
              },

              isFollowUp:
                true,

              refersToPreviousTurn:
                true,

              needsReportEvidence:
                true,

              needsHistory:
                false,

              asksForDiagnosis:
                false,

              asksForUrgency:
                true,

              asksForAction:
                false,

              requestedDepth:
                "brief",
            },
          });

        expect(
          mapSemanticUnderstandingToAssistantIntent(
            result
          )
        ).toBe(
          "risk"
        );
      }
    );

    it(
      "rejects semantic output with an unsupported goal",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision({
            domain:
              "clinical_question",

            confidence:
              "high",

            productDestination:
              null,

            requiresConversationContext:
              false,

            reason:
              null,

            understanding: {
              goals: [
                "invent-diagnosis",
              ],

              primaryGoal:
                "invent-diagnosis",

              subject: {
                kind:
                  "marker",

                value:
                  "LDL",
              },

              isFollowUp:
                false,

              refersToPreviousTurn:
                false,

              needsReportEvidence:
                true,

              needsHistory:
                false,

              asksForDiagnosis:
                true,

              asksForUrgency:
                false,

              asksForAction:
                false,

              requestedDepth:
                "normal",
            },
          });

        expect(
          result
        ).toBeNull();
      }
    );
  }
);
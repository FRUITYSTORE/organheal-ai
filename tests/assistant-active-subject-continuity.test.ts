import {
  describe,
  expect,
  it,
} from "vitest";

import {
  parseAssistantActiveSubjectHint,
  resolveAssistantActiveSubjectContinuity,
} from "@/lib/health-intelligence/application/assistant-continuity/assistant-active-subject-continuity.service";

import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response.service";

import type {
  AssistantSemanticGoal,
  AssistantSemanticRoutingDecision,
  AssistantSemanticSubject,
  AssistantSemanticReferentStatus,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-routing.types";

function createHealthContext():
  AssistantResponseHealthContext {
  return {
    latestReportContext: {
      reportId:
        108,

      fileName:
        "report.pdf",

      reportType:
        "Laboratory",

      uploadedAt:
        null,

      summary:
        null,

      keyFindings:
        null,

      recommendations:
        null,

      doctorBrief:
        null,

      nextBestAction:
        null,

      riskLevel:
        null,

      reportEvidence: [
        {
          marker:
            "LDL",

          value:
            4.26,

          unit:
            "mmol/L",

          status:
            "High",

          referenceLow:
            null,

          referenceHigh:
            3,

          referenceSource:
            "report",
        },
        {
          marker:
            "HbA1c",

          value:
            6.1,

          unit:
            "%",

          status:
            "High",

          referenceLow:
            null,

          referenceHigh:
            5.7,

          referenceSource:
            "report",
        },
      ],
    },
  };
}

function createDecision(
  input: {
    subject:
      AssistantSemanticSubject;

    referentStatus:
      AssistantSemanticReferentStatus;

    isFollowUp?:
      boolean;

    refersToPreviousTurn?:
      boolean;

    primaryGoal?:
      AssistantSemanticGoal;
  }
): AssistantSemanticRoutingDecision {
  const primaryGoal =
    input.primaryGoal ??
    "cause";

  return {
    domain:
      "clinical_question",

    confidence:
      "high",

    source:
      "model",

    productDestination:
      null,

    requiresConversationContext:
      Boolean(
        input.isFollowUp ||
        input.refersToPreviousTurn
      ),

    reason:
      null,

    understanding: {
      goals: [
        primaryGoal,
      ],

      primaryGoal,

      subject:
        input.subject,

      reportReference:
        null,

      referentStatus:
        input.referentStatus,

      referentConfidence:
        input.referentStatus ===
          "resolved"
          ? "high"
          : "low",

      isFollowUp:
        input.isFollowUp ??
        false,

      refersToPreviousTurn:
        input.refersToPreviousTurn ??
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
        primaryGoal ===
          "next-step",

      requestedDepth:
        "normal",
    },
  };
}

describe(
  "assistant active subject continuity",
  () => {
    it(
      "keeps a currently resolved verified marker as the active subject",
      () => {
        const decision =
          createDecision({
            subject: {
              kind:
                "marker",

              value:
                "ldl",
            },

            referentStatus:
              "resolved",
          });

        const result =
          resolveAssistantActiveSubjectContinuity({
            semanticRoutingDecision:
              decision,

            healthContext:
              createHealthContext(),

            priorActiveSubject:
              null,
          });

        expect(
          result.source
        ).toBe(
          "current-semantic"
        );

        expect(
          result.state
            .activeSubject
        ).toEqual({
          kind:
            "marker",

          value:
            "LDL",
        });

        expect(
          result.state
            .clinicalGoal
        ).toBe(
          "cause"
        );
      }
    );

    it(
      "resolves an omitted follow-up subject from a verified prior marker",
      () => {
        const decision =
          createDecision({
            subject: {
              kind:
                "previous-topic",

              value:
                null,
            },

            referentStatus:
              "missing",

            isFollowUp:
              true,

            refersToPreviousTurn:
              true,

            primaryGoal:
              "next-step",
          });

        const result =
          resolveAssistantActiveSubjectContinuity({
            semanticRoutingDecision:
              decision,

            healthContext:
              createHealthContext(),

            priorActiveSubject: {
              kind:
                "marker",

              value:
                "LDL",
            },
          });

        expect(
          result.source
        ).toBe(
          "verified-prior"
        );

        expect(
          result.semanticRoutingDecision
            .understanding
            ?.subject
        ).toEqual({
          kind:
            "marker",

          value:
            "LDL",
        });

        expect(
          result.semanticRoutingDecision
            .understanding
            ?.referentStatus
        ).toBe(
          "resolved"
        );

        expect(
          result.state
            .clinicalGoal
        ).toBe(
          "next-step"
        );
      }
    );

    it(
      "does not inherit a prior subject for a new independent question",
      () => {
        const decision =
          createDecision({
            subject: {
              kind:
                "unknown",

              value:
                null,
            },

            referentStatus:
              "missing",

            isFollowUp:
              false,

            refersToPreviousTurn:
              false,
          });

        const result =
          resolveAssistantActiveSubjectContinuity({
            semanticRoutingDecision:
              decision,

            healthContext:
              createHealthContext(),

            priorActiveSubject: {
              kind:
                "marker",

              value:
                "LDL",
            },
          });

        expect(
          result.source
        ).toBe(
          "none"
        );

        expect(
          result.state
            .activeSubject
        ).toBeNull();
      }
    );

    it(
      "rejects a client-carried marker that is absent from the authenticated report",
      () => {
        const decision =
          createDecision({
            subject: {
              kind:
                "previous-topic",

              value:
                null,
            },

            referentStatus:
              "missing",

            isFollowUp:
              true,

            refersToPreviousTurn:
              true,
          });

        const result =
          resolveAssistantActiveSubjectContinuity({
            semanticRoutingDecision:
              decision,

            healthContext:
              createHealthContext(),

            priorActiveSubject: {
              kind:
                "marker",

              value:
                "Troponin",
            },
          });

        expect(
          result.source
        ).toBe(
          "none"
        );

        expect(
          result.state
            .activeSubject
        ).toBeNull();

        expect(
          result.semanticRoutingDecision
        ).toBe(
          decision
        );
      }
    );

    it(
      "never replaces an explicit current subject with a prior subject",
      () => {
        const decision =
          createDecision({
            subject: {
              kind:
                "marker",

              value:
                "HbA1c",
            },

            referentStatus:
              "resolved",

            isFollowUp:
              true,
          });

        const result =
          resolveAssistantActiveSubjectContinuity({
            semanticRoutingDecision:
              decision,

            healthContext:
              createHealthContext(),

            priorActiveSubject: {
              kind:
                "marker",

              value:
                "LDL",
            },
          });

        expect(
          result.source
        ).toBe(
          "current-semantic"
        );

        expect(
          result.state
            .activeSubject
        ).toEqual({
          kind:
            "marker",

          value:
            "HbA1c",
        });
      }
    );

    it(
      "does not inherit prior single-subject continuity during a multi-report flow",
      () => {
        const decision =
          createDecision({
            subject: {
              kind:
                "previous-topic",

              value:
                null,
            },

            referentStatus:
              "missing",

            isFollowUp:
              true,

            refersToPreviousTurn:
              true,
          });

        const result =
          resolveAssistantActiveSubjectContinuity({
            semanticRoutingDecision:
              decision,

            healthContext:
              createHealthContext(),

            priorActiveSubject: {
              kind:
                "marker",

              value:
                "LDL",
            },

            allowPriorContinuity:
              false,
          });

        expect(
          result.source
        ).toBe(
          "none"
        );

        expect(
          result.state
            .activeSubject
        ).toBeNull();
      }
    );

    it(
      "accepts only bounded marker-shaped client hints",
      () => {
        expect(
          parseAssistantActiveSubjectHint({
            kind:
              "marker",

            value:
              " LDL ",
          })
        ).toEqual({
          kind:
            "marker",

          value:
            "LDL",
        });

        expect(
          parseAssistantActiveSubjectHint({
            kind:
              "organ",

            value:
              "heart",
          })
        ).toBeNull();

        expect(
          parseAssistantActiveSubjectHint({
            kind:
              "marker",

            value:
              "",
          })
        ).toBeNull();

        expect(
          parseAssistantActiveSubjectHint(
            "LDL"
          )
        ).toBeNull();
      }
    );
        it(
      "verifies a current marker against trusted multi-report marker names",
      () => {
        const decision =
          createDecision({
            subject: {
              kind:
                "marker",

              value:
                "ldl",
            },

            referentStatus:
              "resolved",
          });

        const result =
          resolveAssistantActiveSubjectContinuity({
            semanticRoutingDecision:
              decision,

            healthContext:
              null,

            verifiedMarkerNames: [
              "HbA1c",
              "LDL",
              "Triglycerides",
            ],
          });

        expect(
          result.source
        ).toBe(
          "current-semantic"
        );

        expect(
          result.state.activeSubject
        ).toEqual({
          kind:
            "marker",

          value:
            "LDL",
        });
      }
    );

    it(
      "resolves a prior marker from trusted multi-report marker names",
      () => {
        const decision =
          createDecision({
            subject: {
              kind:
                "previous-topic",

              value:
                null,
            },

            referentStatus:
              "missing",

            isFollowUp:
              true,

            refersToPreviousTurn:
              true,

            primaryGoal:
              "next-step",
          });

        const result =
          resolveAssistantActiveSubjectContinuity({
            semanticRoutingDecision:
              decision,

            healthContext:
              null,

            verifiedMarkerNames: [
              "LDL",
              "HbA1c",
            ],

            priorActiveSubject: {
              kind:
                "marker",

              value:
                "LDL",
            },

            allowPriorContinuity:
              true,
          });

        expect(
          result.source
        ).toBe(
          "verified-prior"
        );

        expect(
          result.semanticRoutingDecision
            .understanding
            ?.subject
        ).toEqual({
          kind:
            "marker",

          value:
            "LDL",
        });

        expect(
          result.state.activeSubject
        ).toEqual({
          kind:
            "marker",

          value:
            "LDL",
        });

        expect(
          result.state.clinicalGoal
        ).toBe(
          "next-step"
        );
      }
    );

    it(
      "rejects a carried marker that is absent from trusted multi-report marker names",
      () => {
        const decision =
          createDecision({
            subject: {
              kind:
                "previous-topic",

              value:
                null,
            },

            referentStatus:
              "missing",

            isFollowUp:
              true,

            refersToPreviousTurn:
              true,
          });

        const result =
          resolveAssistantActiveSubjectContinuity({
            semanticRoutingDecision:
              decision,

            healthContext:
              null,

            verifiedMarkerNames: [
              "LDL",
              "HbA1c",
            ],

            priorActiveSubject: {
              kind:
                "marker",

              value:
                "Troponin",
            },

            allowPriorContinuity:
              true,
          });

        expect(
          result.source
        ).toBe(
          "none"
        );

        expect(
          result.state.activeSubject
        ).toBeNull();

        expect(
          result.semanticRoutingDecision
            .understanding
            ?.referentStatus
        ).toBe(
          "missing"
        );
      }
    );
  }
);

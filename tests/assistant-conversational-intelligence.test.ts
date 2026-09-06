import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  enhanceAssistantClinicalResponse,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.service";

import type {
  AssistantClinicalExplanationClient,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.types";

import type {
  AssistantOrchestratorResult,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import type {
  AssistantSemanticRoutingDecision,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-routing.types";

const validExplanation = {
  overview:
    "The supplied evidence has been interpreted in context.",

  priorityFindings: [
    {
      title:
        "Relevant report finding",

      explanation:
        "The finding should be interpreted with the supplied report evidence.",

      evidenceMarkers: [
        "HbA1c",
        "Glucose",
      ],

      importance:
        "important",

      confidence:
        "high",
    },
  ],

  relationships:
    [],

  possibleContributors:
    [],

  reassuringFindings:
    [],

  missingContext:
    [],

  nextSteps: [
    "Review the result with the appropriate clinical context.",
  ],

  questionsForClinician:
    [],

  urgency:
    "timely",

  limitations: [
    "The report alone cannot establish a diagnosis.",
  ],
};

function createDeterministicResult():
  AssistantOrchestratorResult {
  return {
    success:
      true,

    response:
      "Fallback response.",

    clinicalReasoningState:
      null,

    reasoning: {
      mode:
        "answer",

      clinicalUrgencyLevel:
        "none",

      status:
        "ready",

      confidence:
        "moderate",

      availableEvidence:
        [],

      missingInformation:
        [],

      questionIntent:
        "general",

      productNavigation:
        null,

      questionEvidenceStatus:
        "ready",

      questionEvidenceConfidence:
        "moderate",

      questionAvailableEvidence:
        [],

      questionMissingInformation:
        [],

      clinicalHypothesisRanking:
        null,

      clinicalConflictResolution:
        null,

      clinicalConfidenceCalibration:
        null,

      clinicalDecisionTrace:
        null,

      clinicalNarrative:
        null,

      clarifyingQuestion:
        null,

      reason:
        null,
    },
  };
}

function createHealthContext():
  AssistantResponseHealthContext {
  return {
    latestReportContext: {
      reportId:
        111,

      fileName:
        "report.pdf",

      reportType:
        "Laboratory",

      uploadedAt:
        "2026-09-01T10:00:00.000Z",

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
            "HbA1c",

          value:
            6.6,

          unit:
            "%",

          status:
            "High",

          referenceLow:
            0,

          referenceHigh:
            5.7,

          referenceSource:
            "report",
        },

        {
          marker:
            "Glucose",

          value:
            128,

          unit:
            "mg/dL",

          status:
            "High",

          referenceLow:
            70,

          referenceHigh:
            99,

          referenceSource:
            "report",
        },
      ],
    },

    wholeBodyKnowledge: {
      nodes:
        [],

      relationships:
        [],

      clarificationQuestions:
        [],

      coveredDomains:
        [],

      unresolvedDomains:
        [],

      evidenceSufficiency:
        null,

      generatedAt:
        "2026-09-01T10:00:00.000Z",
    },
  };
}

function createSemanticDecision(
  overrides:
    Partial<
      NonNullable<
        AssistantSemanticRoutingDecision["understanding"]
      >
    >
): AssistantSemanticRoutingDecision {
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
      true,

    reason:
      "Resolved from semantic conversation context.",

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

      ...overrides,
    },
  };
}

function createClient() {
  const generate =
    vi.fn().mockResolvedValue(
      validExplanation
    );

  const client:
    AssistantClinicalExplanationClient = {
      generate,
    };

  return {
    client,
    generate,
  };
}

describe(
  "assistant conversational intelligence",
  () => {
    afterEach(
      () => {
        vi.unstubAllEnvs();
      }
    );

    it(
      "resolves a minimal why follow-up from semantic conversation context",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const {
          client,
          generate,
        } =
          createClient();

        await enhanceAssistantClinicalResponse({
          question:
            "ليش؟",

          language:
            "ar",

          healthContext:
            createHealthContext(),

          deterministicResult:
            createDeterministicResult(),

          semanticRoutingDecision:
            createSemanticDecision({}),

          client,

          requestId:
            "req_followup_cause",
        });

        expect(
          generate
        ).toHaveBeenCalledOnce();

        const input =
          generate.mock.calls[0][0];

        expect(
          input.mode
        ).toBe(
          "cause-reasoning"
        );

        expect(
          input.question
        ).toContain(
          "ليش؟"
        );

        expect(
          input.question
        ).toContain(
          "Resolved conversational subject: LDL"
        );

        expect(
          input.question
        ).toContain(
          "conversational follow-up"
        );
      }
    );

    it(
      "uses next-step mode for a short action follow-up without keyword dependence",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const {
          client,
          generate,
        } =
          createClient();

        await enhanceAssistantClinicalResponse({
          question:
            "طيب وبعدين؟",

          language:
            "ar",

          healthContext:
            createHealthContext(),

          deterministicResult:
            createDeterministicResult(),

          semanticRoutingDecision:
            createSemanticDecision({
              goals: [
                "next-step",
              ],

              primaryGoal:
                "next-step",

              asksForAction:
                true,

              subject: {
                kind:
                  "previous-topic",

                value:
                  "LDL",
              },
            }),

          client,

          requestId:
            "req_followup_action",
        });

        const input =
          generate.mock.calls[0][0];

        expect(
          input.mode
        ).toBe(
          "next-step"
        );

        expect(
          input.question
        ).toContain(
          "Resolved conversational subject: LDL"
        );
      }
    );

    it(
      "preserves multiple goals by using an integrated full explanation",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const {
          client,
          generate,
        } =
          createClient();

        await enhanceAssistantClinicalResponse({
          question:
            "ليش السكر عالي وهل الموضوع خطير وشو لازم أعمل؟",

          language:
            "ar",

          healthContext:
            createHealthContext(),

          deterministicResult:
            createDeterministicResult(),

          semanticRoutingDecision:
            createSemanticDecision({
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
                  "Glucose",
              },

              isFollowUp:
                false,

              refersToPreviousTurn:
                false,

              asksForUrgency:
                true,

              asksForAction:
                true,
            }),

          client,

          requestId:
            "req_multi_goal",
        });

        const input =
          generate.mock.calls[0][0];

        expect(
          input.mode
        ).toBe(
          "full"
        );

        expect(
          input.question
        ).toContain(
          "User goals: cause, risk, next-step"
        );

        expect(
          input.question
        ).toContain(
          "Resolved conversational subject: Glucose"
        );
      }
    );

    it(
      "understands a risk follow-up as clinical even when the raw question has no report keyword",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const {
          client,
          generate,
        } =
          createClient();

        await enhanceAssistantClinicalResponse({
          question:
            "طيب هاد خطير؟",

          language:
            "ar",

          healthContext:
            createHealthContext(),

          deterministicResult:
            createDeterministicResult(),

          semanticRoutingDecision:
            createSemanticDecision({
              goals: [
                "significance",
                "risk",
              ],

              primaryGoal:
                "significance",

              asksForUrgency:
                true,
            }),

          client,

          requestId:
            "req_followup_risk",
        });

        expect(
          generate
        ).toHaveBeenCalledOnce();

        const input =
          generate.mock.calls[0][0];

        expect(
          input.mode
        ).toBe(
          "full"
        );

        expect(
          input.question
        ).toContain(
          "Resolved conversational subject: LDL"
        );
      }
    );

    it(
      "preserves a longitudinal question for history-aware reasoning",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const {
          client,
          generate,
        } =
          createClient();

        await enhanceAssistantClinicalResponse({
          question:
            "كان هيك قبل؟",

          language:
            "ar",

          healthContext:
            createHealthContext(),

          deterministicResult:
            createDeterministicResult(),

          semanticRoutingDecision:
            createSemanticDecision({
              goals: [
                "history",
                "compare",
              ],

              primaryGoal:
                "history",

              needsHistory:
                true,
            }),

          client,

          requestId:
            "req_history_followup",
        });

        const input =
          generate.mock.calls[0][0];

        expect(
          input.mode
        ).toBe(
          "full"
        );

        expect(
          input.question
        ).toContain(
          "longitudinal or previous-result context"
        );

        expect(
          input.question
        ).toContain(
          "Resolved conversational subject: LDL"
        );
      }
    );

    it(
      "allows the semantic layer to change the discussed subject naturally",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const {
          client,
          generate,
        } =
          createClient();

        await enhanceAssistantClinicalResponse({
          question:
            "لا قصدي الحديد",

          language:
            "ar",

          healthContext:
            createHealthContext(),

          deterministicResult:
            createDeterministicResult(),

          semanticRoutingDecision:
            createSemanticDecision({
              goals: [
                "explain",
              ],

              primaryGoal:
                "explain",

              subject: {
                kind:
                  "finding",

                value:
                  "iron-related findings",
              },

              isFollowUp:
                true,

              refersToPreviousTurn:
                true,
            }),

          client,

          requestId:
            "req_subject_switch",
        });

        const input =
          generate.mock.calls[0][0];

        expect(
          input.mode
        ).toBe(
          "full"
        );

        expect(
          input.question
        ).toContain(
          "Resolved conversational subject: iron-related findings"
        );
      }
    );
  }
);
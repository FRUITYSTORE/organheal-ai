import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PatientSummary } from "@/lib/models/patient";

vi.mock(
  "@/lib/health-intelligence/application/assistant-response.service",
  () => ({
    buildPersonalizedResponse: vi.fn(() => "PERSONALIZED_RESPONSE"),
  }),
);

vi.mock(
  "@/lib/health-intelligence/application/clinical-response-composer.service",
  () => ({
    composeClinicalResponse: vi.fn(),
  }),
);

import { buildWholeBodyClinicalKnowledge } from "@/lib/health-intelligence/builders/whole-body-clinical-knowledge.builder";

import { buildPersonalizedResponse } from "@/lib/health-intelligence/application/assistant-response.service";

import { composeClinicalResponse } from "@/lib/health-intelligence/application/clinical-response-composer.service";

import { runAssistantOrchestrator } from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import type { AssistantResponseHealthContext } from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

const mockedBuildPersonalizedResponse = vi.mocked(buildPersonalizedResponse);

const mockedComposeClinicalResponse = vi.mocked(composeClinicalResponse);

function createEmptyPatientSummary(): PatientSummary {
  return {
    profile: null,

    assessments: [],

    latestCheckIn: null,

    recentCheckIns: [],

    uploadedReports: [],

    reportMarkers: [],

    healthInsights: [],

    generatedResults: [],

    historyItems: [],
  };
}

function createWholeBodyHealthContext(): AssistantResponseHealthContext {
  return {
    wholeBodyKnowledge: buildWholeBodyClinicalKnowledge(
      createEmptyPatientSummary(),
    ),
  };
}

function createSufficientWholeBodyHealthContext():
  AssistantResponseHealthContext {
  const baseKnowledge =
    buildWholeBodyClinicalKnowledge(
      createEmptyPatientSummary()
    );

  return {
    wholeBodyKnowledge: {
      ...baseKnowledge,

      evidenceSufficiency: {
  status:
    "sufficient",

  reasoningPermission:
    "evidence-based-answer",

  completenessScore:
    100,

  evidenceNodeCount:
    0,

  relationshipCount:
    0,

  sourceTypeCount:
    0,

  coveredDomainCount:
    0,

  unresolvedDomainCount:
    0,

  confidence: {
    evidenceConfidence:
      "high",

    relationshipConfidence:
      "high",

    reasoningConfidence:
      "high",

    recommendationConfidence:
      "high",
  },

  gaps:
    [],

  highImpactMissingInformation:
    [],

  canProvideProvisionalInterpretation:
    true,

  requiresClarification:
    false,

  generatedAt:
    "2026-08-19T05:05:00.000Z",
},
    },
  };
}

function createLegacyOnlyHealthContext(): AssistantResponseHealthContext {
  return {};
}

function createReportHealthContext(): AssistantResponseHealthContext {
  return {
    wholeBodyKnowledge: buildWholeBodyClinicalKnowledge(
      createEmptyPatientSummary(),
    ),

    latestReportContext: {
      reportId: 101,

      fileName: "laboratory-report.pdf",

      reportType: "Laboratory report",

      uploadedAt: "2026-08-01T08:00:00.000Z",

      summary: "The report has a generated summary.",

      keyFindings: "The report includes reviewable findings.",

      recommendations: "Continue clinical follow-up.",

      doctorBrief: "Laboratory report reviewed.",

      nextBestAction: "Discuss the findings with the treating clinician.",

      riskLevel: "Moderate",
                     reportEvidence: [
        {
          marker:
            "LDL",

          value:
            174,

          unit:
            "mg/dL",

          status:
            "High",

          referenceLow:
            0,

          referenceHigh:
            100,

          referenceSource:
            "default",
        },

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
            "default",
        },
      ],
    },
  };
}

describe("Assistant orchestrator dual reasoning", () => {
  beforeEach(() => {
    mockedBuildPersonalizedResponse.mockClear();

    mockedBuildPersonalizedResponse.mockReturnValue("PERSONALIZED_RESPONSE");

    mockedComposeClinicalResponse.mockReset();

    mockedComposeClinicalResponse.mockReturnValue({
      available: false,

      hypothesisId: null,

      title: null,

      summary: null,

      supportingEvidence: [],

      contradictingEvidence: [],

      contextualEvidence: [],

      missingEvidence: [],

      confidence: null,

      confidenceExplanation: null,

      conflictLevel: null,

      requiresClarification: false,

      requiresAdditionalEvidence: false,

      requiresClinicalReview: false,

      interpretationBoundary: null,

      response: null,

      reason: "No clinical response is available in the default test state.",

      generatedAt: "2026-08-06T16:00:00.000Z",
    });
  });

  it("falls back to legacy clarification when the clinical runtime has no actionable clarification", () => {
    const result = runAssistantOrchestrator({
      message: "What could be causing my abnormal result?",

      language: "en",

      healthContext: createWholeBodyHealthContext(),

      conversation: [],
    });

    expect(result.reasoning.mode).toBe("clarify");

    expect(result.response).toBe(
      "Which abnormal result are you concerned about, and are you having any symptoms related to it?",
    );

    expect(result.reasoning.clarifyingQuestion).toBe(result.response);

    expect(result.reasoning.reason).toContain(
      "Additional information could materially change the interpretation",
    );

    expect(mockedBuildPersonalizedResponse).not.toHaveBeenCalled();
  });

  it("falls back to the legacy clarification when whole-body knowledge is unavailable", () => {
    const result = runAssistantOrchestrator({
      message: "What could be causing my abnormal result?",

      language: "en",

      healthContext: createLegacyOnlyHealthContext(),

      conversation: [],
    });

    expect(result.reasoning.mode).toBe("clarify");

    expect(result.response).toBe(
      "Which abnormal result are you concerned about, and are you having any symptoms related to it?",
    );

    expect(result.reasoning.clarifyingQuestion).toBe(result.response);

    expect(result.reasoning.reason).toContain(
      "Additional information could materially change the interpretation",
    );

    expect(mockedBuildPersonalizedResponse).not.toHaveBeenCalled();
  });

  it("does not force whole-body clarification when legacy reasoning selects an answer path", () => {
    const result = runAssistantOrchestrator({
      message: "Summarize my latest report.",

      language: "en",

      healthContext: createReportHealthContext(),

      conversation: [],
    });

    expect(result.reasoning.mode).toBe("answer");

    expect(result.response).toBe("PERSONALIZED_RESPONSE");

    expect(mockedBuildPersonalizedResponse).toHaveBeenCalledTimes(1);

    expect(result.reasoning.questionIntent).toBe("report_summary");
  });

    it("answers an explicit latest-report findings and doctor question without symptom clarification", () => {
    const result = runAssistantOrchestrator({
      message:
        "Based only on my latest uploaded report, what are the 5 most important findings, what exact values support each finding, and what should I discuss with my doctor?",

      language: "en",

      healthContext:
        createReportHealthContext(),

      conversation: [],
    });

    expect(
      result.reasoning.mode
    ).toBe(
      "answer"
    );

    expect(
      result.response
    ).toBe(
      "PERSONALIZED_RESPONSE"
    );

    expect(
      result.reasoning
        .clarifyingQuestion
    ).toBeNull();

    expect(
      mockedBuildPersonalizedResponse
    ).toHaveBeenCalledTimes(
      1
    );
  });

  it("preserves clarification for a clinical cause question that is not grounded in a report", () => {
    const result = runAssistantOrchestrator({
      message:
        "Why am I having chest pain?",

      language: "en",

      healthContext:
        createWholeBodyHealthContext(),

      conversation: [],
    });

    expect(
      result.reasoning.mode
    ).toBe(
      "clarify"
    );

    expect(
      result.reasoning
        .clarifyingQuestion
    ).not.toBeNull();

    expect(
      mockedBuildPersonalizedResponse
    ).not.toHaveBeenCalled();
  });

  it("uses the Arabic whole-body clarification question", () => {
    const result = runAssistantOrchestrator({
      message: "ما سبب النتيجة غير الطبيعية؟",

      language: "ar",

      healthContext: createWholeBodyHealthContext(),

      conversation: [],
    });

    expect(result.reasoning.mode).toBe("clarify");

    expect(result.response).toBe(
      "ما المشكلة الصحية أو العرض أو نتيجة الفحص أو التقرير الطبي الذي تريد من OrganHeal تقييمه أولًا؟",
    );

    expect(result.reasoning.clarifyingQuestion).toBe(result.response);

    expect(mockedBuildPersonalizedResponse).not.toHaveBeenCalled();
  });

  it("allows the clinical runtime to request clarification for an incomplete risk assessment", () => {
    const result = runAssistantOrchestrator({
      message: "What health risks should I be concerned about?",

      language: "en",

      healthContext: createWholeBodyHealthContext(),

      conversation: [],
    });

    expect(result.reasoning.mode).toBe("clarify");

    expect(result.response).toBe(
      "What health concern, symptom, test result, or medical report would you like OrganHeal to evaluate first?",
    );

    expect(result.reasoning.clarifyingQuestion).toBe(result.response);

    expect(result.reasoning.reason).toContain(
      "highest-ranked unresolved evidence gap",
    );

    expect(mockedBuildPersonalizedResponse).not.toHaveBeenCalled();
  });

  it("preserves the established orchestrator reasoning contract", () => {
    const result = runAssistantOrchestrator({
      message: "What could be causing my abnormal result?",

      language: "en",

      healthContext: createWholeBodyHealthContext(),

      conversation: [],
    });

    expect(result).toMatchObject({
      success: true,

      reasoning: {
        mode: "clarify",

        status: expect.any(String),

        confidence: expect.anything(),

        availableEvidence: expect.anything(),

        missingInformation: expect.anything(),

        questionIntent: "cause_reasoning",

        questionEvidenceStatus: expect.any(String),

        questionEvidenceConfidence: expect.anything(),

        questionAvailableEvidence: expect.anything(),

        questionMissingInformation: expect.anything(),

        clarifyingQuestion: expect.any(String),

        reason: expect.any(String),
      },
    });
  });

  it("exposes clinical runtime reasoning artifacts without changing behavior", () => {
    const result = runAssistantOrchestrator({
      message: "What could be causing my abnormal result?",

      language: "en",

      healthContext: createWholeBodyHealthContext(),

      conversation: [],
    });

    expect(result.reasoning.clinicalHypothesisRanking).toBeDefined();

    expect(result.reasoning.clinicalConflictResolution).toBeDefined();

    expect(result.reasoning.clinicalConfidenceCalibration).toBeDefined();

    expect(result.reasoning.clinicalDecisionTrace).toBeDefined();

    expect(result.reasoning.clinicalNarrative).toBeDefined();

    expect(result.reasoning.mode).toBe("clarify");
  });

  it(
  "returns the composed clinical conclusion and closes reasoning when evidence is sufficient",
  () => {
    mockedComposeClinicalResponse
      .mockReturnValue({
        available:
          true,

        hypothesisId:
          "hypothesis:test",

        title:
          "Evidence-supported interpretation",

        summary:
          "A safe clinical interpretation is available.",

        supportingEvidence:
          [],

        contradictingEvidence:
          [],

        contextualEvidence:
          [],

        missingEvidence:
          [],

        confidence:
          "moderate",

        confidenceExplanation:
          "Confidence is calibrated from the available evidence.",

        conflictLevel:
          "none",

        requiresClarification:
          false,

        requiresAdditionalEvidence:
          false,

        requiresClinicalReview:
          false,

        interpretationBoundary:
          "This is not a confirmed diagnosis.",

        response:
          "CLINICAL_RESPONSE",

        reason:
          "A deterministic clinical response was composed.",

        generatedAt:
          "2026-08-19T05:05:00.000Z",
      });

    const result =
      runAssistantOrchestrator({
        message:
          "What should I understand from the available evidence?",

        language:
          "en",

        healthContext:
          createSufficientWholeBodyHealthContext(),

        conversation:
          [],
      });

    expect(
      result.reasoning.mode
    ).toBe(
      "answer"
    );

    expect(
      result.reasoning
        .clarifyingQuestion
    ).toBeNull();

    expect(
      result.response
    ).toBe(
      "CLINICAL_RESPONSE"
    );

    expect(
      result.clinicalReasoningState
        ?.status
    ).toBe(
      "closed"
    );

    expect(
      mockedComposeClinicalResponse
    ).toHaveBeenCalledTimes(
      1
    );

    expect(
      mockedBuildPersonalizedResponse
    ).toHaveBeenCalledTimes(
      1
    );
  }
);

  it("preserves the report-grounded response when a clinical response is also available", () => {
    mockedComposeClinicalResponse.mockReturnValue({
      available: true,

      hypothesisId: "hypothesis:test",

      title: "Evidence-supported interpretation",

      summary: "A safe clinical interpretation is available.",

      supportingEvidence: [],

      contradictingEvidence: [],

      contextualEvidence: [],

      missingEvidence: [],

      confidence: "moderate",

      confidenceExplanation:
        "Confidence is calibrated from the available evidence.",

      conflictLevel: "none",

      requiresClarification: false,

      requiresAdditionalEvidence: false,

      requiresClinicalReview: false,

      interpretationBoundary: "This is not a confirmed diagnosis.",

      response: "CLINICAL_RESPONSE",

      reason: "A deterministic clinical response was composed.",

      generatedAt: "2026-08-06T16:00:00.000Z",
    });

    const result = runAssistantOrchestrator({
      message: "Summarize my latest report.",

      language: "en",

      healthContext: createReportHealthContext(),

      conversation: [],
    });

    expect(result.reasoning.mode).toBe("answer");

    expect(result.response).toBe("PERSONALIZED_RESPONSE");

    expect(mockedComposeClinicalResponse).toHaveBeenCalledTimes(1);

    expect(mockedBuildPersonalizedResponse).toHaveBeenCalledTimes(1);
  });

  it("keeps the personalized response when no clinical response is available", () => {
    const result = runAssistantOrchestrator({
      message: "Summarize my latest report.",

      language: "en",

      healthContext: createReportHealthContext(),

      conversation: [],
    });

    expect(result.reasoning.mode).toBe("answer");

    expect(result.response).toBe("PERSONALIZED_RESPONSE");

    expect(mockedComposeClinicalResponse).toHaveBeenCalledTimes(1);

    expect(mockedBuildPersonalizedResponse).toHaveBeenCalledTimes(1);
  });
    it("does not allow product navigation to override clinical urgency", () => {
    const result =
      runAssistantOrchestrator({
        message:
          "Open my reports, but I have severe chest pain right now.",

        language:
          "en",

        healthContext:
          null,

        conversation:
          [],
      });

    expect(
      result.reasoning.productNavigation
    ).toBeNull();

    expect(
      result.reasoning.mode
    ).toBe(
      "answer"
    );

    expect(
      result.response
    ).toBeTruthy();
  });
  it(
  "uses a trusted semantic product navigation decision for an otherwise unclear message",
  () => {
    const result =
      runAssistantOrchestrator({
        message:
          "طيب وين بلاقيه؟",

        language:
          "ar",

        healthContext:
          null,

        conversation: [
          {
            role:
              "assistant",

            content:
              "نتيجة تقريرك الأخير متاحة الآن.",
          },
        ],

        semanticRoutingDecision: {
          domain:
            "product_navigation",

          confidence:
            "high",

          source:
            "model",

          productDestination:
            "view-results",

          requiresConversationContext:
            true,

          reason:
            "The follow-up refers to the previously discussed report results.",
        },
      });

    expect(
      result.reasoning
        .productNavigation
        ?.matched
    ).toBe(true);

    expect(
      result.reasoning
        .productNavigation
        ?.destination
    ).toBe(
      "view-results"
    );

    expect(
      result.reasoning
        .productNavigation
        ?.confidence
    ).toBe(
      "high"
    );
  }
);

it(
  "does not allow a semantic product navigation decision to override clinical urgency",
  () => {
    const result =
      runAssistantOrchestrator({
        message:
          "Open my reports, but I have severe chest pain right now.",

        language:
          "en",

        healthContext:
          null,

        conversation:
          [],

        semanticRoutingDecision: {
          domain:
            "product_navigation",

          confidence:
            "high",

          source:
            "model",

          productDestination:
            "reports",

          requiresConversationContext:
            false,

          reason:
            "The user mentioned reports.",
        },
      });

    expect(
      result.reasoning
        .productNavigation
    ).toBeNull();

    expect(
      result.reasoning.mode
    ).toBe(
      "answer"
    );

    expect(
      result.response
    ).toBeTruthy();
  }
);
});

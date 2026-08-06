import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  PatientSummary,
} from "@/lib/models/patient";

vi.mock(
  "@/lib/health-intelligence/application/assistant-response.service",
  () => ({
    buildPersonalizedResponse:
      vi.fn(
        () =>
          "PERSONALIZED_RESPONSE"
      ),
  })
);

import {
  buildWholeBodyClinicalKnowledge,
} from "@/lib/health-intelligence/builders/whole-body-clinical-knowledge.builder";

import {
  buildPersonalizedResponse,
} from "@/lib/health-intelligence/application/assistant-response.service";

import {
  runAssistantOrchestrator,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

const mockedBuildPersonalizedResponse =
  vi.mocked(
    buildPersonalizedResponse
  );

function createEmptyPatientSummary():
  PatientSummary {
  return {
    profile:
      null,

    assessments:
      [],

    latestCheckIn:
      null,

    recentCheckIns:
      [],

    uploadedReports:
      [],

    healthInsights:
      [],

    generatedResults:
      [],

    historyItems:
      [],
  };
}

function createWholeBodyHealthContext():
  AssistantResponseHealthContext {
  return {
    wholeBodyKnowledge:
      buildWholeBodyClinicalKnowledge(
        createEmptyPatientSummary()
      ),
  };
}

function createLegacyOnlyHealthContext():
  AssistantResponseHealthContext {
  return {};
}

function createReportHealthContext():
  AssistantResponseHealthContext {
  return {
    wholeBodyKnowledge:
      buildWholeBodyClinicalKnowledge(
        createEmptyPatientSummary()
      ),

    latestReportContext: {
      reportId:
        101,

      fileName:
        "laboratory-report.pdf",

      reportType:
        "Laboratory report",

      uploadedAt:
        "2026-08-01T08:00:00.000Z",

      summary:
        "The report has a generated summary.",

      keyFindings:
        "The report includes reviewable findings.",

      recommendations:
        "Continue clinical follow-up.",

      doctorBrief:
        "Laboratory report reviewed.",

      nextBestAction:
        "Discuss the findings with the treating clinician.",

      riskLevel:
        "Moderate",
    },
  };
}

describe(
  "Assistant orchestrator dual reasoning",
  () => {
    beforeEach(
      () => {
        mockedBuildPersonalizedResponse
          .mockClear();

        mockedBuildPersonalizedResponse
          .mockReturnValue(
            "PERSONALIZED_RESPONSE"
          );
      }
    );

    it(
      "uses the whole-body clarification question when legacy reasoning requires clarification",
      () => {
        const result =
          runAssistantOrchestrator({
            message:
              "What could be causing my abnormal result?",

            language:
              "en",

            healthContext:
              createWholeBodyHealthContext(),

            conversation:
              [],
          });

        expect(
          result.reasoning.mode
        ).toBe(
          "clarify"
        );

        expect(
          result.response
        ).toBe(
          "What health concern, symptom, test result, or medical report would you like OrganHeal to evaluate first?"
        );

        expect(
          result.reasoning
            .clarifyingQuestion
        ).toBe(
          result.response
        );

        expect(
          result.reasoning.reason
        ).toContain(
          "highest-ranked unresolved evidence gap"
        );

        expect(
          mockedBuildPersonalizedResponse
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "falls back to the legacy clarification when whole-body knowledge is unavailable",
      () => {
        const result =
          runAssistantOrchestrator({
            message:
              "What could be causing my abnormal result?",

            language:
              "en",

            healthContext:
              createLegacyOnlyHealthContext(),

            conversation:
              [],
          });

        expect(
          result.reasoning.mode
        ).toBe(
          "clarify"
        );

        expect(
          result.response
        ).toBe(
          "Which abnormal result are you concerned about, and are you having any symptoms related to it?"
        );

        expect(
          result.reasoning
            .clarifyingQuestion
        ).toBe(
          result.response
        );

        expect(
          result.reasoning.reason
        ).toContain(
          "Additional information could materially change the interpretation"
        );

        expect(
          mockedBuildPersonalizedResponse
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not force whole-body clarification when legacy reasoning selects an answer path",
      () => {
        const result =
          runAssistantOrchestrator({
            message:
              "Summarize my latest report.",

            language:
              "en",

            healthContext:
              createReportHealthContext(),

            conversation:
              [],
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
          mockedBuildPersonalizedResponse
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          result.reasoning
            .questionIntent
        ).toBe(
          "report_summary"
        );
      }
    );

    it(
      "uses the Arabic whole-body clarification question",
      () => {
        const result =
          runAssistantOrchestrator({
            message:
              "ما سبب النتيجة غير الطبيعية؟",

            language:
              "ar",

            healthContext:
              createWholeBodyHealthContext(),

            conversation:
              [],
          });

        expect(
          result.reasoning.mode
        ).toBe(
          "clarify"
        );

        expect(
          result.response
        ).toBe(
          "ما المشكلة الصحية أو العرض أو نتيجة الفحص أو التقرير الطبي الذي تريد من OrganHeal تقييمه أولًا؟"
        );

        expect(
          result.reasoning
            .clarifyingQuestion
        ).toBe(
          result.response
        );

        expect(
          mockedBuildPersonalizedResponse
        ).not.toHaveBeenCalled();
      }
    );

        it(
      "allows the clinical runtime to request clarification for an incomplete risk assessment",
      () => {
        const result =
          runAssistantOrchestrator({
            message:
              "What health risks should I be concerned about?",

            language:
              "en",

            healthContext:
              createWholeBodyHealthContext(),

            conversation:
              [],
          });

        expect(
          result.reasoning.mode
        ).toBe(
          "clarify"
        );

        expect(
          result.response
        ).toBe(
          "What health concern, symptom, test result, or medical report would you like OrganHeal to evaluate first?"
        );

        expect(
          result.reasoning
            .clarifyingQuestion
        ).toBe(
          result.response
        );

        expect(
          result.reasoning.reason
        ).toContain(
          "highest-ranked unresolved evidence gap"
        );

        expect(
          mockedBuildPersonalizedResponse
        ).not.toHaveBeenCalled();
      }
    );
    
    it(
      "preserves the established orchestrator reasoning contract",
      () => {
        const result =
          runAssistantOrchestrator({
            message:
              "What could be causing my abnormal result?",

            language:
              "en",

            healthContext:
              createWholeBodyHealthContext(),

            conversation:
              [],
          });

        expect(
          result
        ).toMatchObject({
          success:
            true,

          reasoning: {
            mode:
              "clarify",

            status:
              expect.any(
                String
              ),

            confidence:
              expect.anything(),

            availableEvidence:
              expect.anything(),

            missingInformation:
              expect.anything(),

            questionIntent:
              "cause_reasoning",

            questionEvidenceStatus:
              expect.any(
                String
              ),

            questionEvidenceConfidence:
              expect.anything(),

            questionAvailableEvidence:
              expect.anything(),

            questionMissingInformation:
              expect.anything(),

            clarifyingQuestion:
              expect.any(
                String
              ),

            reason:
              expect.any(
                String
              ),
          },
        });
      }
    );
  }
);
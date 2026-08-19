import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "@/lib/health-intelligence/application/assistant-orchestrator.service",
  () => ({
    runAssistantOrchestrator:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/health-intelligence/application/assistant-response-contract.service",
  () => ({
    buildAssistantResponseContract:
      vi.fn(
        (
          value,
          clinicalInterviewId = null
        ) => ({
          ...value,
          clinicalInterviewId,
        })
      ),
  })
);

vi.mock(
  "@/lib/supabase",
  () => ({
    supabase: {},
  })
);

vi.mock(
  "@/lib/repositories/clinical-interview.repository",
  () => ({
    createClinicalInterview:
      vi.fn(),

    getClinicalInterview:
      vi.fn(),

    getRecentClinicalInterviews:
      vi.fn(),

    updateClinicalInterview:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/api/api-auth",
  () => ({
    authenticateApiRequest:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/health-intelligence/application/authenticated-assistant-context.service",
  () => ({
    buildAuthenticatedAssistantContext:
      vi.fn(),
  })
);

import {
  authenticateApiRequest,
} from "@/lib/api/api-auth";

import {
  buildAuthenticatedAssistantContext,
} from "@/lib/health-intelligence/application/authenticated-assistant-context.service";

import {
  runAssistantOrchestrator,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import {
  buildAssistantResponseContract,
} from "@/lib/health-intelligence/application/assistant-response-contract.service";

import {
  createClinicalInterview,
  getClinicalInterview,
  getRecentClinicalInterviews,
  updateClinicalInterview,
} from "@/lib/repositories/clinical-interview.repository";

import type {
  ClinicalReasoningState,
} from "@/lib/health-intelligence/runtime/clinical-reasoning-state";

import {
  POST,
} from "@/app/api/assistant/route";

const mockedRunAssistantOrchestrator =
  vi.mocked(
    runAssistantOrchestrator
  );

const mockedBuildAssistantResponseContract =
  vi.mocked(
    buildAssistantResponseContract
  );

const mockedAuthenticateApiRequest =
  vi.mocked(
    authenticateApiRequest
  );

const mockedBuildAuthenticatedAssistantContext =
  vi.mocked(
    buildAuthenticatedAssistantContext
  );

const mockedCreateClinicalInterview =
  vi.mocked(
    createClinicalInterview
  );

const mockedGetClinicalInterview =
  vi.mocked(
    getClinicalInterview
  );

  const mockedGetRecentClinicalInterviews =
  vi.mocked(
    getRecentClinicalInterviews
  );

const mockedUpdateClinicalInterview =
  vi.mocked(
    updateClinicalInterview
  );

function createAssistantRequest(
  body:
    unknown
): Request {
  return new Request(
    "http://localhost/api/assistant",
    {
      method:
        "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(
          body
        ),
    }
  );
}

function createOrchestratorResult(
  response:
    string
): ReturnType<
  typeof runAssistantOrchestrator
> {
  return {
    success:
      true,

    response,

    clinicalReasoningState:
      null,

    reasoning: {
      mode:
        "answer",

      status:
        "sufficient",

      confidence:
        "high",

      availableEvidence:
        [],

      missingInformation:
        [],

      questionIntent:
        "general",

      questionEvidenceStatus:
        "sufficient",

      questionEvidenceConfidence:
        "high",

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

      clarifyingQuestion:
        null,

      reason:
        null,
    },
  };
}

describe(
  "POST /api/assistant",
  () => {
    let consoleErrorSpy:
      ReturnType<
        typeof vi.spyOn
      >;

    beforeEach(
      () => {
        mockedRunAssistantOrchestrator
          .mockReset();

        mockedBuildAssistantResponseContract
          .mockReset();

        mockedAuthenticateApiRequest
          .mockReset();

        mockedBuildAuthenticatedAssistantContext
          .mockReset();

        mockedCreateClinicalInterview
          .mockReset();

        mockedGetClinicalInterview
          .mockReset();

        mockedGetRecentClinicalInterviews
          .mockReset();
        mockedUpdateClinicalInterview
          .mockReset();

        mockedBuildAssistantResponseContract
          .mockImplementation(
            (
              value,
              clinicalInterviewId = null
            ) =>
              ({
                ...value,

                clinicalInterviewId,
              }) as unknown as ReturnType<
                typeof buildAssistantResponseContract
              >
          );

        consoleErrorSpy =
          vi
            .spyOn(
              console,
              "error"
            )
            .mockImplementation(
              () =>
                undefined
            );
      }
    );

    afterEach(
      () => {
        consoleErrorSpy
          .mockRestore();
      }
    );

    it(
      "returns 400 when message is missing",
      async () => {
        const response =
          await POST(
            createAssistantRequest({
              language:
                "en",
            })
          );

        expect(
          response.status
        ).toBe(
          400
        );

        const responseBody =
          (await response.json()) as {
            error?:
              string;

            requestId?:
              string;
          };

        expect(
          responseBody
        ).toMatchObject({
          error:
            "Message is required",
        });

        expect(
          responseBody.requestId
        ).toMatch(
          /^req_[0-9a-f-]+$/i
        );

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          responseBody.requestId
        );

        expect(
          mockedRunAssistantOrchestrator
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 400 when message contains only whitespace",
      async () => {
        const response =
          await POST(
            createAssistantRequest({
              message:
                "   ",
            })
          );

        expect(
          response.status
        ).toBe(
          400
        );

        const responseBody =
          (await response.json()) as {
            error?:
              string;

            requestId?:
              string;
          };

        expect(
          responseBody
        ).toMatchObject({
          error:
            "Message is required",
        });

        expect(
          responseBody.requestId
        ).toMatch(
          /^req_[0-9a-f-]+$/i
        );

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          responseBody.requestId
        );

        expect(
          mockedRunAssistantOrchestrator
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "passes Arabic language to the orchestrator",
      async () => {
        const orchestratorResult =
          createOrchestratorResult(
            "إجابة صحية مخصصة"
          );

        mockedRunAssistantOrchestrator
          .mockReturnValue(
            orchestratorResult
          );

        const response =
          await POST(
            createAssistantRequest({
              message:
                "ما هي خطوتي التالية؟",

              language:
                "ar",

              healthContext:
                null,

              conversation:
                [],
            })
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          mockedRunAssistantOrchestrator
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedBuildAssistantResponseContract
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedBuildAssistantResponseContract
        ).toHaveBeenCalledWith(
          orchestratorResult,
          null
        );

        expect(
          mockedRunAssistantOrchestrator
        ).toHaveBeenCalledWith({
          message:
            "ما هي خطوتي التالية؟",

          language:
            "ar",

          healthContext:
            null,

          conversation:
            [],
        });

        await expect(
          response.json()
        ).resolves.toEqual({
          ...orchestratorResult,

          clinicalInterviewId:
            null,
        });
      }
    );

    it(
      "normalizes unsupported languages to English",
      async () => {
        const orchestratorResult =
          createOrchestratorResult(
            "English response"
          );

        mockedRunAssistantOrchestrator
          .mockReturnValue(
            orchestratorResult
          );

        const response =
          await POST(
            createAssistantRequest({
              message:
                "What should I do next?",

              language:
                "fr",
            })
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          mockedRunAssistantOrchestrator
        ).toHaveBeenCalledWith({
          message:
            "What should I do next?",

          language:
            "en",

          healthContext:
            null,

          conversation:
            [],
        });

        await expect(
          response.json()
        ).resolves.toEqual({
          ...orchestratorResult,

          clinicalInterviewId:
            null,
        });
      }
    );

    it(
      "normalizes a non-array conversation to an empty array",
      async () => {
        const orchestratorResult =
          createOrchestratorResult(
            "Normalized conversation"
          );

        mockedRunAssistantOrchestrator
          .mockReturnValue(
            orchestratorResult
          );

        const response =
          await POST(
            createAssistantRequest({
              message:
                "Review my progress",

              language:
                "en",

              conversation: {
                role:
                  "user",

                content:
                  "Invalid conversation shape",
              },
            })
          );

        expect(
          mockedRunAssistantOrchestrator
        ).toHaveBeenCalledWith({
          message:
            "Review my progress",

          language:
            "en",

          healthContext:
            null,

          conversation:
            [],
        });

        await expect(
          response.json()
        ).resolves.toEqual({
          ...orchestratorResult,

          clinicalInterviewId:
            null,
        });
      }
    );

    it(
      "ignores client health context and preserves valid conversation for unauthenticated requests",
      async () => {
        const healthContext = {
          overallScore:
            78,

          priorityOrgan:
            "Heart",

          recommendation:
            "Continue routine follow-up.",
        };

        const conversation = [
          {
            role:
              "user" as const,

            content:
              "What did my latest report show?",
          },

          {
            role:
              "assistant" as const,

            content:
              "Your recent context was reviewed.",
          },
        ];

        const request =
          new Request(
            "http://localhost/api/assistant",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  message:
                    "What should I focus on?",

                  language:
                    "en",

                  healthContext,

                  conversation,
                }),
            }
          );

        await POST(
          request
        );

        expect(
          mockedRunAssistantOrchestrator
        ).toHaveBeenCalledWith({
          message:
            "What should I focus on?",

          language:
            "en",

          healthContext:
            null,

          conversation,
        });
      }
    );

    it(
      "returns the public assistant response contract",
      async () => {
        const orchestratorResult =
          createOrchestratorResult(
            "Review your latest health plan."
          );

        mockedRunAssistantOrchestrator
          .mockReturnValue(
            orchestratorResult
          );

        const response =
          await POST(
            createAssistantRequest({
              message:
                "Give me an overview",
            })
          );

        expect(
          response.status
        ).toBe(
          200
        );

        await expect(
          response.json()
        ).resolves.toEqual({
          ...orchestratorResult,

          clinicalInterviewId:
            null,
        });
      }
    );

    it(
      "continues an authenticated clinical interview using trusted server-side state",
      async () => {
        const authenticatedClient =
          {} as never;

        const dateNowSpy =
          vi.spyOn(
          Date,
         "now"
         ).mockReturnValue(
         new Date(
        "2026-08-18T18:00:00.000Z"
        ).getTime()
        );

        const existingReasoningState:
          ClinicalReasoningState = {
          id:
            "reasoning_state_existing",

          originalQuestion:
            "What could be causing my abnormal result?",

          currentQuestion:
            "What symptoms are you having?",

          intent:
            "cause-reasoning",

          language:
            "en",

          status:
            "awaiting-clarification",

          askedClarificationQuestionIds: [
            "clarification:no-evidence",
          ],

          resolvedGapTypes:
            [],

          collectedEvidence:
            [],

          runtimeHistory:
            [],

          currentRuntime:
            {} as ClinicalReasoningState["currentRuntime"],

          createdAt:
            "2026-08-18T12:00:00.000Z",

          updatedAt:
            "2026-08-18T12:00:00.000Z",
        };

        const updatedReasoningState:
          ClinicalReasoningState = {
          ...existingReasoningState,

          currentQuestion:
            "How long have the symptoms been present?",

          resolvedGapTypes: [
            "no-evidence",
          ],

          updatedAt:
            "2026-08-18T12:05:00.000Z",
        };

        mockedAuthenticateApiRequest
          .mockResolvedValue({
            success:
              true,

            user: {
              id:
                "user-1",
            },

            client:
              authenticatedClient,
          } as never);

        mockedBuildAuthenticatedAssistantContext
          .mockResolvedValue({
            wholeBodyKnowledge:
              {},
          } as never);

        mockedGetClinicalInterview
          .mockResolvedValue({
            id:
              "interview-1",

            user_id:
              "user-1",

            status:
              "active",

            reasoning_state:
              existingReasoningState,

            created_at:
              "2026-08-18T12:00:00.000Z",

            updated_at:
              "2026-08-18T12:00:00.000Z",
          });

        const orchestratorResult =
          createOrchestratorResult(
            "How long have the symptoms been present?"
          );

        orchestratorResult
          .clinicalReasoningState =
            updatedReasoningState;

        mockedRunAssistantOrchestrator
          .mockReturnValue(
            orchestratorResult
          );

        mockedUpdateClinicalInterview
          .mockResolvedValue({
            id:
              "interview-1",

            user_id:
              "user-1",

            status:
              "active",

            reasoning_state:
              updatedReasoningState,

            created_at:
              "2026-08-18T12:00:00.000Z",

            updated_at:
              "2026-08-18T12:05:00.000Z",
          });

        const request =
          new Request(
            "http://localhost/api/assistant",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  "Bearer test-token",
              },

              body:
                JSON.stringify({
                  message:
                    "I have had severe fatigue and dizziness for two weeks.",

                  language:
                    "en",

                  conversation:
                    [],

                  clinicalInterviewId:
                    "interview-1",
                }),
            }
          );

        const response =
          await POST(
            request
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          mockedGetClinicalInterview
        ).toHaveBeenCalledWith(
          "user-1",
          "interview-1",
          authenticatedClient
        );

        expect(
          mockedRunAssistantOrchestrator
        ).toHaveBeenCalledWith({
          message:
            "I have had severe fatigue and dizziness for two weeks.",

          language:
            "en",

          healthContext:
            expect.anything(),

          conversation:
            [],

          clinicalReasoningState:
            existingReasoningState,
        });

        expect(
          mockedUpdateClinicalInterview
        ).toHaveBeenCalledWith(
          {
            userId:
              "user-1",

            interviewId:
              "interview-1",

            reasoningState:
              updatedReasoningState,

            status:
              "active",
          },

          authenticatedClient
        );

        expect(
          mockedCreateClinicalInterview
        ).not.toHaveBeenCalled();

        expect(
          mockedBuildAssistantResponseContract
        ).toHaveBeenCalledWith(
          orchestratorResult,
          "interview-1"
        );

        const responseBody =
          await response.json();

        expect(
          responseBody.clinicalInterviewId
        ).toBe(
          "interview-1"
        );

        expect(
          "reasoning_state" in responseBody
        ).toBe(
          false
        );
      }
    );

    it(
  "rejects a completed clinical interview when an explicit interview id is provided",
  async () => {
    const authenticatedClient =
      {} as never;

    const completedReasoningState:
      ClinicalReasoningState = {
      id:
        "reasoning_state_completed",

      originalQuestion:
        "What could be causing my abnormal result?",

      currentQuestion:
        "What could be causing my abnormal result?",

      intent:
        "cause-reasoning",

      language:
        "en",

      status:
        "closed",

      askedClarificationQuestionIds:
        [],

      resolvedGapTypes:
        [],

      collectedEvidence:
        [],

      runtimeHistory:
        [],

      currentRuntime:
        {} as ClinicalReasoningState["currentRuntime"],

      createdAt:
        "2026-08-18T12:00:00.000Z",

      updatedAt:
        "2026-08-18T12:10:00.000Z",
    };

    mockedAuthenticateApiRequest
      .mockResolvedValue({
        success:
          true,

        user: {
          id:
            "user-1",
        },

        client:
          authenticatedClient,
      } as never);

    mockedBuildAuthenticatedAssistantContext
      .mockResolvedValue({
        wholeBodyKnowledge:
          {},
      } as never);

    mockedGetClinicalInterview
      .mockResolvedValue({
        id:
          "interview-completed",

        user_id:
          "user-1",

        status:
          "completed",

        reasoning_state:
          completedReasoningState,

        created_at:
          "2026-08-18T12:00:00.000Z",

        updated_at:
          "2026-08-18T12:10:00.000Z",
      });

    const request =
      new Request(
        "http://localhost/api/assistant",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              "Bearer test-token",
          },

          body:
            JSON.stringify({
              message:
                "Continue this interview.",

              language:
                "en",

              conversation:
                [],

              clinicalInterviewId:
                "interview-completed",
            }),
        }
      );

    const response =
      await POST(
        request
      );

    expect(
      response.status
    ).toBe(
      409
    );

    await expect(
      response.json()
    ).resolves.toMatchObject({
      error:
        "Clinical interview is no longer active.",
    });

    expect(
      mockedRunAssistantOrchestrator
    ).not.toHaveBeenCalled();

    expect(
      mockedUpdateClinicalInterview
    ).not.toHaveBeenCalled();

    expect(
      mockedCreateClinicalInterview
    ).not.toHaveBeenCalled();
  }
);

    it(
  "automatically resumes the latest active authenticated clinical interview when no interview id is provided",
  async () => {
    const authenticatedClient =
      {} as never;

      const dateNowSpy =
  vi.spyOn(
    Date,
    "now"
  ).mockReturnValue(
    new Date(
      "2026-08-18T18:00:00.000Z"
    ).getTime()
  );

    const existingReasoningState:
      ClinicalReasoningState = {
      id:
        "reasoning_state_active",

      originalQuestion:
        "What could be causing my abnormal result?",

      currentQuestion:
        "What symptoms are you having?",

      intent:
        "cause-reasoning",

      language:
        "en",

      status:
        "awaiting-clarification",

      askedClarificationQuestionIds: [
        "clarification:missing-current-context",
      ],

      resolvedGapTypes:
        [],

      collectedEvidence:
        [],

      runtimeHistory:
        [],

      currentRuntime:
        {} as ClinicalReasoningState["currentRuntime"],

      createdAt:
        "2026-08-18T12:00:00.000Z",

      updatedAt:
        "2026-08-18T12:05:00.000Z",
    };

    const updatedReasoningState:
      ClinicalReasoningState = {
      ...existingReasoningState,

      currentQuestion:
        "Do you have any relevant medical history?",

      resolvedGapTypes: [
        "missing-current-context",
      ],

      updatedAt:
        "2026-08-18T12:10:00.000Z",
    };

    mockedAuthenticateApiRequest
      .mockResolvedValue({
        success:
          true,

        user: {
          id:
            "user-1",
        },

        client:
          authenticatedClient,
      } as never);

    mockedBuildAuthenticatedAssistantContext
      .mockResolvedValue({
        wholeBodyKnowledge:
          {},
      } as never);

    mockedGetRecentClinicalInterviews
      .mockResolvedValue([
        {
          id:
            "interview-active",

          user_id:
            "user-1",

          status:
            "active",

          reasoning_state:
            existingReasoningState,

          created_at:
            "2026-08-18T12:00:00.000Z",

          updated_at:
            "2026-08-18T12:05:00.000Z",
        },
      ]);

    const orchestratorResult =
      createOrchestratorResult(
        "Do you have any relevant medical history?"
      );

    orchestratorResult
      .clinicalReasoningState =
        updatedReasoningState;

    mockedRunAssistantOrchestrator
      .mockReturnValue(
        orchestratorResult
      );

    mockedUpdateClinicalInterview
      .mockResolvedValue({
        id:
          "interview-active",

        user_id:
          "user-1",

        status:
          "active",

        reasoning_state:
          updatedReasoningState,

        created_at:
          "2026-08-18T12:00:00.000Z",

        updated_at:
          "2026-08-18T12:10:00.000Z",
      });

    const request =
      new Request(
        "http://localhost/api/assistant",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              "Bearer test-token",
          },

          body:
            JSON.stringify({
              message:
                "I still have dizziness.",

              language:
                "en",

              conversation:
                [],
            }),
        }
      );

    const response =
      await POST(
        request
      );

    expect(
      response.status
    ).toBe(
      200
    );

    expect(
      mockedGetRecentClinicalInterviews
    ).toHaveBeenCalledWith(
      "user-1",
      10,
      authenticatedClient
    );

    expect(
      mockedGetClinicalInterview
    ).not.toHaveBeenCalled();

    expect(
      mockedRunAssistantOrchestrator
    ).toHaveBeenCalledWith({
      message:
        "I still have dizziness.",

      language:
        "en",

      healthContext:
        expect.anything(),

      conversation:
        [],

      clinicalReasoningState:
        existingReasoningState,
    });

    expect(
      mockedUpdateClinicalInterview
    ).toHaveBeenCalledWith(
      {
        userId:
          "user-1",

        interviewId:
          "interview-active",

        reasoningState:
          updatedReasoningState,

        status:
          "active",
      },

      authenticatedClient
    );

    expect(
      mockedCreateClinicalInterview
    ).not.toHaveBeenCalled();

    expect(
      mockedBuildAssistantResponseContract
    ).toHaveBeenCalledWith(
      orchestratorResult,
      "interview-active"
    );

    const responseBody =
      await response.json();

    expect(
  responseBody.clinicalInterviewId
     ).toBe(
     "interview-active"
   );

    dateNowSpy.mockRestore();
   }
 );

it(
  "abandons an expired active clinical interview and starts a new interview",
  async () => {
    const authenticatedClient =
      {} as never;

     const dateNowSpy =
  vi.spyOn(
    Date,
    "now"
  ).mockReturnValue(
      new Date(
        "2026-08-20T12:00:00.000Z"
      ).getTime()
    );

    const expiredReasoningState:
      ClinicalReasoningState = {
      id:
        "reasoning_state_expired",

      originalQuestion:
        "What could be causing my abnormal result?",

      currentQuestion:
        "What symptoms are you having?",

      intent:
        "cause-reasoning",

      language:
        "en",

      status:
        "awaiting-clarification",

      askedClarificationQuestionIds: [
        "clarification:missing-current-context",
      ],

      resolvedGapTypes:
        [],

      collectedEvidence:
        [],

      runtimeHistory:
        [],

      currentRuntime:
        {} as ClinicalReasoningState["currentRuntime"],

      createdAt:
        "2026-08-18T10:00:00.000Z",

      updatedAt:
        "2026-08-18T10:00:00.000Z",
    };

    const newReasoningState:
      ClinicalReasoningState = {
      ...expiredReasoningState,

      id:
        "reasoning_state_new",

      originalQuestion:
        "I have dizziness today.",

      currentQuestion:
        "I have dizziness today.",

      askedClarificationQuestionIds:
        [],

      createdAt:
        "2026-08-20T12:00:00.000Z",

      updatedAt:
        "2026-08-20T12:00:00.000Z",
    };

    mockedAuthenticateApiRequest
      .mockResolvedValue({
        success:
          true,

        user: {
          id:
            "user-1",
        },

        client:
          authenticatedClient,
      } as never);

    mockedBuildAuthenticatedAssistantContext
      .mockResolvedValue({
        wholeBodyKnowledge:
          {},
      } as never);

    mockedGetRecentClinicalInterviews
      .mockResolvedValue([
        {
          id:
            "interview-expired",

          user_id:
            "user-1",

          status:
            "active",

          reasoning_state:
            expiredReasoningState,

          created_at:
            "2026-08-18T10:00:00.000Z",

          updated_at:
            "2026-08-18T10:00:00.000Z",
        },
      ]);

    const orchestratorResult =
      createOrchestratorResult(
        "What symptoms are you having today?"
      );

    orchestratorResult
      .clinicalReasoningState =
        newReasoningState;

    mockedRunAssistantOrchestrator
      .mockReturnValue(
        orchestratorResult
      );

    mockedUpdateClinicalInterview
      .mockResolvedValueOnce({
        id:
          "interview-expired",

        user_id:
          "user-1",

        status:
          "abandoned",

        reasoning_state:
          expiredReasoningState,

        created_at:
          "2026-08-18T10:00:00.000Z",

        updated_at:
          "2026-08-20T12:00:00.000Z",
      });

    mockedCreateClinicalInterview
      .mockResolvedValue({
        id:
          "interview-new",

        user_id:
          "user-1",

        status:
          "active",

        reasoning_state:
          newReasoningState,

        created_at:
          "2026-08-20T12:00:00.000Z",

        updated_at:
          "2026-08-20T12:00:00.000Z",
      });

    const request =
      new Request(
        "http://localhost/api/assistant",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              "Bearer test-token",
          },

          body:
            JSON.stringify({
              message:
                "I have dizziness today.",

              language:
                "en",

              conversation:
                [],
            }),
        }
      );

    const response =
      await POST(
        request
      );

    expect(
      response.status
    ).toBe(
      200
    );

    expect(
      mockedUpdateClinicalInterview
    ).toHaveBeenCalledWith(
      {
        userId:
          "user-1",

        interviewId:
          "interview-expired",

        reasoningState:
          expiredReasoningState,

        status:
          "abandoned",
      },

      authenticatedClient
    );

    expect(
      mockedRunAssistantOrchestrator
    ).toHaveBeenCalledWith({
      message:
        "I have dizziness today.",

      language:
        "en",

      healthContext:
        expect.anything(),

      conversation:
        [],
    });

    expect(
      mockedCreateClinicalInterview
    ).toHaveBeenCalledWith(
      {
        userId:
          "user-1",

        reasoningState:
          newReasoningState,

        status:
          "active",
      },

      authenticatedClient
    );

    expect(
      mockedBuildAssistantResponseContract
    ).toHaveBeenCalledWith(
      orchestratorResult,
      "interview-new"
    );

    const responseBody =
      await response.json();

    expect(
  responseBody.clinicalInterviewId
).toBe(
  "interview-new"
);

dateNowSpy.mockRestore();
  }
);

    it(
      "returns 500 when the orchestrator throws an error",
      async () => {
        mockedRunAssistantOrchestrator
          .mockImplementation(
            () => {
              throw new Error(
                "Orchestrator failure"
              );
            }
          );

        const response =
          await POST(
            createAssistantRequest({
              message:
                "Analyze my health context",
            })
          );

        expect(
          response.status
        ).toBe(
          500
        );

        const responseBody =
          (await response.json()) as {
            error?:
              string;

            requestId?:
              string;
          };

        expect(
          responseBody
        ).toMatchObject({
          error:
            "Server error",
        });

        expect(
          responseBody.requestId
        ).toMatch(
          /^req_[0-9a-f-]+$/i
        );

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          responseBody.requestId
        );

        expect(
          consoleErrorSpy
        ).toHaveBeenCalledTimes(
          1
        );

        const loggedValue =
          consoleErrorSpy
            .mock
            .calls[0]?.[0];

        expect(
          typeof loggedValue
        ).toBe(
          "string"
        );

        const parsedLog =
          JSON.parse(
            loggedValue as string
          ) as {
            level?:
              string;

            event?:
              string;

            route?:
              string;

            error?: {
              name?:
                string;

              message?:
                string;
            };
          };

        expect(
          parsedLog
        ).toMatchObject({
          level:
            "error",

          event:
            "assistant.request_failed",

          route:
            "/api/assistant",

          error: {
            name:
              "Error",

            message:
              "Orchestrator failure",
          },
        });
      }
    );
  }
);

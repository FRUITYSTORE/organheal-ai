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

import {
  runAssistantOrchestrator,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import {
  POST,
} from "@/app/api/assistant/route";

const mockedRunAssistantOrchestrator =
  vi.mocked(
    runAssistantOrchestrator
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

        consoleErrorSpy =
          vi.spyOn(
            console,
            "error"
          )
          .mockImplementation(
            () => undefined
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
    error?: string;
    requestId?: string;
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
    error?: string;
    requestId?: string;
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
        ).resolves.toEqual(
          orchestratorResult
        );
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
        ).resolves.toEqual(
          orchestratorResult
        );
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
        ).resolves.toEqual(
          orchestratorResult
        );
      }
    );

    it(
  "ignores client health context and preserves valid conversation for unauthenticated requests",
  async () => {
    const healthContext = {
      overallScore: 78,
      priorityOrgan: "Heart",
      recommendation:
        "Continue routine follow-up.",
    };

    const conversation = [
      {
        role: "user" as const,
        content:
          "What did my latest report show?",
      },
      {
        role: "assistant" as const,
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
      "returns the orchestrator result without changing its contract",
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
        ).resolves.toEqual(
          orchestratorResult
        );
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
    error?: string;
    requestId?: string;
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
).toHaveBeenCalledTimes(1);

const loggedValue =
  consoleErrorSpy.mock.calls[0]?.[0];

expect(
  typeof loggedValue
).toBe("string");

const parsedLog =
  JSON.parse(
    loggedValue as string
  ) as {
    level?: string;
    event?: string;
    route?: string;
    error?: {
      name?: string;
      message?: string;
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
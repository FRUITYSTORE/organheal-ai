import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  openAIAssistantSemanticModelClient,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/openai-assistant-semantic-model.client";

import type {
  AssistantSemanticRoutingInput,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-routing.types";

const ORIGINAL_API_KEY =
  process.env.OPENAI_API_KEY;

const ORIGINAL_SEMANTIC_MODEL =
  process.env.OPENAI_SEMANTIC_MODEL;

function createInput():
  AssistantSemanticRoutingInput {
  return {
    currentMessage:
      "طيب وين بلاقيه؟",

    language:
      "ar",

    conversation: [
      {
        role:
          "assistant",

        content:
          "Your latest report is available in your results.",
      },
    ],

    deterministicDecision: {
      domain:
        "unclear",

      confidence:
        "low",

      source:
        "deterministic",

      productDestination:
        null,

      requiresConversationContext:
        true,

      reason:
        null,
    },
  };
}

describe(
  "OpenAI assistant semantic model client",
  () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY =
        "test-api-key";

      delete process.env
        .OPENAI_SEMANTIC_MODEL;
    });

    afterEach(() => {
      vi.useRealTimers();

      vi.restoreAllMocks();

      if (
        ORIGINAL_API_KEY ===
        undefined
      ) {
        delete process.env
          .OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY =
          ORIGINAL_API_KEY;
      }

      if (
        ORIGINAL_SEMANTIC_MODEL ===
        undefined
      ) {
        delete process.env
          .OPENAI_SEMANTIC_MODEL;
      } else {
        process.env.OPENAI_SEMANTIC_MODEL =
          ORIGINAL_SEMANTIC_MODEL;
      }
    });

    it(
      "sends the semantic request with recent conversation context",
      async () => {
        const fetchMock =
          vi.spyOn(
            globalThis,
            "fetch"
          ).mockResolvedValue(
            new Response(
              JSON.stringify({
                output_text:
                  JSON.stringify({
                    domain:
                      "product_navigation",

                    confidence:
                      "high",

                    productDestination:
                      "view-results",

                    requiresConversationContext:
                      true,

                    reason:
                      "The follow-up refers to the previously discussed results.",
                  }),
              }),
              {
                status:
                  200,

                headers: {
                  "Content-Type":
                    "application/json",
                },
              }
            )
          );

        const result =
          await openAIAssistantSemanticModelClient
            .classify(
              createInput()
            );

        expect(result).toEqual({
          domain:
            "product_navigation",

          confidence:
            "high",

          productDestination:
            "view-results",

          requiresConversationContext:
            true,

          reason:
            "The follow-up refers to the previously discussed results.",
        });

        expect(
          fetchMock
        ).toHaveBeenCalledOnce();

        const [
          url,
          options,
        ] =
          fetchMock.mock.calls[0];

        expect(url).toBe(
          "https://api.openai.com/v1/responses"
        );

        expect(
          options?.method
        ).toBe(
          "POST"
        );

        const headers =
          options?.headers as
            Record<
              string,
              string
            >;

        expect(
          headers.Authorization
        ).toBe(
          "Bearer test-api-key"
        );

        const body =
          JSON.parse(
            String(
              options?.body
            )
          );

        expect(
          body.input
        ).toContain(
          "طيب وين بلاقيه؟"
        );

        expect(
          body.input
        ).toContain(
          "Your latest report is available in your results."
        );

        expect(
  body.instructions
).toContain(
  "You are the semantic conversation interpreter for OrganHeal AI."
);

expect(
  body.instructions
).toContain(
  "If the user asks several things in one message, preserve every meaningful goal instead of selecting only one."
);

expect(
  body.instructions
).toContain(
  "Use the recent conversation to resolve pronouns, omitted subjects, and references"
);
      }
    );

    it(
      "uses the configured semantic model",
      async () => {
        process.env.OPENAI_SEMANTIC_MODEL =
          "test-semantic-model";

        const fetchMock =
          vi.spyOn(
            globalThis,
            "fetch"
          ).mockResolvedValue(
            new Response(
              JSON.stringify({
                output_text:
                  JSON.stringify({
                    domain:
                      "general_health",

                    confidence:
                      "medium",

                    productDestination:
                      null,

                    requiresConversationContext:
                      false,

                    reason:
                      null,
                  }),
              }),
              {
                status:
                  200,
              }
            )
          );

        await openAIAssistantSemanticModelClient
          .classify(
            createInput()
          );

        const options =
          fetchMock.mock
            .calls[0][1];

        const body =
          JSON.parse(
            String(
              options?.body
            )
          );

        expect(
          body.model
        ).toBe(
          "test-semantic-model"
        );
      }
    );

    it(
      "rejects malformed JSON returned by the provider",
      async () => {
        vi.spyOn(
          globalThis,
          "fetch"
        ).mockResolvedValue(
          new Response(
            JSON.stringify({
              output_text:
                "not-json",
            }),
            {
              status:
                200,
            }
          )
        );

        await expect(
          openAIAssistantSemanticModelClient
            .classify(
              createInput()
            )
        ).rejects.toThrow(
          "Semantic model provider returned invalid JSON."
        );
      }
    );

    it(
      "rejects an unsuccessful provider response",
      async () => {
        vi.spyOn(
          globalThis,
          "fetch"
        ).mockResolvedValue(
          new Response(
            "",
            {
              status:
                503,
            }
          )
        );

        await expect(
          openAIAssistantSemanticModelClient
            .classify(
              createInput()
            )
        ).rejects.toThrow(
          "Semantic model provider returned status 503."
        );
      }
    );

    it(
      "rejects an empty provider response",
      async () => {
        vi.spyOn(
          globalThis,
          "fetch"
        ).mockResolvedValue(
          new Response(
            JSON.stringify({
              output: [],
            }),
            {
              status:
                200,
            }
          )
        );

        await expect(
          openAIAssistantSemanticModelClient
            .classify(
              createInput()
            )
        ).rejects.toThrow(
          "Semantic model provider returned an empty response."
        );
      }
    );

    it(
  "aborts the semantic request when the provider exceeds the timeout",
  async () => {
    vi.useFakeTimers();

    const fetchMock =
      vi.spyOn(
        globalThis,
        "fetch"
      )
        .mockImplementation(
          (
            _input,
            init
          ) =>
            new Promise<Response>(
              (
                _resolve,
                reject
              ) => {
                const signal =
                  init?.signal;

                signal?.addEventListener(
                  "abort",
                  () => {
                    const error =
                      new Error(
                        "The operation was aborted."
                      );

                    error.name =
                      "AbortError";

                    reject(
                      error
                    );
                  }
                );
              }
            )
        );

    const classificationPromise =
  openAIAssistantSemanticModelClient
    .classify(
      createInput()
    );

const rejectionExpectation =
  expect(
    classificationPromise
  ).rejects.toMatchObject({
    name:
      "AbortError",
  });

await vi.advanceTimersByTimeAsync(
  5_000
);

await rejectionExpectation;

    expect(
      fetchMock
    ).toHaveBeenCalledOnce();

    const options =
      fetchMock.mock
        .calls[0][1];

    expect(
      options?.signal
    ).toBeInstanceOf(
      AbortSignal
    );

    expect(
      options?.signal?.aborted
    ).toBe(
      true
    );

    vi.useRealTimers();
  }
);

    it(
      "requires the OpenAI API key before making a request",
      async () => {
        delete process.env
          .OPENAI_API_KEY;

        const fetchMock =
          vi.spyOn(
            globalThis,
            "fetch"
          );

        await expect(
          openAIAssistantSemanticModelClient
            .classify(
              createInput()
            )
        ).rejects.toThrow(
          "OPENAI_API_KEY is not configured."
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );
  }
);
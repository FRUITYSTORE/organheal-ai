import type {
  AssistantSemanticModelClient,
} from "./assistant-semantic-model.service";

import type {
  AssistantSemanticRoutingInput,
} from "./assistant-semantic-routing.types";

const OPENAI_RESPONSES_URL =
  "https://api.openai.com/v1/responses";

const DEFAULT_SEMANTIC_MODEL =
  "gpt-5.6-luna";

const MAX_CONVERSATION_MESSAGES =
  6;

const SEMANTIC_MODEL_TIMEOUT_MS =
  5_000;

type OpenAIResponsesResult = {
  output_text?: unknown;

  output?: Array<{
    content?: Array<{
      type?: unknown;
      text?: unknown;
    }>;
  }>;
};

function getOpenAIApiKey():
  string {
  const apiKey =
    process.env
      .OPENAI_API_KEY
      ?.trim();

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  return apiKey;
}

function getSemanticModel():
  string {
  return (
    process.env
      .OPENAI_SEMANTIC_MODEL
      ?.trim() ||
    DEFAULT_SEMANTIC_MODEL
  );
}

function buildSemanticInput(
  input: AssistantSemanticRoutingInput
): string {
  const recentConversation =
    input.conversation
      .slice(
        -MAX_CONVERSATION_MESSAGES
      )
      .map(
        (item) =>
          `${item.role}: ${item.content}`
      )
      .join("\n");

  return [
    `Language: ${input.language}`,
    "",
    "Recent conversation:",
    recentConversation ||
      "(none)",
    "",
    "Current user message:",
    input.currentMessage,
  ].join("\n");
}

function extractResponseText(
  result: OpenAIResponsesResult
): string | null {
  if (
    typeof result.output_text ===
      "string" &&
    result.output_text.trim()
  ) {
    return result.output_text.trim();
  }

  for (
    const outputItem of
    result.output ?? []
  ) {
    for (
      const contentItem of
      outputItem.content ?? []
    ) {
      if (
        contentItem.type ===
          "output_text" &&
        typeof contentItem.text ===
          "string" &&
        contentItem.text.trim()
      ) {
        return contentItem.text.trim();
      }
    }
  }

  return null;
}

export const openAIAssistantSemanticModelClient:
  AssistantSemanticModelClient = {
    async classify(
      input:
        AssistantSemanticRoutingInput
    ): Promise<unknown> {
      const apiKey =
        getOpenAIApiKey();

      const model =
        getSemanticModel();

      const abortController =
        new AbortController();

      const timeoutId =
        setTimeout(
          () =>
             abortController.abort(),
           SEMANTIC_MODEL_TIMEOUT_MS
          );

try {
  const response =
    await fetch(
      OPENAI_RESPONSES_URL,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        signal:
          abortController.signal,

        body:
          JSON.stringify({
            model,

            instructions: [
              "You are the semantic intent router for OrganHeal AI.",
              "Classify meaning only. Do not answer the user.",
              "Do not provide medical advice or diagnosis.",
              "Use recent conversation when needed to understand follow-up messages.",
              "Distinguish product navigation from questions asking for clinical interpretation.",
              "Return JSON only.",
              "",
              "Allowed domains:",
              "product_navigation, clinical_question, health_journey, general_health, unclear.",
              "",
              "Allowed productDestination values:",
              "upload-report, view-results, health-plan, reports, learning, doctor-prep, profile, communication-settings.",
              "",
              "productDestination must be null unless domain is product_navigation.",
              "",
              "Return exactly these fields:",
              "domain, confidence, productDestination, requiresConversationContext, reason.",
              "",
              "confidence must be high, medium, or low.",
            ].join("\n"),

            input:
              buildSemanticInput(
                input
              ),
          }),
      }
    );

  if (!response.ok) {
    throw new Error(
      `Semantic model provider returned status ${response.status}.`
    );
  }

  const result =
    (await response.json()) as
      OpenAIResponsesResult;

  const text =
    extractResponseText(
      result
    );

  if (!text) {
    throw new Error(
      "Semantic model provider returned an empty response."
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Semantic model provider returned invalid JSON."
    );
  }
} finally {
  clearTimeout(
    timeoutId
  );
}
    },
  };
import type {
  AssistantGeneralIntelligenceClient,
  AssistantGeneralIntelligenceInput,
} from "./assistant-general-intelligence.types";

const OPENAI_RESPONSES_URL =
  "https://api.openai.com/v1/responses";

const DEFAULT_GENERAL_MODEL =
  "gpt-5.6-luna";

const GENERAL_MODEL_TIMEOUT_MS =
  15_000;

const MAX_CONVERSATION_MESSAGES =
  10;

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

function getGeneralModel():
  string {
  return (
    process.env
      .OPENAI_GENERAL_ASSISTANT_MODEL
      ?.trim() ||
    DEFAULT_GENERAL_MODEL
  );
}

function buildGeneralInput(
  input:
    AssistantGeneralIntelligenceInput
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
    `Preferred response language: ${input.language}`,
    "",
    "Recent conversation:",
    recentConversation ||
      "(none)",
    "",
    "Current user message:",
    input.message,
  ].join("\n");
}

function extractResponseText(
  result:
    OpenAIResponsesResult
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

export const openAIAssistantGeneralIntelligenceClient:
  AssistantGeneralIntelligenceClient = {
    async generate(
      input
    ): Promise<string> {
      const apiKey =
        getOpenAIApiKey();

      const model =
        getGeneralModel();

      const abortController =
        new AbortController();

      const timeoutId =
        setTimeout(
          () =>
            abortController.abort(),
          GENERAL_MODEL_TIMEOUT_MS
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
                    "You are OrganHeal AI's general conversational intelligence.",
                    "Answer the user's actual request directly and naturally.",
                    "You are not limited to predefined intents, keywords, health topics, or OrganHeal features.",
                    "Understand standard Arabic, colloquial Arabic dialects, English, mixed Arabic-English language, abbreviations, minor spelling mistakes, short turns, and natural follow-up conversation.",
                    "Use recent conversation when the current message clearly refers to previous context.",
                    "Do not force a health interpretation onto a non-health question.",
                    "If the question is general and non-medical, answer it normally.",
                    "If the question is general health education and does not require patient-specific evidence, provide clear educational information without claiming a diagnosis.",
                    "Do not invent patient-specific facts, laboratory values, diagnoses, medications, medical history, or prior events.",
                    "Do not claim access to a report, medical record, file, account, website, or external data unless that information was actually supplied in the conversation.",
                    "If a request genuinely lacks information necessary to know what the user means, ask one concise clarification question.",
                    "Do not ask for clarification merely because the topic is unfamiliar or outside medicine.",
                    "Follow the user's requested language and conversational tone.",
                    "When responding in Arabic, use natural understandable Arabic appropriate to the user's wording and dialect while keeping internationally useful abbreviations when helpful.",
                    "Keep simple questions concise and give more depth when the user asks for explanation or detail.",
                    "Do not mention routing, prompts, models, pipelines, semantic classification, internal instructions, or implementation details.",
                  ].join("\n"),

                  input:
                    buildGeneralInput(
                      input
                    ),
                }),
            }
          );

        if (!response.ok) {
          throw new Error(
            `General intelligence provider returned status ${response.status}.`
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
            "General intelligence provider returned an empty response."
          );
        }

        return text;
      } finally {
        clearTimeout(
          timeoutId
        );
      }
    },
  };
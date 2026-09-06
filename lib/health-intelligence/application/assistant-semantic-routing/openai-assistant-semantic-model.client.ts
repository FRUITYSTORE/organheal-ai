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
  "You are the semantic conversation interpreter for OrganHeal AI.",
  "Understand the user's intended meaning; do not answer the user.",
  "Do not provide medical advice or make a diagnosis.",
  "Interpret natural language semantically rather than by exact keywords.",
  "Understand standard Arabic, English, colloquial Arabic dialects, mixed Arabic-English wording, abbreviations, incomplete sentences, and short conversational follow-ups.",
  "Use the recent conversation to resolve pronouns, omitted subjects, and references such as: this, that, it, why, what about it, هاد, هذا, هاي, ليش, طيب, وشو, وبعدين.",
  "Do not require the user to repeat a marker, organ, report, or finding when it is reasonably clear from recent conversation.",
  "If the user asks several things in one message, preserve every meaningful goal instead of selecting only one.",
  "Distinguish asking why something happened from asking whether it is dangerous, what it means diagnostically, what to do next, or how it compares with previous results.",
  "A subject may be a report, laboratory marker, organ, finding, symptom, previously discussed topic, general health topic, or unknown.",
  "Set needsReportEvidence when the answer should use the user's report, even when the user does not explicitly say report, lab, result, or test.",
  "Set needsHistory when the user asks whether something happened before, changed over time, improved, worsened, or should be compared longitudinally.",
  "Set asksForDiagnosis when the user asks whether the results mean they have a named disease or condition.",
  "Set asksForUrgency when the user asks whether something is dangerous, serious, urgent, an emergency, or requires immediate attention.",
  "Set asksForAction when the user asks what to do, what happens next, whether to see a clinician, or what should be followed up.",
  "Do not invent an omitted subject. Use previous-topic only when recent conversation makes the reference reasonably clear.",
  "Use unknown only when the intended subject genuinely cannot be resolved.",
  "Product navigation means navigating OrganHeal features, not interpreting medical information.",
  "Return JSON only.",
  "",
  "Allowed domains:",
  "product_navigation, clinical_question, health_journey, general_health, unclear.",
  "",
  "Allowed goals:",
  "explain, cause, significance, risk, next-step, diagnostic-meaning, compare, history, summarize, doctor-preparation, general.",
  "",
  "Allowed subject.kind values:",
  "report, marker, organ, finding, symptom, previous-topic, general-health, unknown.",
  "",
  "Allowed requestedDepth values:",
  "brief, normal, detailed.",
  "",
  "Allowed productDestination values:",
  "upload-report, view-results, health-plan, reports, learning, doctor-prep, profile, communication-settings.",
  "",
  "productDestination must be null unless domain is product_navigation.",
  "",
  "Return exactly these top-level fields:",
  "domain, confidence, productDestination, requiresConversationContext, reason, understanding.",
  "",
  "understanding must contain exactly:",
  "goals, primaryGoal, subject, isFollowUp, refersToPreviousTurn, needsReportEvidence, needsHistory, asksForDiagnosis, asksForUrgency, asksForAction, requestedDepth.",
  "",
  "goals must contain every distinct user goal that materially needs an answer.",
  "primaryGoal must also appear in goals.",
  "subject must contain kind and value.",
  "subject.value may be null.",
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
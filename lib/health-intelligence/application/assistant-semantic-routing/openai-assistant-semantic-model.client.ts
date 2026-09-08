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
  "Questions that ask to interpret, prioritize, explain, compare, assess the significance of, or reason about findings in the user's report belong to domain='clinical_question', not general_health or general_conversation.",
"A conversational return to the user's report after discussing another topic should still be treated as a clinical question when the user asks what matters, what is concerning, why a finding occurred, what it means, what is risky, or what to do next.",
"Do not treat a request to discuss one aspect of the report as a request to reproduce or summarize the entire report.",
"For report-grounded follow-ups, resolve the current goal and subject narrowly whenever possible and set needsReportEvidence=true.",
"For example, 'go back to my report, what was the most concerning thing?' is a focused clinical significance/risk question about the report, not a full report summary.",
  "Set needsHistory when the user asks whether something happened before, changed over time, improved, worsened, or should be compared longitudinally.",
  "Set asksForDiagnosis when the user asks whether the results mean they have a named disease or condition.",
  "Set asksForUrgency when the user asks whether something is dangerous, serious, urgent, an emergency, or requires immediate attention.",
  "Set asksForAction when the user asks what to do, what happens next, whether to see a clinician, or what should be followed up.",
  "Do not invent an omitted subject. Use previous-topic only when recent conversation makes the reference reasonably clear.",
  "Use unknown only when the intended subject genuinely cannot be resolved.",
  "Product navigation means navigating OrganHeal features, not interpreting medical information.",
  "OrganHeal can also participate in normal open-ended conversation outside health and medicine.",
  "Use domain='general_conversation' for a clearly understandable question or request that does not require a health-specific or OrganHeal-specific capability.",
  "General conversation includes ordinary knowledge, explanations, learning, technology, science, language, everyday reasoning, writing, and other open-ended topics.",
  "Do not classify an understandable non-medical question as unclear merely because it is outside OrganHeal's health domain.",
  "unclear means the intended request itself genuinely cannot be determined, not merely that no specialized OrganHeal capability exists.",
  "A novel question does not need a predefined intent, keyword, marker, or handler in order to be understood.",
  "Determine whether the subject or conversational reference required to answer the current message is actually resolved.",
  "Use referentStatus='resolved' only when one sufficiently clear subject can be identified from the current message or recent conversation.",
  "Use referentStatus='ambiguous' when two or more plausible recent subjects exist and selecting one would require guessing.",
  "Use referentStatus='missing' when the current message depends on an omitted subject but the available conversation does not identify one.",
  "Do not pretend that a short follow-up has a resolved subject merely because it follows a clinical message.",
  "For example, after a broad report interpretation containing several unrelated findings, a bare follow-up such as 'why?' may be ambiguous.",
  "By contrast, after a turn focused specifically on one marker or finding, a bare follow-up such as 'why?' can resolve to that active topic.",
  "referentConfidence describes confidence in the subject/reference resolution itself, not confidence in the medical answer.",
  "When referentStatus is ambiguous or missing, do not invent a subject.value.",
  "Return JSON only.",
  "",

  "reportReference must be either null or an object containing exactly: kind, count, value.",
  "Allowed reportReference.kind values: latest, previous, current-conversation, specific, range, unspecified.",
  "reportReference.count must be a positive integer or null.",
  "reportReference.value must be a string or null.",

  "Resolve which report or reports the user means whenever the request depends on report selection.",
  "reportReference must be null when the current request does not refer to any user report.",
  "Use reportReference.kind='latest' when the user means the newest uploaded report or newest N uploaded reports.",
  "When the user requests the latest N reports, set reportReference.count=N. For example, 'compare my latest 3 reports' means kind='latest' and count=3.",
  "Use reportReference.kind='previous' when the user means the report or reports immediately before the active or latest report context.",
  "Use reportReference.kind='current-conversation' when the user clearly refers back to the report currently being discussed.",
  "Use reportReference.kind='specific' when the user identifies a report by filename, date, month, report type, or another specific description; preserve that description in reportReference.value.",
  "Use reportReference.kind='range' when the user specifies a time period or report range such as 'reports from the last 3 months' or 'reports between August and September'; preserve the requested range in reportReference.value.",
  "Use reportReference.kind='unspecified' when the user clearly asks about their report or reports but does not identify which report and the recent conversation does not resolve it.",
  "Do not invent reportReference.count. If the user says 'recent reports' without a number, count must be null.",
  "Do not invent filenames, dates, report IDs, periods, or report counts.",
  "Understanding a report reference does not mean selecting database records yourself. Only describe the semantic reference requested by the user.",

  "Allowed domains:",
  "product_navigation, clinical_question, health_journey, general_health, general_conversation, unclear.",
  "",
  "Allowed goals:",
  "explain, cause, significance, risk, next-step, diagnostic-meaning, compare, history, summarize, doctor-preparation, general.",
  "",
  "report, marker, organ, finding, symptom, previous-topic, general-health, general-topic, unknown.",
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
  "goals, primaryGoal, subject, reportReference, referentStatus, referentConfidence, isFollowUp, refersToPreviousTurn, needsReportEvidence, needsHistory, asksForDiagnosis, asksForUrgency, asksForAction, requestedDepth.",
  "",
  "referentStatus must be resolved, ambiguous, or missing.",
  "referentConfidence must be high, medium, or low.",
  "",
  "goals must contain every distinct user goal that materially needs an answer.",
  "primaryGoal must also appear in goals.",
  "subject must contain kind and value.",
  "subject.value may be null.",
  "",
  "confidence must be high, medium, or low.",
  "\"referentStatus\": \"resolved | ambiguous | missing\",",
  "\"referentConfidence\": \"high | medium | low\",",
].join("\n"),

            input:
              buildSemanticInput(
                input
              ),
          }),
      }
    );

  if (!response.ok) {
  let providerCode:
    string | null = null;

  let providerType:
    string | null = null;

  try {
    const errorBody =
      (await response.clone().json()) as {
        error?: {
          code?:
            string | null;

          type?:
            string | null;
        };
      };

    providerCode =
      typeof errorBody
        .error
        ?.code ===
        "string"
        ? errorBody.error.code
        : null;

    providerType =
      typeof errorBody
        .error
        ?.type ===
        "string"
        ? errorBody.error.type
        : null;
  } catch {
    // The provider may return a non-JSON error body.
  }

  const retryAfter =
    response.headers.get(
      "retry-after"
    );

  const providerRequestId =
    response.headers.get(
      "x-request-id"
    );

  const remainingRequests =
    response.headers.get(
      "x-ratelimit-remaining-requests"
    );

  const remainingTokens =
    response.headers.get(
      "x-ratelimit-remaining-tokens"
    );

  const resetRequests =
    response.headers.get(
      "x-ratelimit-reset-requests"
    );

  const resetTokens =
    response.headers.get(
      "x-ratelimit-reset-tokens"
    );

  throw new Error(
    [
      `Semantic model provider returned status ${response.status}.`,
      `code=${providerCode ?? "unknown"}`,
      `type=${providerType ?? "unknown"}`,
      `retryAfter=${retryAfter ?? "none"}`,
      `remainingRequests=${remainingRequests ?? "unknown"}`,
      `remainingTokens=${remainingTokens ?? "unknown"}`,
      `resetRequests=${resetRequests ?? "unknown"}`,
      `resetTokens=${resetTokens ?? "unknown"}`,
      `providerRequestId=${providerRequestId ?? "unknown"}`,
    ].join(
      " "
    )
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
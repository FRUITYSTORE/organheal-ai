import type {
  AssistantClinicalExplanationClient,
  AssistantClinicalExplanationInput,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.types";

import {
  logApiInfo,
} from "@/lib/api/api-logger";

const OPENAI_RESPONSES_URL =
  "https://api.openai.com/v1/responses";

const DEFAULT_CLINICAL_EXPLANATION_MODEL =
  "gpt-5.6-sol";

const DEFAULT_FOCUSED_CLINICAL_EXPLANATION_MODEL =
  "gpt-5.6-terra";

const CLINICAL_EXPLANATION_TIMEOUT_MS =
  60_000;

type ReasoningEffort =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

type OpenAIResponsesResult = {
  output_text?:
    unknown;

  output?: Array<{
    content?: Array<{
      type?:
        unknown;

      text?:
        unknown;
    }>;
  }>;

  usage?: {
    input_tokens?:
      unknown;

    input_tokens_details?: {
      cached_tokens?:
        unknown;
    };

    output_tokens?:
      unknown;

    output_tokens_details?: {
      reasoning_tokens?:
        unknown;
    };

    total_tokens?:
      unknown;
  };
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

function getClinicalExplanationModel(
  input:
    AssistantClinicalExplanationInput
): string {
  const mode =
    input.mode ??
    "full";

  const isFocusedMode =
    mode ===
      "cause-reasoning" ||
    mode ===
      "next-step";

  if (
    isFocusedMode
  ) {
    return (
      process.env
        .OPENAI_CLINICAL_EXPLANATION_FOCUSED_MODEL
        ?.trim() ||
      DEFAULT_FOCUSED_CLINICAL_EXPLANATION_MODEL
    );
  }

  return (
    process.env
      .OPENAI_CLINICAL_EXPLANATION_MODEL
      ?.trim() ||
    DEFAULT_CLINICAL_EXPLANATION_MODEL
  );
}

function getReasoningEffort():
  ReasoningEffort {
  const configuredEffort =
    process.env
      .OPENAI_CLINICAL_EXPLANATION_REASONING_EFFORT
      ?.trim()
      .toLowerCase();

if (
  configuredEffort === "none" ||
  configuredEffort === "low" ||
  configuredEffort === "medium" ||
  configuredEffort === "high" ||
  configuredEffort === "xhigh" ||
  configuredEffort === "max"
) {
    return configuredEffort;
  }

  return "high";
}

function readTokenCount(
  value:
    unknown
): number | null {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
    ? value
    : null;
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

function buildClinicalExplanationInput(
  input:
    AssistantClinicalExplanationInput
): string {
  const reportId =
    String(
      input.report.reportId
    );

  const reportMarkerNodes =
    input.knowledge.nodes.filter(
      (node) =>
        node.type ===
          "laboratory-marker" &&
        node.evidence.some(
          (evidence) =>
            evidence.sourceType ===
              "laboratory-result" &&
            evidence.sourceId ===
              reportId
        )
    );

  const markerNodeIds =
    new Set(
      reportMarkerNodes.map(
        (node) =>
          node.id
      )
    );

 const useFocusedRelationshipSet =
  input.mode ===
    "cause-reasoning" ||
  input.mode ===
    "next-step";

const reportRelationships =
  input.knowledge.relationships.filter(
    (relationship) => {
      const sourceIsReportMarker =
        markerNodeIds.has(
          relationship.sourceNodeId
        );

      const targetIsReportMarker =
        markerNodeIds.has(
          relationship.targetNodeId
        );

      if (
        useFocusedRelationshipSet
      ) {
        return (
          sourceIsReportMarker &&
          targetIsReportMarker
        );
      }

      return (
        sourceIsReportMarker ||
        targetIsReportMarker
      );
    }
  );

  const reportPayload = {
    reportId:
      input.report.reportId,

    reportType:
      input.report.reportType,

    uploadedAt:
      input.report.uploadedAt,

    storedSummary:
      input.report.summary,

    storedKeyFindings:
      input.report.keyFindings,

    storedRecommendations:
      input.report.recommendations,

    storedNextBestAction:
      input.report.nextBestAction,

    storedRiskLevel:
      input.report.riskLevel,

    structuredEvidence:
      input.report.reportEvidence,
  };

  const markerNodesPayload =
    reportMarkerNodes.map(
      (node) => ({
        id:
          node.id,

        label:
          node.label,

        description:
          node.description,

        domains:
          node.domains,

        priority:
          node.priority,

        confidence:
          node.confidence,

        evidence:
          node.evidence,
      })
    );

  const clinicalKnowledgePayload = {
    markerNodes:
      markerNodesPayload,

    relationships:
      reportRelationships,
  };

  const clinicalPayload = {
    language:
      input.language,

    responseMode:
      input.mode ??
      "full",

    userQuestion:
      input.question,

    report:
      reportPayload,

    clinicalKnowledge:
      clinicalKnowledgePayload,

    deterministicClinicalNarrative:
      input.deterministicClinicalNarrative,
  };

  const serializedPayload =
    JSON.stringify(
      clinicalPayload
    );

  logApiInfo(
    "assistant.clinical_explanation.input_size",
    {
      mode:
        input.mode ??
        "full",

      clinicalPayloadChars:
        serializedPayload.length,

      reportSectionChars:
        JSON.stringify(
          reportPayload
        ).length,

      structuredEvidenceChars:
        JSON.stringify(
          input.report.reportEvidence
        ).length,

      markerNodesChars:
        JSON.stringify(
          markerNodesPayload
        ).length,

      relationshipsChars:
        JSON.stringify(
          reportRelationships
        ).length,

      narrativeChars:
        JSON.stringify(
          input.deterministicClinicalNarrative ??
            null
        ).length,

      reportMarkerCount:
        input.report.reportEvidence.length,

      knowledgeNodeCount:
        markerNodesPayload.length,

      relationshipCount:
        reportRelationships.length,
    }
  );

  return serializedPayload;
}

function buildAllowedMarkerNames(
  input:
    AssistantClinicalExplanationInput
): string[] {
  return Array.from(
    new Set(
      input.report.reportEvidence
        .map(
          (item) =>
            item.marker.trim()
        )
        .filter(Boolean)
    )
  );
}

function buildClinicalExplanationSchema(
  input:
    AssistantClinicalExplanationInput
) {
  const allowedMarkerNames =
    buildAllowedMarkerNames(
      input
    );

  const mode =
    input.mode ??
    "full";

  const isFull =
    mode ===
    "full";

  const isNextStep =
    mode ===
    "next-step";

  const isCauseReasoning =
    mode ===
    "cause-reasoning";

  const schema = {
  type:
    "object",

  additionalProperties:
    false,

  properties: {
    overview: {
      type:
        "string",
    },

    priorityFindings: {
      type:
        "array",

      maxItems:
       isFull
        ? 5
        : 0,

      items: {
        type:
          "object",

        additionalProperties:
          false,

        properties: {
          title: {
            type:
              "string",
          },

          explanation: {
            type:
              "string",
          },

          evidenceMarkers: {
            type:
              "array",

            maxItems:
              8,

            items: {
            type:
             "string",

            enum:
             allowedMarkerNames,
       },
          },

          importance: {
            type:
              "string",

            enum: [
              "monitor",
              "important",
              "prompt",
            ],
          },

          confidence: {
            type:
              "string",

            enum: [
              "low",
              "moderate",
              "high",
            ],
          },
        },

        required: [
          "title",
          "explanation",
          "evidenceMarkers",
          "importance",
          "confidence",
        ],
      },
    },

    relationships: {
      type:
        "array",

      maxItems:
       isFull
         ? 5
    : isCauseReasoning
         ? 4
         : 0,

      items: {
        type:
          "object",

        additionalProperties:
          false,

        properties: {
          markers: {
            type:
              "array",

            minItems:
              2,

            maxItems:
              8,

            items: {
            type:
             "string",

            enum:
             allowedMarkerNames,
           },
          },

          explanation: {
            type:
              "string",
          },

          confidence: {
            type:
              "string",

            enum: [
              "low",
              "moderate",
              "high",
            ],
          },
        },

        required: [
          "markers",
          "explanation",
          "confidence",
        ],
      },
    },

    possibleContributors: {
      type:
        "array",

      maxItems:
        isFull
          ? 6
        : isCauseReasoning
          ? 4
          : 0,

      items: {
        type:
          "object",

        additionalProperties:
          false,

        properties: {
          factor: {
            type:
              "string",
          },

          whyPossible: {
            type:
              "string",
          },

          confirmationNeeded: {
            type:
              "string",
          },
        },

        required: [
          "factor",
          "whyPossible",
          "confirmationNeeded",
        ],
      },
    },

    reassuringFindings: {
      type:
        "array",

      maxItems:
        isFull
          ? 8
          : 0,

      items: {
      type:
        "string",
      },
    },

    missingContext: {
      type:
        "array",

      maxItems:
        isFull
          ? 8
      : isCauseReasoning
         ? 6
         : 0,

      items: {
        type:
          "string",
      },
    },

    nextSteps: {
      type:
        "array",

      maxItems:
        isFull || isNextStep
          ? 6
          : 0,

      items: {
        type:
          "string",
      },
    },

    questionsForClinician: {
      type:
        "array",

      maxItems:
        isFull
          ? 6
    : isNextStep
          ? 4
          : 0,

      items: {
        type:
          "string",
      },
    },

    urgency: {
      type:
        "string",

      enum: [
        "routine",
        "timely",
        "urgent",
        "emergency",
      ],
    },

    limitations: {
      type:
        "array",

      minItems:
        1,

      maxItems:
        6,

      items: {
        type:
          "string",
      },
    },
  },

  required: [
    "overview",
    "priorityFindings",
    "relationships",
    "possibleContributors",
    "reassuringFindings",
    "missingContext",
    "nextSteps",
    "questionsForClinician",
    "urgency",
    "limitations",
  ],
    } as const;

  if (
    isNextStep
  ) {
    return {
      type:
        "object",

      additionalProperties:
        false,

      properties: {
        overview:
          schema.properties.overview,

        nextSteps:
          schema.properties.nextSteps,

        questionsForClinician:
          schema.properties.questionsForClinician,

        urgency:
          schema.properties.urgency,

        limitations:
          schema.properties.limitations,
      },

      required: [
        "overview",
        "nextSteps",
        "questionsForClinician",
        "urgency",
        "limitations",
      ],
    } as const;
  }

  if (
    isCauseReasoning
  ) {
    return {
      type:
        "object",

      additionalProperties:
        false,

      properties: {
        overview:
          schema.properties.overview,

        relationships:
          schema.properties.relationships,

        possibleContributors:
          schema.properties.possibleContributors,

        missingContext:
          schema.properties.missingContext,

        urgency:
          schema.properties.urgency,

        limitations:
          schema.properties.limitations,
      },

      required: [
        "overview",
        "relationships",
        "possibleContributors",
        "missingContext",
        "urgency",
        "limitations",
      ],
    } as const;
  }

  return schema;
}

function buildModeInstructions(
  input:
    AssistantClinicalExplanationInput
): string {
  const mode =
    input.mode ??
    "full";

  if (
    mode ===
    "next-step"
  ) {
    return [
      "The user is asking for a focused next-step answer, not a full report interpretation.",
      "Keep overview to one short sentence.",
      "Populate nextSteps with a concise, prioritized action plan grounded in the supplied report evidence.",
      "Populate questionsForClinician only when they materially help the user act.",
      "Keep limitations concise.",
      "Return only the fields required by the supplied response schema.",
      "Do not repeat the full report interpretation.",
    ].join(
      "\n"
    );
  }

  if (
    mode ===
    "cause-reasoning"
  ) {
    return [
      "The user is asking a focused why/cause/relationship question, not for a full report interpretation.",
      "Answer the user's exact question directly in overview.",
      "Use relationships only for markers materially relevant to the question.",
      "Use possibleContributors only for plausible contributors that require confirmation.",
      "Use missingContext only for information that would materially change the answer.",
      "Return only the fields required by the supplied response schema.",
      "Do not repeat unrelated findings from the report.",
      "Do not turn an association into a confirmed diagnosis or causal claim.",
    ].join(
      "\n"
    );
  }

  return [
  "The user is asking for a full report interpretation.",
  "Review all supplied structured report evidence before composing the answer.",
  "Do not omit a clinically meaningful abnormal or borderline finding merely to keep the answer short.",
  "Group related findings into clinically coherent patterns instead of repeating isolated laboratory values.",
  "Cover the major clinically relevant domains represented in the evidence, including metabolic, lipid, hematologic or iron-related, liver, kidney or urine, inflammatory, nutritional, and electrolyte findings when present.",
  "When repeated measurements of the same marker are present, interpret them as a sequence or repeat result rather than as unrelated conflicting values.",
  "Mention reassuring normal findings when they materially change the interpretation of an abnormal finding.",
  "Distinguish clearly between confirmed report facts, plausible relationships, and conclusions that cannot be made from the report alone.",
  "Do not infer fasting status, chronic disease, diagnosis, causation, persistence, or treatment need unless the supplied evidence supports it.",
  "If a single abnormal result requires persistence or repeat confirmation before a chronic condition can be inferred, state that explicitly.",
  "If multiple findings together support a pattern, explain the pattern while avoiding a definitive diagnosis unless the evidence establishes one.",
  "Keep the answer organized and prioritized, but completeness takes precedence over brevity in full-report mode.",
  "Return only the fields required by the supplied response schema.",
].join(
  "\n"
);
}

function normalizeClinicalExplanationOutput(
  input:
    AssistantClinicalExplanationInput,
  parsed:
    unknown
): unknown {
  if (
    !parsed ||
    typeof parsed !==
      "object" ||
    Array.isArray(
      parsed
    )
  ) {
    return parsed;
  }

  const value =
    parsed as
      Record<
        string,
        unknown
      >;

  const mode =
    input.mode ??
    "full";

  if (
    mode ===
      "next-step"
  ) {
    return {
      overview:
        value.overview,

      priorityFindings:
        [],

      relationships:
        [],

      possibleContributors:
        [],

      reassuringFindings:
        [],

      missingContext:
        [],

      nextSteps:
        value.nextSteps,

      questionsForClinician:
        value.questionsForClinician,

      urgency:
        value.urgency,

      limitations:
        value.limitations,
    };
  }

  if (
    mode ===
      "cause-reasoning"
  ) {
    return {
      overview:
        value.overview,

      priorityFindings:
        [],

      relationships:
        value.relationships,

      possibleContributors:
        value.possibleContributors,

      reassuringFindings:
        [],

      missingContext:
        value.missingContext,

      nextSteps:
        [],

      questionsForClinician:
        [],

      urgency:
        value.urgency,

      limitations:
        value.limitations,
    };
  }

  return parsed;
}

export const openAIAssistantClinicalExplanationClient:
  AssistantClinicalExplanationClient = {
    async generate(
      input:
        AssistantClinicalExplanationInput
    ): Promise<unknown> {
      const apiKey =
        getOpenAIApiKey();

      const model =
  getClinicalExplanationModel(
    input
  );

      const reasoningEffort =
        getReasoningEffort();

      const abortController =
        new AbortController();

      const timeoutId =
        setTimeout(
          () =>
            abortController.abort(),
          CLINICAL_EXPLANATION_TIMEOUT_MS
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

                  store:
                    false,

                  reasoning: {
                    effort:
                      reasoningEffort,
                  },

                  instructions: [
                    "You are OrganHeal AI's evidence-grounded clinical explanation model.",
                    "Explain health information clearly and intelligently without diagnosing or prescribing.",
                    "Use only the supplied report evidence for numeric claims.",
                    "For evidenceMarkers and relationship markers, copy marker names exactly from report.structuredEvidence[].marker.",
                    "Never translate, rename, expand, abbreviate, normalize, combine, or invent marker names inside evidenceMarkers or markers.",
                    "Never invent laboratory values, reference ranges, symptoms, diagnoses, medications, age, sex, fasting status, or medical history.",
                    "Treat report-provided reference ranges as stronger evidence than default reference ranges.",
                    "Prioritize clinically meaningful patterns instead of repeating every laboratory value.",
                    "Connect related markers when the supplied evidence supports a relationship.",
                    "Separate confirmed report facts from possible contributors.",
                    "Possible contributors must be presented as possibilities that require confirmation, never as established causes.",
                    "Identify reassuring normal findings when they materially help interpretation.",
                    "State which missing context could change the interpretation.",
                    "Give practical next steps and useful questions for a licensed clinician.",
                    "Do not produce an overall health score.",
                    "Do not use fear, commercial recommendations, or product promotion.",
                    "Do not expose hidden reasoning or chain-of-thought.",
                    "Respond entirely in the requested language.",
                    "Return only the required structured output.",
                    buildModeInstructions(
                      input
                    ),
                  ].join(
                    "\n"
                  ),

                  input:
                    buildClinicalExplanationInput(
                      input
                    ),

                  text: {
                    format: {
                      type:
                        "json_schema",

                      name:
                        "organheal_clinical_explanation",

                      strict:
                        true,

                      schema:
                       buildClinicalExplanationSchema(
                        input
                       ),
                    },
                  },
                }),
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            `Clinical explanation provider returned status ${response.status}.`
          );
        }

        const result =
          (await response.json()) as
            OpenAIResponsesResult;

            logApiInfo(
  "assistant.clinical_explanation.provider_usage",
  {
    model,

    mode:
      input.mode ??
      "full",

    reasoningEffort,

    inputUnits:
      readTokenCount(
        result.usage
          ?.input_tokens
      ),

    cachedInputUnits:
      readTokenCount(
        result.usage
          ?.input_tokens_details
          ?.cached_tokens
      ),

    outputUnits:
      readTokenCount(
        result.usage
          ?.output_tokens
      ),

    reasoningUnits:
      readTokenCount(
        result.usage
          ?.output_tokens_details
          ?.reasoning_tokens
      ),

    totalUnits:
      readTokenCount(
        result.usage
          ?.total_tokens
      ),
  }
);
        const text =
          extractResponseText(
            result
          );

        if (!text) {
          throw new Error(
            "Clinical explanation provider returned an empty response."
          );
        }

        try {
  const parsed =
    JSON.parse(
      text
    );

  return normalizeClinicalExplanationOutput(
    input,
    parsed
  );
} catch {
          throw new Error(
            "Clinical explanation provider returned invalid JSON."
          );
        }
      } finally {
        clearTimeout(
          timeoutId
        );
      }
    },
  };
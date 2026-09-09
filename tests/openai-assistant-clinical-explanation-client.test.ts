import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  openAIAssistantClinicalExplanationClient,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/openai-assistant-clinical-explanation.client";

import type {
  AssistantClinicalExplanationInput,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.types";

const generatedExplanation = {
  overview:
    "Glucose and lipid abnormalities may occur together, but this pattern alone does not establish a diagnosis.",

  priorityFindings:
    [],

  relationships: [
    {
      markers: [
        "HbA1c",
        "Triglycerides",
      ],

      explanation:
        "These abnormalities can occur together in metabolic patterns that require clinical context.",

      confidence:
        "moderate",
    },
  ],

  possibleContributors: [
    {
      factor:
        "Reduced insulin sensitivity",

      whyPossible:
        "It may contribute to both altered glucose regulation and triglyceride elevation.",

      confirmationNeeded:
        "Clinical history and additional assessment are needed.",
    },
  ],

  reassuringFindings:
    [],

  missingContext: [
    "Fasting status",
  ],

  nextSteps:
    [],

  questionsForClinician:
    [],

  urgency:
    "routine",

  limitations: [
    "The report alone cannot establish a diagnosis.",
  ],
};

function createInput():
  AssistantClinicalExplanationInput {
  return {
    question:
      "Why are glucose and lipids related, and does this mean I have a disease?",

    language:
      "en",

    mode:
      "cause-reasoning",

    report: {
      reportId:
        105,

      reportType:
        "Laboratory",

      uploadedAt:
        "2026-09-01T10:00:00.000Z",

      summary:
        "Stored report summary.",

      keyFindings:
        "Stored key findings.",

      recommendations:
        "Stored recommendations.",

      doctorBrief:
        "Stored doctor brief.",

      nextBestAction:
        "Stored next best action.",

      riskLevel:
        "moderate",

      reportEvidence: [
        {
          marker:
            "Glucose",

          value:
            128,

          unit:
            "mg/dL",

          status:
            "High",

          referenceLow:
            70,

          referenceHigh:
            99,

          referenceSource:
            "report",
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
            "report",
        },

        {
          marker:
            "Triglycerides",

          value:
            240,

          unit:
            "mg/dL",

          status:
            "High",

          referenceLow:
            0,

          referenceHigh:
            150,

          referenceSource:
            "report",
        },

        {
          marker:
            "HDL",

          value:
            36,

          unit:
            "mg/dL",

          status:
            "Low",

          referenceLow:
            40,

          referenceHigh:
            null,

          referenceSource:
            "report",
        },

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
            "report",
        },
      ],
    },

    knowledge: {
      nodes: [
        {
          id:
            "marker:105:glucose",

          type:
            "laboratory-marker",

          label:
            "Glucose",

          description:
            "Blood glucose marker used to assess current glucose concentration.",

          domains: [
            "metabolic",
          ],

          priority:
            "high",

          confidence:
            "high",

          evidence: [
            {
              id:
                "evidence:105:glucose",

              sourceType:
                "laboratory-result",

              sourceId:
                "105",

              label:
                "Glucose",

              value:
                128,

              unit:
                "mg/dL",

              observedAt:
                "2026-09-01T10:00:00.000Z",

              certainty:
                "observed",

              confidence:
                "high",

              relevance:
                "direct",
            },
          ],
        },

        {
          id:
            "marker:105:hba1c",

          type:
            "laboratory-marker",

          label:
            "HbA1c",

          description:
            "Marker reflecting longer-term glucose exposure.",

          domains: [
            "metabolic",
          ],

          priority:
            "high",

          confidence:
            "high",

          evidence: [
            {
              id:
                "evidence:105:hba1c",

              sourceType:
                "laboratory-result",

              sourceId:
                "105",

              label:
                "HbA1c",

              value:
                6.6,

              unit:
                "%",

              observedAt:
                "2026-09-01T10:00:00.000Z",

              certainty:
                "observed",

              confidence:
                "high",

              relevance:
                "direct",
            },
          ],
        },

        {
          id:
            "marker:105:triglycerides",

          type:
            "laboratory-marker",

          label:
            "Triglycerides",

          description:
            "Circulating triglyceride marker relevant to lipid metabolism.",

          domains: [
            "metabolic",
            "cardiovascular",
          ],

          priority:
            "high",

          confidence:
            "high",

          evidence: [
            {
              id:
                "evidence:105:triglycerides",

              sourceType:
                "laboratory-result",

              sourceId:
                "105",

              label:
                "Triglycerides",

              value:
                240,

              unit:
                "mg/dL",

              observedAt:
                "2026-09-01T10:00:00.000Z",

              certainty:
                "observed",

              confidence:
                "high",

              relevance:
                "direct",
            },
          ],
        },
      ],

      relationships: [
        {
          id:
            "relationship:glucose-triglycerides",

          sourceNodeId:
            "marker:105:glucose",

          targetNodeId:
            "marker:105:triglycerides",

          type:
            "associated",

          explanation:
            "Glucose dysregulation and elevated triglycerides may occur together in metabolic patterns.",

          confidence:
            "moderate",

          evidence: [],
        },

        {
          id:
            "relationship:hba1c-triglycerides",

          sourceNodeId:
            "marker:105:hba1c",

          targetNodeId:
            "marker:105:triglycerides",

          type:
            "associated",

          explanation:
            "Longer-term glucose dysregulation may coexist with altered triglyceride metabolism.",

          confidence:
            "moderate",

          evidence: [],
        },
      ],

      clarificationQuestions:
        [],

      coveredDomains: [
        "metabolic",
        "cardiovascular",
      ],

      unresolvedDomains:
        [],

      evidenceSufficiency:
        null,

      generatedAt:
        "2026-09-01T10:00:00.000Z",
    },

    deterministicClinicalNarrative:
      "The deterministic clinical layer identified a glucose and lipid pattern requiring contextual interpretation.",
  } as unknown as AssistantClinicalExplanationInput;
}

describe(
  "openAIAssistantClinicalExplanationClient",
  () => {
    afterEach(
      () => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
      }
    );

    it(
      "sends the expected cause-reasoning payload and exposes a measurable input baseline",
      async () => {
        vi.stubEnv(
          "OPENAI_API_KEY",
          "test-api-key"
        );

        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_MODEL",
          "gpt-5.6-sol"
        );

        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_REASONING_EFFORT",
          "medium"
        );

        const fetchMock =
          vi.spyOn(
            globalThis,
            "fetch"
          )
            .mockResolvedValue(
              new Response(
                JSON.stringify({
                  output_text:
                    JSON.stringify(
                      generatedExplanation
                    ),
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

        await openAIAssistantClinicalExplanationClient.generate(
          createInput()
        );

        expect(
          fetchMock
        ).toHaveBeenCalledOnce();

        const [
          url,
          requestInit,
        ] =
          fetchMock.mock.calls[0];

        expect(
          url
        ).toBe(
          "https://api.openai.com/v1/responses"
        );

        const body =
          JSON.parse(
            String(
              requestInit?.body
            )
          );

        expect(
  body.model
).toBe(
  "gpt-5.6-terra"
);

        expect(
          body.reasoning
        ).toEqual({
          effort:
            "medium",
        });

        const clinicalInput =
          JSON.parse(
            body.input
          );

        expect(
          clinicalInput.responseMode
        ).toBe(
          "cause-reasoning"
        );

        expect(
          clinicalInput.report
            .structuredEvidence
        ).toHaveLength(
          5
        );

        expect(
          clinicalInput
            .clinicalKnowledge
            .markerNodes
        ).toHaveLength(
          3
        );

        expect(
          clinicalInput
            .clinicalKnowledge
            .relationships
        ).toHaveLength(
          2
        );

        const inputBytes =
          Buffer.byteLength(
            body.input,
            "utf8"
          );

        expect(
          inputBytes
        ).toBeGreaterThan(
          0
        );

        expect(
          body.input.length
        ).toBeGreaterThan(
          0
        );

        expect(
          clinicalInput.report
            .storedSummary
        ).toBe(
          "Stored report summary."
        );

        expect(
          clinicalInput.report
            .storedKeyFindings
        ).toBe(
          "Stored key findings."
        );

        expect(
          clinicalInput.report
            .storedRecommendations
        ).toBe(
          "Stored recommendations."
        );

        expect(
          clinicalInput.report
            .storedNextBestAction
        ).toBe(
          "Stored next best action."
        );

        expect(
          clinicalInput
            .deterministicClinicalNarrative
        ).toContain(
          "glucose and lipid"
        );

        console.info(
          "clinical-explanation-input-baseline",
          {
            mode:
              clinicalInput.responseMode,

            inputCharacters:
              body.input.length,

            inputBytes,

            structuredEvidenceCount:
              clinicalInput.report
                .structuredEvidence
                .length,

            markerNodeCount:
              clinicalInput
                .clinicalKnowledge
                .markerNodes
                .length,

            relationshipCount:
              clinicalInput
                .clinicalKnowledge
                .relationships
                .length,
          }
        );
      }
    );

        it(
      "excludes direct provenance relationships from the clinical AI payload",
      async () => {
        vi.stubEnv(
          "OPENAI_API_KEY",
          "test-api-key"
        );

        const input =
          createInput();

        const sourceRelationship =
          input.knowledge
            .relationships[0];

        expect(
          sourceRelationship
        ).toBeDefined();

        if (
          !sourceRelationship
        ) {
          throw new Error(
            "Expected a clinical relationship fixture."
          );
        }

        input.knowledge.relationships.push({
          ...sourceRelationship,

          id:
            "relationship:provenance-direct",

          type:
            "direct",
        });

        const fetchMock =
          vi.spyOn(
            globalThis,
            "fetch"
          ).mockResolvedValue(
            new Response(
              JSON.stringify({
                output_text:
  JSON.stringify({
    overview:
      "Test clinical explanation.",

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
      [],

    questionsForClinician:
      [],

    urgency:
      "routine",

    limitations: [
      "Test limitation.",
    ],
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

        await openAIAssistantClinicalExplanationClient.generate(
          input
        );

        expect(
          fetchMock
        ).toHaveBeenCalledOnce();

        const requestInit =
          fetchMock.mock
            .calls[0]?.[1];

        const body =
          JSON.parse(
            String(
              requestInit?.body
            )
          ) as {
            input:
              string;
          };

        const clinicalInput =
          JSON.parse(
            body.input
          ) as {
            clinicalKnowledge: {
              relationships:
                Array<{
                  id:
                    string;

                  type:
                    string;
                }>;
            };
          };

        expect(
          clinicalInput
            .clinicalKnowledge
            .relationships
            .some(
              (relationship) =>
                relationship.type ===
                "direct"
            )
        ).toBe(
          false
        );

        expect(
          clinicalInput
            .clinicalKnowledge
            .relationships
            .find(
              (relationship) =>
                relationship.id ===
                "relationship:provenance-direct"
            )
        ).toBeUndefined();
      }
    );

    it(
      "uses the cause-reasoning schema limits for a focused relationship question",
      async () => {
        vi.stubEnv(
          "OPENAI_API_KEY",
          "test-api-key"
        );

        const fetchMock =
          vi.spyOn(
            globalThis,
            "fetch"
          )
            .mockResolvedValue(
              new Response(
                JSON.stringify({
                  output_text:
                    JSON.stringify(
                      generatedExplanation
                    ),
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

        await openAIAssistantClinicalExplanationClient.generate(
          createInput()
        );

        const requestInit =
          fetchMock.mock.calls[0][1];

        const body =
          JSON.parse(
            String(
              requestInit?.body
            )
          );

        const schema =
          body.text.format.schema;

        expect(
  Object.keys(
    schema.properties
  ).sort()
).toEqual(
  [
    "limitations",
    "missingContext",
    "overview",
    "possibleContributors",
    "relationships",
    "urgency",
  ].sort()
);

expect(
  schema.required
    .slice()
    .sort()
).toEqual(
  [
    "overview",
    "relationships",
    "possibleContributors",
    "missingContext",
    "urgency",
    "limitations",
  ].sort()
);

expect(
  schema.properties
    .relationships
    .maxItems
).toBe(
  4
);

expect(
  schema.properties
    .possibleContributors
    .maxItems
).toBe(
  4
);

expect(
  schema.properties
    .missingContext
    .maxItems
).toBe(
  6
);

expect(
  schema.properties
    .limitations
    .maxItems
).toBe(
  6
);

expect(
  schema.properties
    .priorityFindings
).toBeUndefined();

expect(
  schema.properties
    .reassuringFindings
).toBeUndefined();

expect(
  schema.properties
    .nextSteps
).toBeUndefined();

expect(
  schema.properties
    .questionsForClinician
).toBeUndefined();
      }
    );
    it(
  "normalizes a compact cause-reasoning response into the full clinical explanation contract",
  async () => {
    vi.stubEnv(
      "OPENAI_API_KEY",
      "test-api-key"
    );

    vi.stubEnv(
      "OPENAI_CLINICAL_EXPLANATION_MODEL",
      "gpt-5.6-sol"
    );

    vi.stubEnv(
      "OPENAI_CLINICAL_EXPLANATION_REASONING_EFFORT",
      "medium"
    );

    const compactExplanation = {
      overview:
        "Glucose and lipid abnormalities may occur together, but this pattern alone does not establish a diagnosis.",

      relationships: [
        {
          markers: [
            "HbA1c",
            "Triglycerides",
          ],

          explanation:
            "These abnormalities may occur together in metabolic patterns.",

          confidence:
            "moderate",
        },
      ],

      possibleContributors: [
        {
          factor:
            "Reduced insulin sensitivity",

          whyPossible:
            "It may contribute to altered glucose regulation and triglyceride elevation.",

          confirmationNeeded:
            "Clinical history and additional assessment are needed.",
        },
      ],

      missingContext: [
        "Fasting status",
      ],

      urgency:
        "routine",

      limitations: [
        "The report alone cannot establish a diagnosis.",
      ],
    };

    vi.spyOn(
      globalThis,
      "fetch"
    )
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            output_text:
              JSON.stringify(
                compactExplanation
              ),
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
      await openAIAssistantClinicalExplanationClient.generate(
        createInput()
      );

    expect(
      result
    ).toEqual({
      overview:
        compactExplanation.overview,

      priorityFindings:
        [],

      relationships:
        compactExplanation.relationships,

      possibleContributors:
        compactExplanation.possibleContributors,

      reassuringFindings:
        [],

      missingContext:
        compactExplanation.missingContext,

      nextSteps:
        [],

      questionsForClinician:
        [],

      urgency:
        compactExplanation.urgency,

      limitations:
        compactExplanation.limitations,
    });
    }
   );

   it(
  "sends only the focused LDL marker graph for a focused clinical question",
  async () => {
    vi.stubEnv(
      "OPENAI_API_KEY",
      "test-api-key"
    );

    const input =
      createInput();

    const sourceMarkerNode =
      input.knowledge.nodes.find(
        (node) =>
          node.type ===
          "laboratory-marker"
      );

    expect(
      sourceMarkerNode
    ).toBeDefined();

    if (!sourceMarkerNode) {
      throw new Error(
        "Expected a laboratory marker fixture."
      );
    }

    const ldlEvidence =
      input.report.reportEvidence.filter(
        (item) =>
          item.marker ===
          "LDL"
      );

    expect(
      ldlEvidence
    ).toHaveLength(
      1
    );

    input.report.reportEvidence =
      ldlEvidence;

    input.mode =
      "cause-reasoning";

    input.question = [
      "Why might my LDL be high?",
      "",
      "Resolved semantic conversation context:",
      "Conversation response scope: focused",
      "Resolved subject: LDL",
    ].join(
      "\n"
    );

    input.knowledge.nodes.push({
      ...sourceMarkerNode,

      id:
        `marker:${input.report.reportId}:ldl`,

      label:
        "LDL",

      description:
        "LDL laboratory marker.",

      evidence:
        sourceMarkerNode.evidence.map(
          (evidence) => ({
            ...evidence,

            sourceType:
              "laboratory-result",

            sourceId:
              String(
                input.report.reportId
              ),
          })
        ),
    });

    const fetchMock =
      vi.spyOn(
        globalThis,
        "fetch"
      )
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              output_text:
                JSON.stringify(
                  generatedExplanation
                ),
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

    await openAIAssistantClinicalExplanationClient.generate(
      input
    );

    const requestInit =
      fetchMock.mock.calls[0]?.[1];

    const body =
      JSON.parse(
        String(
          requestInit?.body
        )
      );

    const clinicalInput =
      JSON.parse(
        body.input
      ) as {
        report: {
          structuredEvidence:
            Array<{
              marker:
                string;
            }>;
        };

        clinicalKnowledge: {
          markerNodes:
            Array<{
              id:
                string;

              label:
                string;
            }>;

          relationships:
            Array<{
              sourceNodeId:
                string;

              targetNodeId:
                string;
            }>;
        };
      };

    expect(
      clinicalInput
        .report
        .structuredEvidence
    ).toHaveLength(
      1
    );

    expect(
      clinicalInput
        .report
        .structuredEvidence[0]
        ?.marker
    ).toBe(
      "LDL"
    );

    expect(
      clinicalInput
        .clinicalKnowledge
        .markerNodes
    ).toHaveLength(
      1
    );

    expect(
      clinicalInput
        .clinicalKnowledge
        .markerNodes[0]
        ?.label
    ).toBe(
      "LDL"
    );

    expect(
      clinicalInput
        .clinicalKnowledge
        .markerNodes[0]
        ?.id
    ).toBe(
      `marker:${input.report.reportId}:ldl`
    );

    expect(
      clinicalInput
        .clinicalKnowledge
        .markerNodes.some(
          (node) =>
            node.label ===
              "Glucose" ||
            node.label ===
              "HbA1c" ||
            node.label ===
              "Triglycerides"
        )
    ).toBe(
      false
    );

    expect(
      clinicalInput
        .clinicalKnowledge
        .relationships
    ).toHaveLength(
      0
    );
  }
);

   it(
  "routes next-step explanations to the focused Terra model",
  async () => {
    vi.stubEnv(
      "OPENAI_API_KEY",
      "test-api-key"
    );

    vi.stubEnv(
      "OPENAI_CLINICAL_EXPLANATION_MODEL",
      "gpt-5.6-sol"
    );

    vi.stubEnv(
      "OPENAI_CLINICAL_EXPLANATION_FOCUSED_MODEL",
      "gpt-5.6-terra"
    );

    vi.stubEnv(
      "OPENAI_CLINICAL_EXPLANATION_REASONING_EFFORT",
      "medium"
    );

    const fetchMock =
      vi.spyOn(
        globalThis,
        "fetch"
      )
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              output_text:
                JSON.stringify(
                  generatedExplanation
                ),
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

    await openAIAssistantClinicalExplanationClient.generate({
      ...createInput(),
      mode:
        "next-step",
    });

    const body =
      JSON.parse(
        String(
          fetchMock.mock.calls[0]?.[1]?.body
        )
      ) as {
        model:
          string;
      };

    expect(
      body.model
    ).toBe(
      "gpt-5.6-terra"
    );
  }
);

it(
  "keeps full clinical explanations on Sol",
  async () => {
    vi.stubEnv(
      "OPENAI_API_KEY",
      "test-api-key"
    );

    vi.stubEnv(
      "OPENAI_CLINICAL_EXPLANATION_MODEL",
      "gpt-5.6-sol"
    );

    vi.stubEnv(
      "OPENAI_CLINICAL_EXPLANATION_FOCUSED_MODEL",
      "gpt-5.6-terra"
    );

    vi.stubEnv(
      "OPENAI_CLINICAL_EXPLANATION_REASONING_EFFORT",
      "medium"
    );

    const fetchMock =
      vi.spyOn(
        globalThis,
        "fetch"
      )
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              output_text:
                JSON.stringify(
                  generatedExplanation
                ),
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

    await openAIAssistantClinicalExplanationClient.generate({
      ...createInput(),
      mode:
        "full",
    });

    const body =
      JSON.parse(
        String(
          fetchMock.mock.calls[0]?.[1]?.body
        )
      ) as {
        model:
          string;
      };

    expect(
      body.model
    ).toBe(
      "gpt-5.6-sol"
    );
  }
);

it(
  "allows a dedicated focused-model override without changing the full model",
  async () => {
    vi.stubEnv(
      "OPENAI_API_KEY",
      "test-api-key"
    );

    vi.stubEnv(
      "OPENAI_CLINICAL_EXPLANATION_MODEL",
      "gpt-5.6-sol"
    );

    vi.stubEnv(
      "OPENAI_CLINICAL_EXPLANATION_FOCUSED_MODEL",
      "focused-model-test"
    );

    vi.stubEnv(
      "OPENAI_CLINICAL_EXPLANATION_REASONING_EFFORT",
      "medium"
    );

    const fetchMock =
      vi.spyOn(
        globalThis,
        "fetch"
      )
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              output_text:
                JSON.stringify(
                  generatedExplanation
                ),
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

    await openAIAssistantClinicalExplanationClient.generate(
      createInput()
    );

    const body =
      JSON.parse(
        String(
          fetchMock.mock.calls[0]?.[1]?.body
        )
      ) as {
        model:
          string;
      };

    expect(
      body.model
    ).toBe(
      "focused-model-test"
    );
  }
);
  }
);

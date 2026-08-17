import { describe, expect, it } from "vitest";

import { buildClinicalHypothesisFoundation } from "@/lib/health-intelligence/engines/clinical-hypothesis.engine";

import type { ClinicalEvidenceWeightCollection } from "@/lib/health-intelligence/models/clinical-evidence-weight";

import {
  createEmptyWholeBodyClinicalKnowledgeModel,
  type ClinicalEvidenceRelevance,
  type WholeBodyClinicalKnowledgeModel,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

function createEvidenceWeights(
  entries: Array<{
    id: string;

    weight: number;

    relevance?: ClinicalEvidenceRelevance;
  }>,
): ClinicalEvidenceWeightCollection {
  const evidence = entries.map(({ id, weight, relevance = "supporting" }) => ({
    evidenceId: id,

    sourceType: "laboratory-result" as const,

    confidence: "high" as const,

    relevance,

    recency: "current" as const,

    completeness: "complete" as const,

    strength:
      weight >= 0.85
        ? ("very-high" as const)
        : weight >= 0.7
          ? ("high" as const)
          : weight >= 0.5
            ? ("moderate" as const)
            : weight >= 0.3
              ? ("low" as const)
              : ("very-low" as const),

    normalizedWeight: weight,

    components: {
      sourceReliability: weight,

      certainty: weight,

      confidence: weight,

      relevance: weight,

      recency: weight,

      completeness: weight,
    },

    rationale: [],

    evaluatedAt: "2026-08-06T08:00:00.000Z",
  }));

  const sortedEvidence = [...evidence].sort(
    (first, second) => second.normalizedWeight - first.normalizedWeight,
  );

  return {
    evidence,

    averageWeight:
      evidence.length === 0
        ? 0
        : evidence.reduce((total, item) => total + item.normalizedWeight, 0) /
          evidence.length,

    strongestEvidenceId: sortedEvidence[0]?.evidenceId ?? null,

    weakestEvidenceId:
      sortedEvidence[sortedEvidence.length - 1]?.evidenceId ?? null,

    evaluatedAt: "2026-08-06T08:00:00.000Z",
  };
}

function createConnectedKnowledge(
  options: {
    supportingEvidenceIds?: string[];

    contradictingEvidenceIds?: string[];

    missingEvidence?: string[];
  } = {},
): WholeBodyClinicalKnowledgeModel {
  const knowledge = createEmptyWholeBodyClinicalKnowledgeModel();

  knowledge.nodes = [
    {
      id: "node:source",

      type: "laboratory-marker",

      label: "Elevated LDL finding",

      description: "An elevated LDL-related finding.",

      domains: ["endocrine-metabolic", "cardiovascular"],

      evidence: [
        {
          id: "evidence:1",

          sourceType: "laboratory-result",

          sourceId: "lab:1",

          label: "LDL result",

          value: 180,

          unit: "mg/dL",

          observedAt: "2026-08-01T08:00:00.000Z",

          certainty: "confirmed",

          confidence: "high",

          relevance: "supporting",
        },

        {
          id: "evidence:context",

          sourceType: "health-history",

          sourceId: "history:1",

          label: "Relevant health context",

          value: "Family cardiovascular history",

          unit: null,

          observedAt: "2026-08-01T08:00:00.000Z",

          certainty: "reported",

          confidence: "moderate",

          relevance: "contextual",
        },
      ],

      priority: "important",

      confidence: "high",
    },

    {
      id: "node:target",

      type: "risk",

      label: "Cardiovascular risk pattern",

      description: "A cardiovascular risk-related pattern.",

      domains: ["cardiovascular"],

      evidence: [
        {
          id: "evidence:2",

          sourceType: "generated-analysis",

          sourceId: "analysis:1",

          label: "Risk analysis",

          value: "Cardiovascular risk review",

          unit: null,

          observedAt: "2026-08-01T08:00:00.000Z",

          certainty: "inferred",

          confidence: "moderate",

          relevance: "supporting",
        },

        {
          id: "evidence:contradicting",

          sourceType: "clinical-note",

          sourceId: "note:1",

          label: "Contradicting clinical context",

          value: "A finding that may reduce confidence.",

          unit: null,

          observedAt: "2026-08-01T08:00:00.000Z",

          certainty: "confirmed",

          confidence: "high",

          relevance: "contradicting",
        },
      ],

      priority: "monitor",

      confidence: "moderate",
    },
  ];

  knowledge.relationships = [
    {
      id: "relationship:test",

      sourceNodeId: "node:source",

      targetNodeId: "node:target",

      type: "risk-factor",

      explanation:
        "The weighted evidence supports evaluating a possible relationship between the elevated LDL finding and the cardiovascular risk pattern.",

      supportingEvidenceIds: options.supportingEvidenceIds ?? [
        "evidence:1",
        "evidence:2",
      ],

      contradictingEvidenceIds: options.contradictingEvidenceIds ?? [],

      confidence: "high",

      clinicalSignificance: "important",

      missingEvidence: options.missingEvidence ?? [],
    },
  ];

  knowledge.coveredDomains = ["endocrine-metabolic", "cardiovascular"];

  return knowledge;
}

describe("Clinical hypothesis generation", () => {
  it("returns a safe empty result when no evidence exists", () => {
    const result = buildClinicalHypothesisFoundation({
      knowledge: createEmptyWholeBodyClinicalKnowledgeModel(),

      evidenceWeights: createEvidenceWeights([]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.status).toBe("no-evidence");

    expect(result.hypotheses).toEqual([]);

    expect(result.generationAllowed).toBe(false);
  });

  it("does not generate a hypothesis from one eligible supporting evidence item", () => {
    const result = buildClinicalHypothesisFoundation({
      knowledge: createConnectedKnowledge({
        supportingEvidenceIds: ["evidence:1"],
      }),

      evidenceWeights: createEvidenceWeights([
        {
          id: "evidence:1",

          weight: 0.9,
        },
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.status).toBe("insufficient-foundation");

    expect(result.hypotheses).toEqual([]);

    expect(result.generationAllowed).toBe(false);
  });

  it("generates one candidate hypothesis from an explicit relationship with two eligible supporting evidence items", () => {
    const result = buildClinicalHypothesisFoundation({
      knowledge: createConnectedKnowledge(),

      evidenceWeights: createEvidenceWeights([
        {
          id: "evidence:1",

          weight: 0.9,
        },

        {
          id: "evidence:2",

          weight: 0.8,
        },

        {
          id: "evidence:context",

          weight: 0.65,

          relevance: "contextual",
        },
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.status).toBe("hypotheses-generated");

    expect(result.generationAllowed).toBe(true);

    expect(result.generatedHypothesisCount).toBe(1);

    expect(result.hypotheses).toHaveLength(1);

    expect(result.hypotheses[0]).toMatchObject({
      id: "hypothesis:relationship:test",

      title:
        "Elevated LDL finding may be clinically related to Cardiovascular risk pattern",

      kind: "risk-pattern",

      status: "candidate",

      priority: "important",

      confidence: "high",

      affectedNodeIds: ["node:source", "node:target"],

      affectedRelationshipIds: ["relationship:test"],
    });

    expect(result.hypotheses[0].domains).toEqual(
      expect.arrayContaining(["endocrine-metabolic", "cardiovascular"]),
    );

    expect(
      result.hypotheses[0].supportingEvidence.map(
        (evidence) => evidence.evidenceId,
      ),
    ).toEqual(["evidence:1", "evidence:2"]);

    expect(
      result.hypotheses[0].contextualEvidence.map(
        (evidence) => evidence.evidenceId,
      ),
    ).toContain("evidence:context");
  });

  it("separates contradicting evidence from supporting evidence", () => {
    const result = buildClinicalHypothesisFoundation({
      knowledge: createConnectedKnowledge({
        contradictingEvidenceIds: ["evidence:contradicting"],
      }),

      evidenceWeights: createEvidenceWeights([
        {
          id: "evidence:1",

          weight: 0.9,
        },

        {
          id: "evidence:2",

          weight: 0.8,
        },

        {
          id: "evidence:contradicting",

          weight: 0.85,

          relevance: "contradicting",
        },
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    const hypothesis = result.hypotheses[0];

    expect(
      hypothesis.supportingEvidence.map((evidence) => evidence.evidenceId),
    ).toEqual(["evidence:1", "evidence:2"]);

    expect(
      hypothesis.contradictingEvidence.map((evidence) => evidence.evidenceId),
    ).toEqual(["evidence:contradicting"]);
  });

  it("preserves missing evidence and the interpretation safety boundary", () => {
    const result = buildClinicalHypothesisFoundation({
      knowledge: createConnectedKnowledge({
        missingEvidence: [
          "Repeat lipid profile",
          "Complete cardiovascular risk factors",
        ],
      }),

      evidenceWeights: createEvidenceWeights([
        {
          id: "evidence:1",

          weight: 0.9,
        },

        {
          id: "evidence:2",

          weight: 0.8,
        },
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    const hypothesis = result.hypotheses[0];

    expect(hypothesis.missingEvidence).toEqual([
      "Repeat lipid profile",
      "Complete cardiovascular risk factors",
    ]);

    expect(hypothesis.interpretationBoundary).toContain(
      "not a confirmed diagnosis",
    );

    expect(result.safetyBoundary).toContain("do not diagnose disease");

    expect(result.safetyBoundary).toContain("probabilities");
  });

  it("excludes low-weight evidence from generation eligibility", () => {
    const result = buildClinicalHypothesisFoundation({
      knowledge: createConnectedKnowledge(),

      evidenceWeights: createEvidenceWeights([
        {
          id: "evidence:1",

          weight: 0.9,
        },

        {
          id: "evidence:2",

          weight: 0.3,
        },
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.generationAllowed).toBe(false);

    expect(result.hypotheses).toEqual([]);

    expect(result.excludedEvidenceIds).toContain("evidence:2");
  });
});

import { describe, expect, it } from "vitest";

import { buildClinicalNarrative } from "@/lib/health-intelligence/application/clinical-narrative.service";

import type { ClinicalDecisionTrace } from "@/lib/health-intelligence/engines/clinical-decision-trace.engine";

function createDecisionTrace(
  overrides: Partial<ClinicalDecisionTrace> = {},
): ClinicalDecisionTrace {
  return {
    available: true,

    status: "limited-by-missing-evidence",

    hypothesisId: "hypothesis:test",

    hypothesisTitle: "Evidence-supported clinical interpretation",

    hypothesisDescription:
      "The available evidence supports a provisional clinical interpretation.",

    hypothesisKind: "possible-explanation",

    hypothesisStatus: "provisional",

    rankingPosition: 1,

    rankingScore: 0.72,

    rankingReason:
      "Supporting evidence remained stronger after deterministic penalties.",

    supportingEvidence: [
      {
        evidenceId: "evidence:supporting",

        normalizedWeight: 0.9,

        explanation: "Confirmed evidence supports the interpretation.",
      },
    ],

    contradictingEvidence: [
      {
        evidenceId: "evidence:contradicting",

        normalizedWeight: 0.4,

        explanation: "Another finding limits the interpretation.",
      },
    ],

    contextualEvidence: [
      {
        evidenceId: "evidence:context",

        normalizedWeight: 0.5,

        explanation: "Contextual information may affect interpretation.",
      },
    ],

    missingEvidence: ["Repeat objective measurement"],

    conflictLevel: "low",

    conflictReason:
      "Contradicting evidence is currently weaker than supporting evidence.",

    calibratedConfidence: "moderate",

    confidenceReason:
      "Confidence remains moderate because evidence is missing.",

    requiresClarification: false,

    requiresAdditionalEvidence: true,

    requiresClinicalReview: false,

    whatCouldChangeInterpretation: [
      "Repeat objective measurement",
      "Additional objective clinical evidence.",
    ],

    interpretationBoundary: "This interpretation is not a confirmed diagnosis.",

    traceReason: "Existing reasoning results were consolidated.",

    generatedAt: "2026-08-06T16:00:00.000Z",

    ...overrides,
  };
}

describe("Clinical narrative service", () => {
  it("returns an unavailable result when the decision trace is unavailable", () => {
    const result = buildClinicalNarrative({
      audience: "patient",

      language: "en",

      decisionTrace: createDecisionTrace({
        available: false,

        status: "not-available",

        hypothesisId: null,
      }),
    });

    expect(result.available).toBe(false);

    expect(result.narrative).toBeNull();
  });

  it("builds a patient narrative from the decision trace", () => {
    const result = buildClinicalNarrative({
      audience: "patient",

      language: "en",

      decisionTrace: createDecisionTrace(),
    });

    expect(result.available).toBe(true);

    expect(result.narrative).toContain("What the available evidence suggests");

    expect(result.narrative).toContain(
      "Why this interpretation is being considered",
    );

    expect(result.narrative).toContain(
      "This interpretation is not a confirmed diagnosis",
    );
  });

  it("builds a doctor narrative with ranking conflict and confidence rationale", () => {
    const result = buildClinicalNarrative({
      audience: "doctor",

      language: "en",

      decisionTrace: createDecisionTrace(),
    });

    expect(result.narrative).toContain("Ranking position: 1");

    expect(result.narrative).toContain("Ranking rationale");

    expect(result.narrative).toContain("Conflict rationale");

    expect(result.narrative).toContain("Confidence rationale");
  });

  it("builds a concise assistant narrative", () => {
    const result = buildClinicalNarrative({
      audience: "assistant",

      language: "en",

      decisionTrace: createDecisionTrace(),
    });

    expect(result.narrative).toContain("The calibrated confidence is moderate");

    expect(result.narrative).toContain("Important missing information");

    expect(result.narrative).not.toContain("Ranking position:");
  });

  it("builds an Arabic patient narrative", () => {
    const result = buildClinicalNarrative({
      audience: "patient",

      language: "ar",

      decisionTrace: createDecisionTrace(),
    });

    expect(result.narrative).toContain("ما الذي تشير إليه الأدلة المتوفرة؟");

    expect(result.narrative).toContain("لماذا نأخذ هذا التفسير بعين الاعتبار؟");

    expect(result.confidenceStatement).toContain("مستوى الثقة المعاير");
  });

  it("preserves missing evidence and what could change the interpretation", () => {
    const result = buildClinicalNarrative({
      audience: "patient",

      language: "en",

      decisionTrace: createDecisionTrace(),
    });

    expect(result.missingEvidenceStatement).toContain(
      "Repeat objective measurement",
    );

    expect(result.nextEvidenceStatement).toContain(
      "Additional objective clinical evidence",
    );
  });

  it("does not present the narrative as diagnostic confirmation", () => {
    const result = buildClinicalNarrative({
      audience: "assistant",

      language: "en",

      decisionTrace: createDecisionTrace(),
    });

    expect(result.safetyBoundary).toContain("not a confirmed diagnosis");

    expect(result.reason).toContain("without recalculating");
  });
});
it(
  "preserves the clinical review safety boundary in the assistant narrative",
  () => {
    const result =
      buildClinicalNarrative({
        audience:
          "assistant",

        language:
          "en",

        decisionTrace:
          createDecisionTrace({
            conflictLevel:
              "high",

            calibratedConfidence:
              "low",

            requiresClinicalReview:
              true,

            requiresClarification:
              true,
          }),
      });

    expect(
      result.available
    ).toBe(true);

    expect(
      result.confidenceStatement
    ).toContain(
      "requires clinical review"
    );

    expect(
      result.narrative
    ).toContain(
      "requires clinical review"
    );

    expect(
      result.narrative
    ).toContain(
      "evidence-conflict level is high"
    );

    expect(
      result.narrative
    ).toContain(
      "not a confirmed diagnosis"
    );
  }
);

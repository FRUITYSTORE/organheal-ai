import { describe, expect, it } from "vitest";

import type { PatientSummary } from "@/lib/models/patient";

import { buildWholeBodyClinicalKnowledge } from "@/lib/health-intelligence/builders/whole-body-clinical-knowledge.builder";

import { buildClinicalReasoningRuntime } from "@/lib/health-intelligence/runtime/clinical-reasoning-runtime";

function createEmptyPatientSummary(): PatientSummary {
  return {
    profile: null,

    assessments: [],

    latestCheckIn: null,

    recentCheckIns: [],

    uploadedReports: [],

    reportMarkers: [],

    healthInsights: [],

    generatedResults: [],

    historyItems: [],
  };
}

function createConnectedPatientSummary(): PatientSummary {
  return {
    ...createEmptyPatientSummary(),

    uploadedReports: [
      {
        id: 301,

        file_name: "ophthalmology-report.pdf",

        file_path: "reports/ophthalmology-report.pdf",

        report_type: "ophthalmology",

        extraction_status: "Completed",

        extracted_text: "Extracted ophthalmology report.",

        created_at: "2026-08-01T08:00:00.000Z",

        extracted_at: "2026-08-01T08:02:00.000Z",
      },
    ],

    healthInsights: [
      {
        id: 701,

        report_id: 301,

        insight_title: "Ophthalmology report review",

        summary: "A generated report review is available.",

        key_findings:
          "Ophthalmology findings are available for clinical review.",

        recommendations: "Continue follow-up with the appropriate clinician.",

        doctor_brief: "Ophthalmology report reviewed.",

        ai_status: "Generated",

        risk_level: "Moderate",

        next_best_action:
          "Discuss the findings with an ophthalmology professional.",

        report_type: "ophthalmology",

        created_at: "2026-08-01T08:05:00.000Z",
      },
    ],
  };
}

describe("Clinical reasoning runtime", () => {
  it("requires clarification when no patient evidence is available", () => {
    const knowledge = buildWholeBodyClinicalKnowledge(
      createEmptyPatientSummary(),
    );

    const runtime = buildClinicalReasoningRuntime({
      question: "What should I understand about my health?",

      intent: "general",

      knowledge,
    });

    expect(runtime.mode).toBe("clarification");

    expect(runtime.reasoningPermission).toBe("clarify-first");

    expect(runtime.canAnswer).toBe(false);

    expect(runtime.canProvideProvisionalAnswer).toBe(false);

    expect(runtime.requiresClarification).toBe(true);

    expect(runtime.clarification.question?.id).toBe(
      "clarification:no-evidence",
    );

    expect(runtime.uncertainty.hasUncertainty).toBe(true);
  });

  it("creates a provisional reasoning state for connected but incomplete evidence", () => {
    const knowledge = buildWholeBodyClinicalKnowledge(
      createConnectedPatientSummary(),
    );

    const runtime = buildClinicalReasoningRuntime({
      question: "What does this eye report mean?",

      intent: "report",

      knowledge,
    });

    expect(runtime.evidenceSufficiency).not.toBeNull();

    expect(runtime.knowledge).toBe(knowledge);

    expect(runtime.confidence).toBe(knowledge.evidenceSufficiency?.confidence);

    expect(runtime.canProvideProvisionalAnswer).toBe(true);

    expect(runtime.clarification.question).not.toBeNull();

    expect(runtime.mode).toBe("clarification");

    expect(runtime.requiresClarification).toBe(true);

    expect(runtime.knowledge.coveredDomains).toContain("ophthalmology");
  });

  it("moves to the next unresolved gap when a clarification question was already asked", () => {
    const knowledge = buildWholeBodyClinicalKnowledge(
      createConnectedPatientSummary(),
    );

    const firstRuntime = buildClinicalReasoningRuntime({
      question: "Explain this report.",

      intent: "report",

      knowledge,
    });

    const firstQuestionId = firstRuntime.clarification.question?.id;

    expect(firstQuestionId).toBeDefined();

    const secondRuntime = buildClinicalReasoningRuntime({
      question: "I am answering your previous question.",

      intent: "report",

      knowledge,

      previouslyAskedQuestionIds: firstQuestionId ? [firstQuestionId] : [],
    });

    expect(secondRuntime.clarification.question?.id).not.toBe(firstQuestionId);

    expect(
      secondRuntime.clarification.excludedPreviouslyAskedCount,
    ).toBeGreaterThan(0);
  });

  it("preserves Arabic clarification output", () => {
    const knowledge = buildWholeBodyClinicalKnowledge(
      createEmptyPatientSummary(),
    );

    const runtime = buildClinicalReasoningRuntime({
      question: "ماذا أفعل؟",

      intent: "general",

      language: "ar",

      knowledge,
    });

    expect(runtime.language).toBe("ar");

    expect(runtime.clarification.question?.question).toContain(
      "ما المشكلة الصحية",
    );
  });

  it("does not recalculate or replace the existing evidence sufficiency result", () => {
    const knowledge = buildWholeBodyClinicalKnowledge(
      createConnectedPatientSummary(),
    );

    const originalSufficiency = knowledge.evidenceSufficiency;

    const runtime = buildClinicalReasoningRuntime({
      question: "Review my report.",

      intent: "report",

      knowledge,
    });

    expect(runtime.evidenceSufficiency).toBe(originalSufficiency);

    expect(runtime.knowledge.evidenceSufficiency).toBe(originalSufficiency);
  });

  it("attaches evidence weights without modifying the knowledge model", () => {
    const knowledge = buildWholeBodyClinicalKnowledge(
      createConnectedPatientSummary(),
    );

    const runtime = buildClinicalReasoningRuntime({
      question: "Explain my report.",
      intent: "report",
      knowledge,
    });

    expect(runtime.evidenceWeights.evidence.length).toBeGreaterThan(0);

    expect(runtime.evidenceWeights.averageWeight).toBeGreaterThan(0);

    expect(runtime.evidenceWeights.strongestEvidenceId).not.toBeNull();

    expect(knowledge.evidenceSufficiency).toBe(runtime.evidenceSufficiency);
  });
  it("attaches the hypothesis collection without changing existing runtime decisions", () => {
    const knowledge = buildWholeBodyClinicalKnowledge(
      createConnectedPatientSummary(),
    );

    const runtime = buildClinicalReasoningRuntime({
      question: "Explain my report.",

      intent: "report",

      knowledge,
    });

    expect(runtime.hypothesisCollection).toBeDefined();

    expect(runtime.hypothesisCollection.evidenceCount).toBe(
      runtime.evidenceWeights.evidence.length,
    );

    expect(runtime.hypothesisCollection.relationshipCount).toBe(
      knowledge.relationships.length,
    );

    expect(runtime.hypothesisCollection.generatedHypothesisCount).toBe(
      runtime.hypothesisCollection.hypotheses.length,
    );

    expect(runtime.hypothesisCollection.safetyBoundary).toContain(
      "do not diagnose disease",
    );

    expect(runtime.mode).toBe("clarification");

    expect(runtime.requiresClarification).toBe(true);
  });

  it("attaches deterministic hypothesis ranking without changing runtime decisions", () => {
    const knowledge = buildWholeBodyClinicalKnowledge(
      createConnectedPatientSummary(),
    );

    const runtime = buildClinicalReasoningRuntime({
      question: "Explain my report.",

      intent: "report",

      knowledge,
    });

    expect(runtime.hypothesisRanking).toBeDefined();

    expect(runtime.hypothesisRanking.hypothesisCount).toBe(
      runtime.hypothesisCollection.hypotheses.length,
    );

    expect(runtime.hypothesisRanking.rankedHypotheses.length).toBe(
      runtime.hypothesisCollection.hypotheses.length,
    );

    expect(runtime.hypothesisRanking.rankingApplied).toBe(
      runtime.hypothesisCollection.hypotheses.length > 0,
    );

    expect(runtime.mode).toBe("clarification");

    expect(runtime.requiresClarification).toBe(true);
  });

  it("attaches conflict resolution without changing established runtime decisions", () => {
    const knowledge = buildWholeBodyClinicalKnowledge(
      createConnectedPatientSummary(),
    );

    const runtime = buildClinicalReasoningRuntime({
      question: "Explain my report.",

      intent: "report",

      knowledge,
    });

    expect(runtime.conflictResolution).toBeDefined();

    expect(runtime.conflictResolution.hypothesisCount).toBe(
      runtime.hypothesisRanking.rankedHypotheses.length,
    );

    expect(runtime.conflictResolution.conflicts.length).toBe(
      runtime.hypothesisRanking.rankedHypotheses.length,
    );

    expect(runtime.conflictResolution.resolutionApplied).toBe(
      runtime.hypothesisRanking.rankedHypotheses.length > 0,
    );

    expect(runtime.mode).toBe("clarification");

    expect(runtime.requiresClarification).toBe(true);
  });

  it("attaches confidence calibration without changing runtime decisions", () => {
    const knowledge = buildWholeBodyClinicalKnowledge(
      createConnectedPatientSummary(),
    );

    const runtime = buildClinicalReasoningRuntime({
      question: "Explain my report.",

      intent: "report",

      knowledge,
    });

    expect(runtime.confidenceCalibration).toBeDefined();

    expect(runtime.confidenceCalibration.hypothesisCount).toBe(
      runtime.hypothesisRanking.rankedHypotheses.length,
    );

    expect(runtime.confidenceCalibration.calibratedCount).toBe(
      runtime.hypothesisRanking.rankedHypotheses.length,
    );

    expect(runtime.mode).toBe("clarification");

    expect(runtime.requiresClarification).toBe(true);
  });

  it("attaches decision trace without changing runtime decisions", () => {
    const knowledge = buildWholeBodyClinicalKnowledge(
      createConnectedPatientSummary(),
    );

    const runtime = buildClinicalReasoningRuntime({
      question: "Explain my report.",

      intent: "report",

      knowledge,
    });

    expect(runtime.decisionTrace).toBeDefined();

    expect(runtime.decisionTrace.available).toBe(
      runtime.confidenceCalibration.highestConfidenceHypothesisId !== null,
    );

    expect(runtime.decisionTrace.hypothesisId).toBe(
      runtime.confidenceCalibration.highestConfidenceHypothesisId,
    );

    expect(runtime.mode).toBe("clarification");

    expect(runtime.requiresClarification).toBe(true);
  });
});

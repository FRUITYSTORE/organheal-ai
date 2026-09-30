import { describe, expect, it } from "vitest";

import { validateVideoExplanationPlan } from "../lib/symptom-explanation/validate-explanation-plan";

// The spec's own first demonstration: exertional chest discomfort explained
// through myocardial oxygen demand vs coronary supply, normal anatomy only.
function coronaryPlan(overrides: Record<string, unknown> = {}) {
  return {
    planVersion: "1",
    organ: "heart",
    topic: "exertionalChestDiscomfort",
    safety: { level: "none" },
    mechanism: { id: "myocardialOxygenDemandSupply", evidence: "possible" },
    anatomy: {
      primaryFocus: "heart.coronary",
      structures: ["heart.myocardium", "heart.coronary.lad", "heart.coronary.rca", "heart.coronary.lcx"],
    },
    documentedFindings: [],
    scenes: [
      { type: "organOverview" },
      { type: "physiologyIntroduction" },
      { type: "structureFocus", target: "heart.coronary" },
      { type: "mechanismExplanation" },
      { type: "limitationsAndNextSteps" },
    ],
    ...overrides,
  };
}

function issuesOf(value: unknown): string[] {
  const result = validateVideoExplanationPlan(value);

  return result.ok ? [] : result.issues;
}

describe("validateVideoExplanationPlan", () => {
  it("accepts a valid normal-anatomy coronary explanation plan", () => {
    const result = validateVideoExplanationPlan(coronaryPlan());

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    expect(result.plan.anatomy.primaryFocus).toBe("heart.coronary");
  });

  it("accepts the hypertension education case on the LV and aorta", () => {
    const result = validateVideoExplanationPlan(
      coronaryPlan({
        topic: "bloodPressureAndTheHeart",
        mechanism: { id: "leftVentricularPressureLoad", evidence: "possible" },
        anatomy: { primaryFocus: "heart.leftVentricle", structures: ["heart.leftVentricle", "heart.aorta"] },
        scenes: [
          { type: "organOverview" },
          { type: "structureFocus", target: "heart.leftVentricle" },
          { type: "structureFocus", target: "heart.aorta" },
          { type: "limitationsAndNextSteps" },
        ],
      })
    );

    expect(result.ok).toBe(true);
  });

  it("refuses a plan whose safety level is not none, with the safety error code", () => {
    const result = validateVideoExplanationPlan(coronaryPlan({ safety: { level: "emergency" } }));

    expect(result.ok).toBe(false);

    if (result.ok) return;

    expect(result.errorCode).toBe("UNSAFE_FOR_VIDEO_FIRST");
  });

  it("refuses a plan with no safety block at all", () => {
    const plan: Record<string, unknown> = coronaryPlan();
    delete plan.safety;
    const result = validateVideoExplanationPlan(plan);

    expect(result.ok).toBe(false);

    if (result.ok) return;

    expect(result.errorCode).toBe("UNSAFE_FOR_VIDEO_FIRST");
  });

  it("never shows pathology from symptoms alone: a finding scene without a documented finding is rejected", () => {
    const result = validateVideoExplanationPlan(
      coronaryPlan({
        scenes: [
          { type: "organOverview" },
          { type: "findingVisualization", findingId: "lad-stenosis" },
          { type: "limitationsAndNextSteps" },
        ],
      })
    );

    expect(result.ok).toBe(false);

    if (result.ok) return;

    expect(result.errorCode).toBe("INVALID_SCENE_PLAN");
    expect(result.issues.join(" ")).toMatch(/never shown from symptoms alone/);
  });

  it("allows a finding scene only when it references a documented finding with evidence", () => {
    const result = validateVideoExplanationPlan(
      coronaryPlan({
        mechanism: { id: "myocardialOxygenDemandSupply", evidence: "documented" },
        documentedFindings: [
          { id: "lad-stenosis", structure: "heart.coronary.lad", evidenceRef: "report:angiography-2026-08" },
        ],
        scenes: [
          { type: "organOverview" },
          { type: "findingVisualization", findingId: "lad-stenosis" },
          { type: "limitationsAndNextSteps" },
        ],
      })
    );

    expect(result.ok).toBe(true);
  });

  it("rejects a documented finding that has no evidence reference", () => {
    expect(
      issuesOf(
        coronaryPlan({
          documentedFindings: [{ id: "lad-stenosis", structure: "heart.coronary.lad", evidenceRef: " " }],
        })
      ).join(" ")
    ).toMatch(/evidenceRef/);
  });

  it("rejects a diagnosis smuggled into the plan instead of quietly passing or stripping it", () => {
    expect(issuesOf(coronaryPlan({ diagnosis: "coronary artery disease" }))).toContain(
      'plan: unexpected field "diagnosis".'
    );
  });

  it("rejects a structure that belongs to a different organ", () => {
    expect(
      issuesOf(
        coronaryPlan({
          anatomy: { primaryFocus: "heart.coronary", structures: ["heart.coronary.lad", "lungs.trachea"] },
        })
      ).join(" ")
    ).toMatch(/"lungs\.trachea" is not a heart structure id/);
  });

  it("rejects a camera target that is not part of the plan's anatomy", () => {
    expect(
      issuesOf(
        coronaryPlan({
          scenes: [
            { type: "structureFocus", target: "heart.valve.mitral" },
            { type: "limitationsAndNextSteps" },
          ],
        })
      ).join(" ")
    ).toMatch(/scenes\[0\]\.target/);
  });

  it("rejects the whole organ as a target: it must name a structure or group", () => {
    expect(
      issuesOf(
        coronaryPlan({
          scenes: [{ type: "structureFocus", target: "heart" }, { type: "limitationsAndNextSteps" }],
        })
      ).join(" ")
    ).toMatch(/scenes\[0\]\.target/);
  });

  it("requires the video to end on limitations and next steps", () => {
    expect(
      issuesOf(coronaryPlan({ scenes: [{ type: "organOverview" }, { type: "mechanismExplanation" }] }))
    ).toContain('scenes: the final scene must be "limitationsAndNextSteps".');
  });

  it("rejects an unknown mechanism and an unknown evidence level", () => {
    const issues = issuesOf(coronaryPlan({ mechanism: { id: "blockedArtery", evidence: "likely" } }));

    expect(issues).toContain("mechanism.id: unknown mechanism.");
    expect(issues).toContain('mechanism.evidence: must be "possible" or "documented".');
  });

  it("rejects duplicate structures and an unmatched primary focus", () => {
    const issues = issuesOf(
      coronaryPlan({
        anatomy: { primaryFocus: "heart.aorta", structures: ["heart.coronary.lad", "heart.coronary.lad"] },
      })
    );

    expect(issues).toContain('anatomy.structures: "heart.coronary.lad" is listed twice.');
    expect(issues).toContain("anatomy.primaryFocus: does not match any listed structure.");
  });

  it("rejects an unknown organ and non-object input", () => {
    expect(issuesOf(coronaryPlan({ organ: "spleen" }))).toContain("organ: unknown organ.");
    expect(issuesOf("not a plan")).toEqual(["plan: must be an object."]);
  });
});

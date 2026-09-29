import { describe, expect, it } from "vitest";

import { buildHeartStoryContext } from "../lib/heart-age/heart-story-context";
import { calculateHeartAge, type HeartAgeInput } from "../lib/heart-age/heart-age.engine";

const input: HeartAgeInput = {
  sex: "male",
  age: 55,
  totalCholesterol: 240,
  hdlCholesterol: 40,
  systolicBloodPressure: 150,
  onBloodPressureMedication: false,
  isSmoker: true,
  hasDiabetes: false,
};

describe("buildHeartStoryContext", () => {
  it("includes the chronological age, calculated heart age, gap, and risk percentage", () => {
    const result = calculateHeartAge(input);
    const context = buildHeartStoryContext(input, result);

    expect(context).toContain("Chronological age: 55");
    expect(context).toContain(`Calculated heart age: ${result.heartAge}`);
    expect(context).toContain(`${result.ageGapYears} years OLDER`);
    expect(context).toContain(`${result.tenYearRiskPercent}%`);
  });

  it("reports smoker and non-diabetic status correctly", () => {
    const result = calculateHeartAge(input);
    const context = buildHeartStoryContext(input, result);

    expect(context).toContain("current smoker");
    expect(context).toContain("no diagnosed diabetes");
    expect(context).not.toContain("diagnosed with diabetes");
  });

  it("describes a younger-than-actual heart age with the YOUNGER phrasing", () => {
    const healthyInput: HeartAgeInput = {
      sex: "female",
      age: 60,
      totalCholesterol: 160,
      hdlCholesterol: 70,
      systolicBloodPressure: 110,
      onBloodPressureMedication: false,
      isSmoker: false,
      hasDiabetes: false,
    };
    const result = calculateHeartAge(healthyInput);
    const context = buildHeartStoryContext(healthyInput, result);

    expect(context).toContain("YOUNGER than their actual age");
  });

  it("appends report text only when provided, wrapped as clearly-labeled data", () => {
    const result = calculateHeartAge(input);

    const withoutReport = buildHeartStoryContext(input, result);
    expect(withoutReport).not.toContain("lab report text");

    const withReport = buildHeartStoryContext(input, result, "LDL: 190 mg/dL (High)");
    expect(withReport).toContain("lab report text");
    expect(withReport).toContain("LDL: 190 mg/dL (High)");
  });
});

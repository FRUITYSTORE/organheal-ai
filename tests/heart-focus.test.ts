import { describe, expect, it } from "vitest";

import { deriveHeartFocus } from "../lib/heart-age/heart-focus";
import type { HeartAgeInput } from "../lib/heart-age/heart-age.engine";

function input(overrides: Partial<HeartAgeInput> = {}): HeartAgeInput {
  return {
    sex: "male",
    age: 50,
    totalCholesterol: 180,
    hdlCholesterol: 55,
    systolicBloodPressure: 118,
    onBloodPressureMedication: false,
    isSmoker: false,
    hasDiabetes: false,
    ...overrides,
  };
}

describe("deriveHeartFocus", () => {
  it("flags neither structure when every factor is in the optimal range", () => {
    expect(deriveHeartFocus(input())).toEqual({
      coronaryArteries: false,
      leftVentricleAndAorta: false,
    });
  });

  it("flags coronary arteries for a smoker even with normal cholesterol and BP", () => {
    expect(deriveHeartFocus(input({ isSmoker: true })).coronaryArteries).toBe(true);
  });

  it("flags coronary arteries for diabetes", () => {
    expect(deriveHeartFocus(input({ hasDiabetes: true })).coronaryArteries).toBe(true);
  });

  it("flags coronary arteries for borderline-high total cholesterol (>=200 mg/dL)", () => {
    expect(deriveHeartFocus(input({ totalCholesterol: 200 })).coronaryArteries).toBe(true);
    expect(deriveHeartFocus(input({ totalCholesterol: 199 })).coronaryArteries).toBe(false);
  });

  it("flags coronary arteries for low HDL, with the sex-specific NCEP threshold", () => {
    expect(deriveHeartFocus(input({ sex: "male", hdlCholesterol: 39 })).coronaryArteries).toBe(true);
    expect(deriveHeartFocus(input({ sex: "male", hdlCholesterol: 40 })).coronaryArteries).toBe(false);
    expect(deriveHeartFocus(input({ sex: "female", hdlCholesterol: 49 })).coronaryArteries).toBe(true);
    expect(deriveHeartFocus(input({ sex: "female", hdlCholesterol: 50 })).coronaryArteries).toBe(false);
  });

  it("flags left ventricle & aorta for stage-1-or-higher systolic BP (>=130 mmHg)", () => {
    expect(deriveHeartFocus(input({ systolicBloodPressure: 130 })).leftVentricleAndAorta).toBe(true);
    expect(deriveHeartFocus(input({ systolicBloodPressure: 129 })).leftVentricleAndAorta).toBe(false);
  });

  it("flags left ventricle & aorta for anyone already treated with BP medication, regardless of today's reading", () => {
    expect(
      deriveHeartFocus(input({ onBloodPressureMedication: true, systolicBloodPressure: 118 }))
        .leftVentricleAndAorta
    ).toBe(true);
  });

  it("flags both structures independently when both sets of risk factors are present", () => {
    expect(
      deriveHeartFocus(input({ isSmoker: true, systolicBloodPressure: 140 }))
    ).toEqual({ coronaryArteries: true, leftVentricleAndAorta: true });
  });
});

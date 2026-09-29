// Real, published cardiovascular risk methodology — not a made-up score.
//
// Source: D'Agostino RB Sr, Vasan RS, Pencina MJ, et al. "General Cardiovascular
// Risk Profile for Use in Primary Care: The Framingham Heart Study."
// Circulation. 2008;117(6):743-753. Coefficients and baseline survival taken
// directly from the Framingham Heart Study's own published risk-function page:
// https://www.framinghamheartstudy.org/fhs-risk-functions/cardiovascular-disease-10-year-risk/
//
// "Heart age" (the number people actually share) is the standard derived
// concept used by the NHS, the Australian Heart Foundation, and the Joint
// British Societies (JBS3) calculators: the age of a person of the same sex
// with every other risk factor at an "optimal" reference level (non-smoker,
// non-diabetic, untreated SBP 120 mmHg, total cholesterol 180 mg/dL, HDL
// 50 mg/dL) who would carry the *same* 10-year risk as the person being
// assessed. Because the baseline survival and centering-mean terms cancel out
// when two risk figures are set equal, heart age can be solved for directly
// (closed form) instead of needing a numeric search — see deriveHeartAge().
//
// This is an educational screening tool, not a diagnosis. It intentionally
// mirrors the public methodology of NHS/AHA-style calculators so the result
// is a real clinical figure, not a marketing gimmick.

export type Sex = "male" | "female";

export type HeartAgeInput = {
  sex: Sex;
  /** Years. The equation is validated for adults roughly 30-79 years old. */
  age: number;
  /** Total cholesterol, mg/dL. */
  totalCholesterol: number;
  /** HDL cholesterol, mg/dL. */
  hdlCholesterol: number;
  /** Systolic blood pressure, mmHg. */
  systolicBloodPressure: number;
  /** Currently being treated with blood pressure medication. */
  onBloodPressureMedication: boolean;
  /** Current smoker. */
  isSmoker: boolean;
  /** Diagnosed with diabetes. */
  hasDiabetes: boolean;
};

export type HeartRiskLevel = "Low Risk" | "Moderate Risk" | "High Risk";

export type HeartAgeResult = {
  /** 10-year predicted risk of a cardiovascular event, as a percentage 0-100. */
  tenYearRiskPercent: number;
  /** The "heart age" in years — same risk as someone this age with optimal factors. */
  heartAge: number;
  /** heartAge - chronological age. Positive means the heart is "older" than the person. */
  ageGapYears: number;
  riskLevel: HeartRiskLevel;
  /** True when inputs fall outside the equation's validated 30-79y adult range. */
  outsideValidatedAgeRange: boolean;
};

const REFERENCE = {
  totalCholesterol: 180,
  hdlCholesterol: 50,
  systolicBloodPressure: 120,
};

const COEFFICIENTS = {
  male: {
    baselineSurvival: 0.88936,
    centeringMean: 23.9802,
    age: 3.06117,
    totalCholesterol: 1.1237,
    hdlCholesterol: -0.93263,
    systolicBpUntreated: 1.93303,
    systolicBpTreated: 1.99881,
    smoker: 0.65451,
    diabetic: 0.57367,
  },
  female: {
    baselineSurvival: 0.95012,
    centeringMean: 26.1931,
    age: 2.32888,
    totalCholesterol: 1.20904,
    hdlCholesterol: -0.70833,
    systolicBpUntreated: 2.76157,
    systolicBpTreated: 2.82263,
    smoker: 0.52873,
    diabetic: 0.69154,
  },
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Keeps inputs within physiologically plausible bounds so ln() never blows up. */
function sanitizeInput(input: HeartAgeInput): HeartAgeInput {
  return {
    ...input,
    age: clamp(input.age, 20, 100),
    totalCholesterol: clamp(input.totalCholesterol, 100, 400),
    hdlCholesterol: clamp(input.hdlCholesterol, 20, 120),
    systolicBloodPressure: clamp(input.systolicBloodPressure, 80, 220),
  };
}

function linearPredictor(input: HeartAgeInput) {
  const c = COEFFICIENTS[input.sex];
  const sbpCoefficient = input.onBloodPressureMedication
    ? c.systolicBpTreated
    : c.systolicBpUntreated;

  return (
    c.age * Math.log(input.age) +
    c.totalCholesterol * Math.log(input.totalCholesterol) +
    c.hdlCholesterol * Math.log(input.hdlCholesterol) +
    sbpCoefficient * Math.log(input.systolicBloodPressure) +
    (input.isSmoker ? c.smoker : 0) +
    (input.hasDiabetes ? c.diabetic : 0)
  );
}

function riskFromLinearPredictor(sex: Sex, linearPredictorValue: number) {
  const c = COEFFICIENTS[sex];
  const risk =
    1 -
    Math.pow(
      c.baselineSurvival,
      Math.exp(linearPredictorValue - c.centeringMean)
    );

  return clamp(risk, 0, 1);
}

/**
 * Closed-form heart age: solves for the age A (holding every other factor at
 * the optimal reference level, untreated SBP) that produces the same linear
 * predictor — and therefore the same 10-year risk — as the actual person.
 */
function deriveHeartAge(input: HeartAgeInput, actualLinearPredictor: number) {
  const c = COEFFICIENTS[input.sex];

  const referenceTerms =
    c.totalCholesterol * Math.log(REFERENCE.totalCholesterol) +
    c.hdlCholesterol * Math.log(REFERENCE.hdlCholesterol) +
    c.systolicBpUntreated * Math.log(REFERENCE.systolicBloodPressure);

  const impliedLogAge = (actualLinearPredictor - referenceTerms) / c.age;
  const heartAge = Math.exp(impliedLogAge);

  return clamp(heartAge, 20, 120);
}

function getRiskLevel(tenYearRiskPercent: number): HeartRiskLevel {
  if (tenYearRiskPercent >= 20) return "High Risk";
  if (tenYearRiskPercent >= 10) return "Moderate Risk";
  return "Low Risk";
}

export function calculateHeartAge(rawInput: HeartAgeInput): HeartAgeResult {
  const input = sanitizeInput(rawInput);

  const linearPredictorValue = linearPredictor(input);
  const risk = riskFromLinearPredictor(input.sex, linearPredictorValue);
  const heartAge = deriveHeartAge(input, linearPredictorValue);

  const tenYearRiskPercent = Math.round(risk * 1000) / 10;

  return {
    tenYearRiskPercent,
    heartAge: Math.round(heartAge),
    ageGapYears: Math.round(heartAge) - Math.round(input.age),
    riskLevel: getRiskLevel(tenYearRiskPercent),
    outsideValidatedAgeRange: rawInput.age < 30 || rawInput.age > 79,
  };
}

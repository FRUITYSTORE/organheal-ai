import type { HeartAgeInput } from "@/lib/heart-age/heart-age.engine";

// Decides which real anatomical structure a member's own risk factors
// actually point to, so the heart-story video's diagram (see
// lib/video-studio/heart-hero-scene.ts) highlights something true about
// THEM instead of a generic heart icon. Two distinct, medically real
// mechanisms, not one invented "risk score":
//
// - Coronary artery disease (plaque/atherosclerosis) is driven by
//   cholesterol, smoking and diabetes.
// - Left ventricular strain/hypertrophy and aortic wall stress are driven
//   by high blood pressure — a mechanically different process (workload,
//   not lipid deposition).
//
// A member can have either, both, or neither — this is intentionally a set
// of independent flags, not a single "primary cause" pick, because the
// underlying biology isn't mutually exclusive.
//
// Thresholds are real published clinical cut-points, not invented:
// - Low HDL / high total cholesterol: NCEP ATP III major-risk-factor
//   definitions (low HDL <40 mg/dL men, <50 mg/dL women; borderline-high
//   total cholesterol >=200 mg/dL).
// - Hypertension: ACC/AHA 2017 guideline, Stage 1 threshold (SBP >=130
//   mmHg) — being treated for blood pressure already implies a clinical
//   hypertension history regardless of today's reading.

export type HeartFocus = {
  coronaryArteries: boolean;
  leftVentricleAndAorta: boolean;
};

const LOW_HDL_MALE = 40;
const LOW_HDL_FEMALE = 50;
const HIGH_TOTAL_CHOLESTEROL = 200;
const HYPERTENSIVE_SYSTOLIC = 130;

function hasLowHdl(input: HeartAgeInput): boolean {
  const threshold = input.sex === "male" ? LOW_HDL_MALE : LOW_HDL_FEMALE;
  return input.hdlCholesterol < threshold;
}

export function deriveHeartFocus(input: HeartAgeInput): HeartFocus {
  const coronaryArteries =
    input.isSmoker ||
    input.hasDiabetes ||
    input.totalCholesterol >= HIGH_TOTAL_CHOLESTEROL ||
    hasLowHdl(input);

  const leftVentricleAndAorta =
    input.onBloodPressureMedication || input.systolicBloodPressure >= HYPERTENSIVE_SYSTOLIC;

  return { coronaryArteries, leftVentricleAndAorta };
}

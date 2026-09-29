import type { HeartAgeInput, HeartAgeResult } from "@/lib/heart-age/heart-age.engine";

// Pure, side-effect-free: turns an already-validated heart age input/result
// pair into the structured text block fed to the "heart-story" explainer
// prompt (lib/health-videos/explainer.ts). Kept separate from
// studio-video.service.ts (which pulls in Supabase/OpenAI at import time) so
// this stays directly unit-testable, and separate from the engine itself so
// the engine has no notion of "text for a prompt".
//
// Always written in English regardless of the viewer's language — this is
// data fed to the model, not something shown to the viewer; the model is
// separately instructed to WRITE its script in the viewer's language.
export function buildHeartStoryContext(
  input: HeartAgeInput,
  result: HeartAgeResult,
  reportText?: string
): string {
  const riskFactors: string[] = [];

  if (input.isSmoker) riskFactors.push("current smoker");
  if (input.hasDiabetes) riskFactors.push("diagnosed with diabetes");

  riskFactors.push(
    `systolic blood pressure ${input.systolicBloodPressure} mmHg${
      input.onBloodPressureMedication ? " (on blood pressure medication)" : " (not on blood pressure medication)"
    }`
  );
  riskFactors.push(`total cholesterol ${input.totalCholesterol} mg/dL`);
  riskFactors.push(`HDL cholesterol ${input.hdlCholesterol} mg/dL`);

  if (!input.isSmoker) riskFactors.push("non-smoker");
  if (!input.hasDiabetes) riskFactors.push("no diagnosed diabetes");

  const lines = [
    "Viewer's own heart age result (already calculated, do not recompute or contradict it):",
    `- Sex: ${input.sex}`,
    `- Chronological age: ${input.age}`,
    `- Calculated heart age: ${result.heartAge}`,
    `- Gap: ${
      result.ageGapYears > 0
        ? `${result.ageGapYears} years OLDER than their actual age`
        : result.ageGapYears < 0
          ? `${Math.abs(result.ageGapYears)} years YOUNGER than their actual age`
          : "the same as their actual age"
    }`,
    `- 10-year cardiovascular risk: ${result.tenYearRiskPercent}%`,
    `- Risk category: ${result.riskLevel}`,
    `- Reported risk factors: ${riskFactors.join(", ")}`,
  ];

  if (reportText && reportText.trim()) {
    lines.push("", "Viewer's own lab report text (optional extra grounding):", '"""', reportText.trim(), '"""');
  }

  return lines.join("\n");
}

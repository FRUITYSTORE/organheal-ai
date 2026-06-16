import type { LabMarkerResult } from "./labMarkerDetector";

export type HealthStrategyResult = {
  healthRisks: string;
  actionPlan90Days: string;
  nutritionStrategy: string;
  followUpPlan: string;
};

export function buildHealthStrategy(
  markers: LabMarkerResult[]
): HealthStrategyResult {
  const abnormal = markers.filter(
    (item) => item.status === "High" || item.status === "Low"
  );

  if (markers.length === 0) {
    return {
      healthRisks:
        "No structured lab risks were clearly detected from this report.",
      actionPlan90Days:
        "Upload a clearer lab report or review the original report with a licensed healthcare professional.",
      nutritionStrategy:
        "Maintain balanced nutrition, hydration, regular activity, and routine preventive follow-up.",
      followUpPlan:
        "Repeat or upload a clearer report if values are not readable. Review any symptoms or concerns with a licensed healthcare professional.",
    };
  }

  const hasBilirubin = abnormal.some((m) => m.marker === "Bilirubin");
  const hasLiver = abnormal.some((m) =>
    ["ALT", "AST", "ALP", "Bilirubin"].includes(m.marker)
  );
  const hasGlucose = abnormal.some((m) =>
    ["Glucose", "HbA1c"].includes(m.marker)
  );
  const hasLipids = abnormal.some((m) =>
    ["LDL", "HDL", "Triglycerides"].includes(m.marker)
  );
  const hasKidney = abnormal.some((m) =>
    ["Creatinine", "Urea"].includes(m.marker)
  );
  const hasThyroid = abnormal.some((m) =>
    ["TSH", "FT4"].includes(m.marker)
  );
  const hasVitaminD = abnormal.some((m) => m.marker === "Vitamin D");

  const risks: string[] = [];
  const actions: string[] = [];
  const nutrition: string[] = [];
  const followUp: string[] = [];

  if (hasLiver || hasBilirubin) {
    risks.push("Possible liver or bile-related marker imbalance based on detected results.");
    actions.push("Avoid alcohol and unnecessary liver-stressing supplements or medications unless approved by a clinician.");
    actions.push("Maintain hydration and monitor symptoms such as yellowing of eyes, dark urine, abdominal pain, or severe fatigue.");
    nutrition.push("Prioritize vegetables, lean protein, whole grains, and reduce fried or highly processed foods.");
    followUp.push("Repeat liver panel including bilirubin, ALT, AST, ALP, and albumin in 4–12 weeks or sooner if symptoms exist.");
  }

  if (hasGlucose) {
    risks.push("Possible blood sugar control concern based on detected glucose-related markers.");
    actions.push("Walk 20–30 minutes most days and reduce sugary drinks and refined carbohydrates.");
    nutrition.push("Use a plate method: half vegetables, quarter protein, quarter whole grains or complex carbohydrates.");
    followUp.push("Repeat fasting glucose and HbA1c as clinically appropriate.");
  }

  if (hasLipids) {
    risks.push("Possible cardiovascular risk pattern based on lipid-related markers.");
    actions.push("Increase weekly physical activity and reduce saturated fats, fried foods, and processed meats.");
    nutrition.push("Increase soluble fiber such as oats, legumes, vegetables, and consider fatty fish if suitable.");
    followUp.push("Repeat lipid profile in 8–12 weeks after lifestyle changes.");
  }

  if (hasKidney) {
    risks.push("Possible kidney function or hydration-related marker concern.");
    actions.push("Maintain hydration and monitor blood pressure regularly if possible.");
    nutrition.push("Avoid excessive salt intake and avoid high-protein extremes unless guided by a clinician.");
    followUp.push("Repeat kidney function tests including creatinine, urea, eGFR, and urine testing if clinically needed.");
  }

  if (hasThyroid) {
    risks.push("Possible thyroid function imbalance based on detected thyroid markers.");
    actions.push("Track symptoms such as fatigue, palpitations, weight change, heat/cold intolerance, or mood changes.");
    nutrition.push("Maintain balanced nutrition and avoid self-starting iodine or thyroid supplements without medical advice.");
    followUp.push("Repeat TSH and FT4 and review with a licensed healthcare professional.");
  }

  if (hasVitaminD) {
    risks.push("Possible vitamin D insufficiency or deficiency pattern.");
    actions.push("Discuss vitamin D supplementation and safe sunlight exposure with a healthcare professional.");
    nutrition.push("Consider vitamin D sources such as fortified foods, eggs, and fatty fish if suitable.");
    followUp.push("Repeat vitamin D level after 8–12 weeks if supplementation is started.");
  }

  if (abnormal.length === 0) {
    return {
      healthRisks:
        "No abnormal marker was detected based on common reference ranges.",
      actionPlan90Days:
        "Continue preventive habits: regular activity, balanced nutrition, hydration, sleep quality, and routine monitoring.",
      nutritionStrategy:
        "Maintain a balanced diet with vegetables, lean protein, whole grains, healthy fats, and reduced processed foods.",
      followUpPlan:
        "Repeat routine labs based on age, risk factors, and healthcare professional advice.",
    };
  }

 return {
  healthRisks: risks.map((item) => `• ${item}`).join("\n"),
  actionPlan90Days: actions.map((item) => `• ${item}`).join("\n"),
  nutritionStrategy: nutrition.map((item) => `• ${item}`).join("\n"),
  followUpPlan: followUp.map((item) => `• ${item}`).join("\n"),
};
}
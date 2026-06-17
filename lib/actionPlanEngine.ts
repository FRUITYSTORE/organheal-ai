export type ActionPlanResult = {
  thisWeek: string[];
  thisMonth: string[];
  next90Days: string[];
};

export function buildActionPlan({
  digitalTwin,
  forecast,
  longitudinalRisk,
  crossSource,
}: any): ActionPlanResult {
  const primarySystem =
    digitalTwin?.primarySystem || crossSource?.primarySystem || "General Health";

  const thisWeek = [
    "Review your latest health intelligence summary.",
    "Track symptoms, energy level, sleep, hydration, and daily wellness.",
  ];

  const thisMonth = [
    "Continue regular assessments and daily check-ins.",
    "Review abnormal findings with a licensed healthcare professional if needed.",
  ];

  const next90Days = [
    "Repeat relevant labs or assessments according to the recommended follow-up window.",
    "Compare new results with previous data to monitor improvement or worsening.",
  ];

  if (primarySystem.toLowerCase().includes("liver")) {
    thisWeek.push("Avoid alcohol and unnecessary liver-stressing supplements or medications unless approved by a clinician.");
    thisMonth.push("Plan follow-up liver-related review if ALT, AST, bilirubin, or albumin remain abnormal.");
    next90Days.push("Aim to improve liver-related markers and reduce metabolic stressors.");
  }

  if (
    primarySystem.toLowerCase().includes("cardio") ||
    primarySystem.toLowerCase().includes("metabolic")
  ) {
    thisWeek.push("Start or maintain light-to-moderate physical activity if safe for you.");
    thisMonth.push("Focus on nutrition quality, saturated fat reduction, weight control, and lipid follow-up.");
    next90Days.push("Target improvement in cholesterol, triglycerides, blood sugar, and cardiovascular risk pattern.");
  }

  if (primarySystem.toLowerCase().includes("kidney")) {
    thisWeek.push("Monitor hydration, blood pressure, and medication exposure.");
    thisMonth.push("Discuss kidney-related markers with a clinician if creatinine, urea, or eGFR are abnormal.");
    next90Days.push("Repeat kidney function and urine-related checks if advised.");
  }

  if (longitudinalRisk?.escalationLevel === "High") {
    thisWeek.push("Prioritize clinical follow-up because longitudinal risk appears elevated.");
  }

  if (forecast?.improvementPotential === "High") {
    next90Days.push("Maintain consistent actions because the forecast suggests meaningful improvement potential.");
  }

  return {
    thisWeek,
    thisMonth,
    next90Days,
  };
}
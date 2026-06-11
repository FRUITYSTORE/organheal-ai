export type OpportunityInput = {
  organ: string;
  score: number;
};

export type HealthOpportunity = {
  organ: string;
  currentScore: number;
  potentialGain: number;
  potentialScore: number;
  priority: "High" | "Moderate" | "Low";
  title: string;
  action: string;
};

function getPotentialGain(score: number) {
  if (score < 50) return 20;
  if (score < 60) return 16;
  if (score < 70) return 12;
  if (score < 80) return 8;
  return 4;
}

function getOpportunityTitle(organ: string) {
  switch (organ) {
    case "Heart":
      return "Improve Heart Health";
    case "Lung":
      return "Improve Lung Health";
    case "Kidney":
      return "Support Kidney Health";
    case "Liver":
      return "Support Liver Health";
    case "Brain":
      return "Improve Sleep & Recovery";
    case "Metabolic":
      return "Improve Metabolic Health";
    default:
      return "Strengthen Preventive Health";
  }
}

function getOpportunityAction(organ: string) {
  switch (organ) {
    case "Heart":
      return "Focus on blood pressure, cholesterol, regular activity, and preventive follow-up.";
    case "Lung":
      return "Reduce smoke or pollution exposure and monitor cough, wheezing, or shortness of breath.";
    case "Kidney":
      return "Monitor hydration, blood pressure, and kidney-related lab markers when needed.";
    case "Liver":
      return "Focus on nutrition, weight control, and reducing liver stressors.";
    case "Brain":
      return "Improve sleep quality, reduce stress, and maintain daily physical activity.";
    case "Metabolic":
      return "Focus on blood sugar control, healthy weight, physical activity, and nutrition.";
    default:
      return "Continue regular tracking and preventive health habits.";
  }
}

export function generateHealthOpportunities(
  inputs: OpportunityInput[]
): HealthOpportunity[] {
  return inputs
    .map((item) => {
      const potentialGain = getPotentialGain(item.score);
      const potentialScore = Math.min(100, item.score + potentialGain);

      const priority: "High" | "Moderate" | "Low" =
  potentialGain >= 15 ? "High" : potentialGain >= 8 ? "Moderate" : "Low";

      return {
        organ: item.organ,
        currentScore: item.score,
        potentialGain,
        potentialScore,
        priority,
        title: getOpportunityTitle(item.organ),
        action: getOpportunityAction(item.organ),
      };
    })
    .sort((a, b) => b.potentialGain - a.potentialGain)
    .slice(0, 3);
}
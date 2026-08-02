export type AssistantIntent =
  | "report"
  | "doctor"
  | "next-step"
  | "risk"
  | "score"
  | "health-age"
  | "improvement"
  | "cause-reasoning"
  | "general";

export type AssistantIntentConfidence =
  | "high"
  | "medium"
  | "low";

export type AssistantIntentDetection = {
  intent: AssistantIntent;
  confidence: AssistantIntentConfidence;
  matchedKeywords: string[];
};
import "server-only";

import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

export type KnowledgeExplanation = {
  title: string;
  reasons: string[];
};

export function buildKnowledgeExplanation(
  intelligence: HealthIntelligenceResult
): KnowledgeExplanation {
  const reasons: string[] = [];

  const priority =
    intelligence.priority.data.priorityOrgan;

  if (priority) {
    reasons.push(
      `${priority} is currently your highest health priority.`
    );
  }

  reasons.push(
    `Your current health pattern is "${intelligence.patterns.data.primaryPattern}".`
  );

  reasons.push(
    "This educational content supports your next recommended health action."
  );

  return {
    title: "Why this recommendation?",
    reasons,
  };
}
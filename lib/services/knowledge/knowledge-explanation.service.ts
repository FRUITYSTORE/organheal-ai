import "server-only";

import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

export type KnowledgeExplanation = {
  title: string;
  reasons: string[];
};
function getPrimaryPatternLabel(
  value: unknown
): string | null {
  if (
    typeof value === "string" &&
    value.trim().length > 0
  ) {
    return value.trim();
  }

  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const pattern =
    value as Record<
      string,
      unknown
    >;

  const candidateKeys = [
    "title",
    "label",
    "name",
    "type",
    "pattern",
  ] as const;

  for (
    const key of candidateKeys
  ) {
    const candidate =
      pattern[key];

    if (
      typeof candidate === "string" &&
      candidate.trim().length > 0
    ) {
      return candidate.trim();
    }
  }

  return null;
}
export function buildKnowledgeExplanation(
  intelligence: HealthIntelligenceResult
): KnowledgeExplanation {
  const reasons: string[] = [];

  const priority =
    intelligence.priority.data.priorityOrgan;
  const primaryPattern =
    getPrimaryPatternLabel(
      intelligence
        .patterns
        .data
        .primaryPattern
    );
  if (priority) {
    reasons.push(
      `${priority} is currently your highest health priority.`
    );
  }

   if (primaryPattern) {
    reasons.push(
      `Your current health pattern is "${primaryPattern}".`
    );
  }

  reasons.push(
    "This educational content supports your next recommended health action."
  );

  return {
    title: "Why this recommendation?",
    reasons,
  };
}
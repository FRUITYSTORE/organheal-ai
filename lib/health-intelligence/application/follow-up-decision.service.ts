import {
  buildDecisionImpact,
  type DecisionImpactData,
} from "@/lib/health-intelligence/engines/decision-impact.engine";

import type {
  NextDecisionData,
} from "@/lib/health-intelligence/engines/next-decision.engine";

import type {
  RecommendationDecision,
} from "@/lib/health-intelligence/engines/recommendation-decision.engine";

import {
  getRecommendationDecisionPolicy,
  type RecommendationDecisionPolicy,
  type RecommendationId,
} from "@/lib/health-intelligence/engines/recommendation-decision-policy";

export type FollowUpPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type FollowUpChannel =
  | "dashboard"
  | "email"
  | "whatsapp"
  | "push";

export type FollowUpSafetyEscalation =
  | "none"
  | "professional-review"
  | "urgent-review";

export type BuildFollowUpDecisionInput = {
  nextDecision:
    NextDecisionData;

  recommendationDecision:
    RecommendationDecision;

  referenceTime?:
    string | Date;
};

export type FollowUpDecision = {
  followUpRequired:
    boolean;

  priority:
    FollowUpPriority;

  recommendedDelayHours:
    number;

  recommendedChannel:
    FollowUpChannel;

  recommendedAction:
    RecommendationId | null;

  fallbackActions:
    RecommendationId[];

  nextClinicalStep:
    NextDecisionData["primary"];

  impact:
    DecisionImpactData;

  recommendationDecision:
    RecommendationDecision;

  recommendationPolicy:
    RecommendationDecisionPolicy;

  safetyEscalation:
    FollowUpSafetyEscalation;

  reason:
    string;

  generatedAt:
    string;
};

function normalizeReferenceTime(
  value:
    string | Date | undefined
): Date {
  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      new Date(
        value
      );

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed;
    }
  }

  return new Date();
}

function resolvePriority(
  decision:
    RecommendationDecision,
  impact:
    DecisionImpactData
): FollowUpPriority {
  if (
    decision.reason ===
      "critical_finding_present" ||
    decision.layer ===
      "emergency"
  ) {
    return "critical";
  }

  /*
   * A stable lifestyle state represents routine continuity,
   * even when the selected action has a high-value impact.
   *
   * Impact magnitude describes the value of the action,
   * not necessarily the urgency of contacting the patient.
   */
  if (
    decision.layer ===
      "lifestyle" &&
    decision.reason ===
      "core_data_available"
  ) {
    return "low";
  }

  if (
    decision.layer ===
      "clinical" ||
    impact
      .primary
      .summary
      .highMagnitudeImpactCount >=
      2
  ) {
    return "high";
  }

  if (
    decision.reason ===
      "follow_up_needed" ||
    decision.layer ===
      "journey" ||
    impact
      .primary
      .summary
      .highMagnitudeImpactCount ===
      1
  ) {
    return "medium";
  }

  return "low";
}

function resolveDelayHours(
  priority:
    FollowUpPriority
): number {
  switch (priority) {
    case "critical":
      return 0;

    case "high":
      return 24;

    case "medium":
      return 72;

    case "low":
      return 168;
  }
}

function resolveChannel(
  priority:
    FollowUpPriority
): FollowUpChannel {
  switch (priority) {
    case "critical":
      return "push";

    case "high":
      return "whatsapp";

    case "medium":
      return "email";

    case "low":
      return "dashboard";
  }
}

function resolveSafetyEscalation(
  decision:
    RecommendationDecision
): FollowUpSafetyEscalation {
  if (
    decision.reason ===
      "critical_finding_present" ||
    decision.layer ===
      "emergency"
  ) {
    return "urgent-review";
  }

  if (
    decision.layer ===
      "clinical"
  ) {
    return "professional-review";
  }

  return "none";
}

function resolveFollowUpRequired(
  decision:
    RecommendationDecision
): boolean {
  return (
    decision.reason !==
      "core_data_available" ||
    decision.layer !==
      "lifestyle"
  );
}

function buildReason({
  decision,
  priority,
  recommendedAction,
}: {
  decision:
    RecommendationDecision;

  priority:
    FollowUpPriority;

  recommendedAction:
    RecommendationId | null;
}): string {
  const actionText =
    recommendedAction ??
    "no-specific-action";

  return [
    `Follow-up priority was resolved as ${priority}.`,
    `The recommendation layer is ${decision.layer}.`,
    `The recommendation reason is ${decision.reason}.`,
    `The preferred follow-up action is ${actionText}.`,
    "This service coordinates existing decision, impact, and recommendation-policy results without recalculating clinical evidence.",
  ].join(
    " "
  );
}

export function buildFollowUpDecision({
  nextDecision,
  recommendationDecision,
  referenceTime,
}: BuildFollowUpDecisionInput):
  FollowUpDecision {
  const impact =
    buildDecisionImpact(
      nextDecision
    );

  const recommendationPolicy =
    getRecommendationDecisionPolicy(
      recommendationDecision
    );

  const priority =
    resolvePriority(
      recommendationDecision,
      impact
    );

  const recommendedAction =
    recommendationPolicy
      .preferredRecommendationIds[0] ??
    recommendationPolicy
      .fallbackRecommendationIds[0] ??
    null;

  const generatedAt =
    normalizeReferenceTime(
      referenceTime
    ).toISOString();

  return {
    followUpRequired:
      resolveFollowUpRequired(
        recommendationDecision
      ),

    priority,

    recommendedDelayHours:
      resolveDelayHours(
        priority
      ),

    recommendedChannel:
      resolveChannel(
        priority
      ),

    recommendedAction,

    fallbackActions: [
      ...recommendationPolicy
        .fallbackRecommendationIds,
    ],

    nextClinicalStep:
      nextDecision.primary,

    impact,

    recommendationDecision,

    recommendationPolicy,

    safetyEscalation:
      resolveSafetyEscalation(
        recommendationDecision
      ),

    reason:
      buildReason({
        decision:
          recommendationDecision,

        priority,

        recommendedAction,
      }),

    generatedAt,
  };
}
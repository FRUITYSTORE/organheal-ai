import type {
  RecommendationDecision,
  RecommendationDecisionLayer,
  RecommendationDecisionReason,
} from "@/lib/health-intelligence/engines/recommendation-decision.engine";

export type RecommendationId =
  | "complete-assessment"
  | "monitor-priority-area"
  | "upload-report"
  | "analyze-report"
  | "compare-latest-reports"
  | "complete-checkin"
  | "repeat-checkin"
  | "professional-review"
  | "maintain-healthy-routine"
  | "review-health-plan";

export type RecommendationDecisionPolicy = {
  preferredRecommendationIds:
    RecommendationId[];

  fallbackRecommendationIds:
    RecommendationId[];
};

const DEFAULT_FALLBACK_IDS:
  RecommendationId[] = [
    "review-health-plan",
    "monitor-priority-area",
    "maintain-healthy-routine",
  ];

const LAYER_POLICIES:
  Record<
    RecommendationDecisionLayer,
    RecommendationDecisionPolicy
  > = {
    emergency: {
      preferredRecommendationIds: [
        "professional-review",
      ],

      fallbackRecommendationIds: [
        "monitor-priority-area",
        "review-health-plan",
      ],
    },

   clinical: {
  preferredRecommendationIds: [
    "compare-latest-reports",
    "analyze-report",
    "monitor-priority-area",
  ],

  fallbackRecommendationIds: [
    "repeat-checkin",
    "review-health-plan",
  ],
},

    journey: {
      preferredRecommendationIds: [
        "repeat-checkin",
        "complete-checkin",
      ],

      fallbackRecommendationIds: [
        "monitor-priority-area",
        "review-health-plan",
      ],
    },

    data: {
      preferredRecommendationIds: [
        "complete-assessment",
        "upload-report",
        "analyze-report",
      ],

      fallbackRecommendationIds: [
        "complete-checkin",
        "review-health-plan",
      ],
    },

    lifestyle: {
      preferredRecommendationIds: [
        "maintain-healthy-routine",
        "monitor-priority-area",
      ],

      fallbackRecommendationIds:
        DEFAULT_FALLBACK_IDS,
    },
  };

const REASON_OVERRIDES:
  Partial<
    Record<
      RecommendationDecisionReason,
      RecommendationDecisionPolicy
    >
  > = {
    critical_finding_present: {
      preferredRecommendationIds: [
        "professional-review",
      ],

      fallbackRecommendationIds: [
        "monitor-priority-area",
        "review-health-plan",
      ],
    },

    missing_assessment: {
      preferredRecommendationIds: [
        "complete-assessment",
      ],

      fallbackRecommendationIds: [
        "complete-checkin",
        "upload-report",
      ],
    },

    missing_report: {
      preferredRecommendationIds: [
        "upload-report",
      ],

      fallbackRecommendationIds: [
        "complete-checkin",
        "monitor-priority-area",
      ],
    },

    report_analysis_needed: {
      preferredRecommendationIds: [
        "analyze-report",
      ],

      fallbackRecommendationIds: [
        "monitor-priority-area",
        "repeat-checkin",
      ],
    },

    follow_up_needed: {
      preferredRecommendationIds: [
        "repeat-checkin",
        "complete-checkin",
      ],

      fallbackRecommendationIds: [
        "monitor-priority-area",
        "review-health-plan",
      ],
    },

    core_data_available: {
      preferredRecommendationIds: [
        "maintain-healthy-routine",
        "monitor-priority-area",
      ],

      fallbackRecommendationIds:
        DEFAULT_FALLBACK_IDS,
    },
  };

export function getRecommendationDecisionPolicy(
  decision: RecommendationDecision
): RecommendationDecisionPolicy {
  return (
    REASON_OVERRIDES[
      decision.reason
    ] ??
    LAYER_POLICIES[
      decision.layer
    ]
  );
}
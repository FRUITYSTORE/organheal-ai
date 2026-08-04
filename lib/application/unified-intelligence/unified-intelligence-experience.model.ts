import type {
  PatientClinicalDirection,
  PatientClinicalDirectionConfidence,
  PatientClinicalDirectionSignal,
} from "@/lib/application/clinical/patient-clinical-direction.service";

import type {
  PatientJourneySnapshot,
} from "@/lib/application/journey/patient-journey-snapshot.service";

import type {
  HealthStoryData,
} from "@/lib/health-intelligence/engines/health-story.engine";

import type {
  HealthRecommendation,
  RecommendationCategory,
  RecommendationPriority,
} from "@/lib/health-intelligence/engines/recommendation.engine";

import type {
  RecommendationDecisionLayer,
  RecommendationDecisionReason,
} from "@/lib/health-intelligence/engines/recommendation-decision.engine";

import type {
  HealthScoreData,
} from "@/lib/health-intelligence/engines/health-score.engine";

import type {
  EngineStatus,
} from "@/lib/health-intelligence/models/engine-result";

export type UnifiedIntelligenceExperienceModel = {
  generatedAt:
    string;

  status:
    EngineStatus;

  story: {
    headline:
      string;

    narrative:
      string;

    tone:
      HealthStoryData["tone"];

    confidence:
      HealthStoryData["confidence"];

    confidenceScore:
      number;

    priorityMessage:
      string | null;

    strongestMessage:
      string | null;

    progressMessage:
      string | null;

    evidenceMessage:
      string;

    nextDecision:
      HealthStoryData["nextDecision"];

    supportingSignals:
      HealthStoryData["supportingSignals"];
  };

  decision: {
    layer:
      RecommendationDecisionLayer;

    reason:
      RecommendationDecisionReason;
  };

  primaryAction: {
    id:
      HealthRecommendation["id"];

    title:
      string;

    description:
      string;

    href:
      string;

    category:
      RecommendationCategory;

    priority:
      RecommendationPriority;

    score:
      number;

    reasons:
      string[];
  };

  healthScore: {
    score:
      number;

    level:
      HealthScoreData["level"];

    confidence:
      number;

    dataCompleteness:
      number;

    summary:
      string;
  };

  journey: {
    followUpStatus:
      PatientJourneySnapshot[
        "followUpStatus"
      ];

    lastMeaningfulUpdate:
      PatientJourneySnapshot[
        "lastMeaningfulUpdate"
      ];
  };

  clinical: {
    direction:
      PatientClinicalDirection;

    confidence:
      PatientClinicalDirectionConfidence;

    canConfirmClinicalDirection:
      false;

    supportingSignals:
      PatientClinicalDirectionSignal[];

    contradictingSignals:
      PatientClinicalDirectionSignal[];

    limitations:
      string[];
  };

  review: {
    nextReviewDays:
      number;
  };
};
import {
  emergencyDecisionProvider,
} from "@/lib/health-intelligence/engines/recommendation-decision-providers/emergency-decision.provider";

import {
  clinicalDecisionProvider,
} from "@/lib/health-intelligence/engines/recommendation-decision-providers/clinical-decision.provider";

import {
  dataDecisionProvider,
} from "@/lib/health-intelligence/engines/recommendation-decision-providers/data-decision.provider";

import {
  journeyDecisionProvider,
} from "@/lib/health-intelligence/engines/recommendation-decision-providers/journey-decision.provider";

import {
  lifestyleDecisionProvider,
} from "@/lib/health-intelligence/engines/recommendation-decision-providers/lifestyle-decision.provider";

import type {
  RecommendationDecisionProvider,
} from "@/lib/health-intelligence/engines/recommendation-decision-providers/recommendation-decision-provider.types";

export const recommendationDecisionProviders:
  RecommendationDecisionProvider[] = [
    emergencyDecisionProvider,
    clinicalDecisionProvider,
    dataDecisionProvider,
    journeyDecisionProvider,
    lifestyleDecisionProvider,
  ];
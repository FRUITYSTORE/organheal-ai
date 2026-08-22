import type {
  RecommendationDecision,
} from "@/lib/health-intelligence/engines/recommendation-decision.engine";

import type {
  NextDecisionData,
} from "@/lib/health-intelligence/engines/next-decision.engine";

import {
  buildFollowUpDecision,
  type FollowUpDecision,
} from "@/lib/health-intelligence/application/follow-up-decision.service";

import {
  buildFollowUpMessage,
  type FollowUpMessage,
  type FollowUpMessageLanguage,
} from "@/lib/health-intelligence/application/follow-up-message.service";

import {
  buildFollowUpDispatchPlan,
  type FollowUpDispatchPlan,
} from "@/lib/health-intelligence/application/follow-up-dispatch.service";

import {
  buildFollowUpDeliveryEnvelope,
  type FollowUpDeliveryEnvelope,
} from "@/lib/health-intelligence/application/follow-up-dispatch-adapter.service";

export type BuildFollowUpRuntimeInput = {
  userId:
    string;

  nextDecision:
    NextDecisionData;

  recommendationDecision:
    RecommendationDecision;

  language?:
    FollowUpMessageLanguage;

  requestId?:
    string | null;

  referenceTime?:
    string | Date;
};

export type FollowUpRuntimeResult = {
  decision:
    FollowUpDecision;

  message:
    FollowUpMessage;

  dispatchPlan:
    FollowUpDispatchPlan;

  deliveryEnvelope:
    FollowUpDeliveryEnvelope;
};

export function buildFollowUpRuntime({
  userId,
  nextDecision,
  recommendationDecision,
  language = "en",
  requestId = null,
  referenceTime,
}: BuildFollowUpRuntimeInput):
  FollowUpRuntimeResult {
  const decision =
    buildFollowUpDecision({
      nextDecision,
      recommendationDecision,
      referenceTime,
    });

  const message =
    buildFollowUpMessage({
      decision,
      language,
      referenceTime,
    });

  const dispatchPlan =
    buildFollowUpDispatchPlan({
      userId,
      message,
      followUpRequired:
        decision.followUpRequired,
      requestId,
      referenceTime,
    });

  const deliveryEnvelope =
    buildFollowUpDeliveryEnvelope({
      plan:
        dispatchPlan,

      referenceTime,
    });

  return {
    decision,
    message,
    dispatchPlan,
    deliveryEnvelope,
  };
}
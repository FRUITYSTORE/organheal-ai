import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

import {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import {
  buildHealthRuntime,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime.builder";

import {
  buildFollowUpRuntime,
  type FollowUpRuntimeResult,
} from "@/lib/health-intelligence/application/follow-up-runtime.service";

import {
  BackgroundJobService,
} from "@/lib/jobs/background-job.service";

import type {
  EnqueueBackgroundJobResult,
} from "@/lib/jobs/background-job.repository";

import type {
  FollowUpMessageLanguage,
} from "@/lib/health-intelligence/application/follow-up-message.service";

export type ExecuteAuthenticatedFollowUpInput = {
  userId:
    string;

  client:
    SupabaseClient;

  language?:
    FollowUpMessageLanguage;

  requestId?:
    string | null;

  referenceTime?:
    string | Date;
};

export type ExecuteAuthenticatedFollowUpResult = {
  followUp:
    FollowUpRuntimeResult;

  enqueueResult:
    EnqueueBackgroundJobResult | null;
};

function requireUserId(
  value:
    string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "A valid user ID is required to execute the authenticated follow-up runtime."
    );
  }

  return normalized;
}

export async function executeAuthenticatedFollowUp({
  userId,
  client,
  language = "en",
  requestId = null,
  referenceTime,
}: ExecuteAuthenticatedFollowUpInput):
  Promise<
    ExecuteAuthenticatedFollowUpResult
  > {
  const normalizedUserId =
    requireUserId(
      userId
    );

  /*
   * Load the authenticated user's health state once.
   * The trusted server client is explicitly supplied
   * so this orchestration does not depend on the
   * browser Supabase singleton.
   */
  const patient =
    await getPatientSummary(
      normalizedUserId,
      client
    );

  /*
   * Build health intelligence once and reuse it
   * throughout this orchestration.
   */
  const intelligence =
    buildHealthIntelligence(
      patient
    );

  /*
   * The health runtime is the canonical source for
   * the next decision. Passing patient and intelligence
   * prevents duplicate loading and duplicate intelligence
   * generation.
   */
  const healthRuntime =
    await buildHealthRuntime({
      userId:
        normalizedUserId,

      patient,

      intelligence,

      language,
    });

  const nextDecisionModule =
    healthRuntime
      .modules
      .nextDecision;

  if (
    nextDecisionModule.status !==
      "ready" ||
    !nextDecisionModule.data
  ) {
    throw new Error(
      "The health runtime did not produce a ready next decision."
    );
  }

  /*
   * RecommendationData already records the exact
   * recommendation decision selected by the
   * recommendation engine. Reconstructing the small
   * decision contract here avoids running that engine
   * a second time.
   */
  const recommendationDecision = {
    layer:
      intelligence
        .recommendations
        .data
        .decisionLayer,

    reason:
      intelligence
        .recommendations
        .data
        .decisionReason,
  };

  const followUp =
    buildFollowUpRuntime({
      userId:
        normalizedUserId,

      nextDecision:
        nextDecisionModule.data,

      recommendationDecision,

      language,

      requestId,

      referenceTime,
    });

  if (
    !followUp
      .deliveryEnvelope
      .enqueue
  ) {
    return {
      followUp,

      enqueueResult:
        null,
    };
  }

  const backgroundJobService =
    new BackgroundJobService(
      client
    );

  const enqueueResult =
    await backgroundJobService
      .enqueueFollowUpDelivery({
        envelope:
          followUp
            .deliveryEnvelope,
      });

  return {
    followUp,

    enqueueResult,
  };
}
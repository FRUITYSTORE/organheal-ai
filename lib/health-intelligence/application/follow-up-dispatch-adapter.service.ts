import type {
  FollowUpDispatchPayload,
  FollowUpDispatchPlan,
  FollowUpDispatchStatus,
} from "@/lib/health-intelligence/application/follow-up-dispatch.service";

export const FOLLOW_UP_DELIVERY_TYPE =
  "follow-up-delivery" as const;

export type FollowUpDeliveryType =
  typeof FOLLOW_UP_DELIVERY_TYPE;

export type FollowUpDeliveryEnvelopeStatus =
  | "ready"
  | "not-enqueueable";

export type FollowUpDeliveryAuditMetadata = {
  source:
    "follow-up-dispatch-adapter";

  dispatchStatus:
    FollowUpDispatchStatus;

  purpose:
    FollowUpDispatchPlan[
      "auditMetadata"
    ]["purpose"];

  language:
    FollowUpDispatchPlan[
      "auditMetadata"
    ]["language"];

  messageGeneratedAt:
    string;

  dispatchPlanGeneratedAt:
    string;

  envelopeGeneratedAt:
    string;
};

export type FollowUpDeliveryEnvelope = {
  enqueue:
    boolean;

  status:
    FollowUpDeliveryEnvelopeStatus;

  type:
    FollowUpDeliveryType;

  userId:
    string | null;

  requestId:
    string | null;

  availableAt:
    string | null;

  idempotencyKey:
    string | null;

  payload:
    FollowUpDispatchPayload | null;

  maxAttempts:
    number;

  retryDelaysMinutes:
    number[];

  auditMetadata:
    FollowUpDeliveryAuditMetadata;

  reason:
    string;

  generatedAt:
    string;
};

export type BuildFollowUpDeliveryEnvelopeInput = {
  plan:
    FollowUpDispatchPlan;

  referenceTime?:
    string | Date;
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

function resolveUserId(
  payload:
    FollowUpDispatchPayload | null
): string | null {
  if (
    !payload ||
    typeof payload.userId !==
      "string" ||
    !payload.userId.trim()
  ) {
    return null;
  }

  return payload.userId.trim();
}

function createAuditMetadata({
  plan,
  generatedAt,
}: {
  plan:
    FollowUpDispatchPlan;

  generatedAt:
    string;
}): FollowUpDeliveryAuditMetadata {
  return {
    source:
      "follow-up-dispatch-adapter",

    dispatchStatus:
      plan.status,

    purpose:
      plan
        .auditMetadata
        .purpose,

    language:
      plan
        .auditMetadata
        .language,

    messageGeneratedAt:
      plan
        .auditMetadata
        .messageGeneratedAt,

    dispatchPlanGeneratedAt:
      plan.generatedAt,

    envelopeGeneratedAt:
      generatedAt,
  };
}

function createUnavailableEnvelope({
  plan,
  generatedAt,
  reason,
}: {
  plan:
    FollowUpDispatchPlan;

  generatedAt:
    string;

  reason:
    string;
}): FollowUpDeliveryEnvelope {
  return {
    enqueue:
      false,

    status:
      "not-enqueueable",

    type:
      FOLLOW_UP_DELIVERY_TYPE,

    userId:
      resolveUserId(
        plan.payload
      ),

    requestId:
      plan.requestId,

    availableAt:
      null,

    idempotencyKey:
      null,

    payload:
      null,

    maxAttempts:
      0,

    retryDelaysMinutes:
      [],

    auditMetadata:
      createAuditMetadata({
        plan,

        generatedAt,
      }),

    reason,

    generatedAt,
  };
}

export function buildFollowUpDeliveryEnvelope({
  plan,
  referenceTime,
}: BuildFollowUpDeliveryEnvelopeInput):
  FollowUpDeliveryEnvelope {
  const generatedAt =
    normalizeReferenceTime(
      referenceTime
    ).toISOString();

  if (
    !plan.shouldDispatch ||
    plan.status !==
      "ready"
  ) {
    return createUnavailableEnvelope({
      plan,

      generatedAt,

      reason:
        "The follow-up dispatch plan is not ready for enqueueing.",
    });
  }

  if (
    !plan.payload
  ) {
    return createUnavailableEnvelope({
      plan,

      generatedAt,

      reason:
        "The follow-up dispatch plan does not contain a delivery payload.",
    });
  }

  const userId =
    resolveUserId(
      plan.payload
    );

  if (!userId) {
    return createUnavailableEnvelope({
      plan,

      generatedAt,

      reason:
        "The follow-up delivery payload does not contain a valid user identifier.",
    });
  }

  if (
    !plan.dispatchAt ||
    Number.isNaN(
      new Date(
        plan.dispatchAt
      ).getTime()
    )
  ) {
    return createUnavailableEnvelope({
      plan,

      generatedAt,

      reason:
        "The follow-up dispatch plan does not contain a valid dispatch time.",
    });
  }

  if (
    !plan.deduplicationKey
      ?.trim()
  ) {
    return createUnavailableEnvelope({
      plan,

      generatedAt,

      reason:
        "The follow-up dispatch plan does not contain an idempotency key.",
    });
  }

  return {
    enqueue:
      true,

    status:
      "ready",

    type:
      FOLLOW_UP_DELIVERY_TYPE,

    userId,

    requestId:
      plan.requestId,

    availableAt:
      plan.dispatchAt,

    idempotencyKey:
      plan
        .deduplicationKey,

    payload: {
      ...plan.payload,

      userId,
    },

    maxAttempts:
      plan.maxAttempts,

    retryDelaysMinutes: [
      ...plan
        .retryDelaysMinutes,
    ],

    auditMetadata:
      createAuditMetadata({
        plan,

        generatedAt,
      }),

    reason:
      "The follow-up dispatch plan was converted into a queue-neutral delivery envelope without creating or enqueueing a background job.",

    generatedAt,
  };
}
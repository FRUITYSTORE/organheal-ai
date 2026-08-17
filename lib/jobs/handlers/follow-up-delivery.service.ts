import {
  logApiInfo,
} from "@/lib/api/api-logger";

import type {
  FollowUpDeliveryJobPayload,
} from "@/lib/jobs/background-job.service";

export type FollowUpDeliveryExecutionResult = {
  delivered:
    boolean;

  dryRun:
    true;

  channel:
    FollowUpDeliveryJobPayload[
      "delivery"
    ]["channel"];

  userId:
    string;

  idempotencyKey:
    string;

  reason:
    string;

  executedAt:
    string;
};

export type ExecuteFollowUpDeliveryInput = {
  jobId:
    string;

  requestId:
    string | null;

  userId:
    string;

  payload:
    FollowUpDeliveryJobPayload;

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

function requireText(
  value:
    string,
  fieldName:
    string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required for follow-up delivery.`
    );
  }

  return normalized;
}

export async function executeFollowUpDelivery({
  jobId,
  requestId,
  userId,
  payload,
  referenceTime,
}: ExecuteFollowUpDeliveryInput):
  Promise<
    FollowUpDeliveryExecutionResult
  > {
  const normalizedJobId =
    requireText(
      jobId,
      "Job ID"
    );

  const normalizedUserId =
    requireText(
      userId,
      "User ID"
    );

  const idempotencyKey =
    requireText(
      payload.idempotencyKey,
      "Idempotency key"
    );

  const deliveryUserId =
    requireText(
      payload.delivery.userId,
      "Delivery user ID"
    );

  if (
    deliveryUserId !==
      normalizedUserId
  ) {
    throw new Error(
      "Follow-up delivery user ID does not match the background job user ID."
    );
  }

  const title =
    requireText(
      payload.delivery.title,
      "Delivery title"
    );

  const body =
    requireText(
      payload.delivery.body,
      "Delivery body"
    );

  const executedAt =
    normalizeReferenceTime(
      referenceTime
    ).toISOString();

  /*
   * Dry-run delivery:
   *
   * The durable job pipeline is now exercised end to end,
   * but no external channel provider is called yet.
   *
   * A real channel adapter will replace this audit-only
   * execution in a later scoped integration step.
   */
  logApiInfo(
    "follow_up_delivery.dry_run_completed",
    {
      route:
        "background-worker",

      requestId,

      jobId:
        normalizedJobId,

      userId:
        normalizedUserId,

      channel:
        payload.delivery.channel,

      priority:
        payload.delivery.priority,

      purpose:
        payload.delivery.purpose,

      language:
        payload.delivery.language,

      idempotencyKey,

      requiresImmediateDelivery:
        payload
          .delivery
          .requiresImmediateDelivery,

      hasAction:
        Boolean(
          payload
            .delivery
            .actionHref
        ),

      hasSafetyNote:
        Boolean(
          payload
            .delivery
            .safetyNote
        ),

      titleLength:
        title.length,

      bodyLength:
        body.length,

      executedAt,
    }
  );

  return {
    delivered:
      false,

    dryRun:
      true,

    channel:
      payload.delivery.channel,

    userId:
      normalizedUserId,

    idempotencyKey,

    reason:
      "The follow-up delivery job was validated and audited successfully. External channel delivery remains disabled in this dry-run implementation.",

    executedAt,
  };
}
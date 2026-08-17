import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

import type {
  JobHandler,
} from "@/lib/jobs/job-handler";

import type {
  DurableBackgroundJob,
} from "@/lib/jobs/background-job-worker.repository";

import type {
  FollowUpDeliveryJobPayload,
} from "@/lib/jobs/background-job.service";

import {
  createAndSaveNotification,
} from "@/lib/notifications/notification.service";

import {
  executeFollowUpDelivery,
} from "@/lib/jobs/handlers/follow-up-delivery.service";

const VALID_CHANNELS =
  new Set([
    "dashboard",
    "email",
    "whatsapp",
    "push",
  ]);

const VALID_LANGUAGES =
  new Set([
    "en",
    "ar",
  ]);

const VALID_PRIORITIES =
  new Set([
    "low",
    "medium",
    "high",
    "critical",
  ]);

function isRecord(
  value:
    unknown
): value is
  Record<
    string,
    unknown
  > {
  return Boolean(
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  );
}

function isNonEmptyString(
  value:
    unknown
): value is string {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  );
}

function isNullableString(
  value:
    unknown
): value is
  string | null {
  return (
    value === null ||
    typeof value ===
      "string"
  );
}

function isFollowUpDeliveryPayload(
  value:
    unknown
): value is
  FollowUpDeliveryJobPayload {
  if (!isRecord(value)) {
    return false;
  }

  const delivery =
    value.delivery;

  const auditMetadata =
    value.auditMetadata;

  if (
    !isRecord(delivery) ||
    !isRecord(auditMetadata)
  ) {
    return false;
  }

  if (
    !isNonEmptyString(
      value.idempotencyKey
    ) ||
    !Array.isArray(
      value.retryDelaysMinutes
    ) ||
    !value
      .retryDelaysMinutes
      .every(
        (delay) =>
          typeof delay ===
            "number" &&
          Number.isFinite(
            delay
          ) &&
          delay >=
            0
      )
  ) {
    return false;
  }

  return (
    isNonEmptyString(
      delivery.userId
    ) &&
    typeof delivery.channel ===
      "string" &&
    VALID_CHANNELS.has(
      delivery.channel
    ) &&
    typeof delivery.language ===
      "string" &&
    VALID_LANGUAGES.has(
      delivery.language
    ) &&
    typeof delivery.priority ===
      "string" &&
    VALID_PRIORITIES.has(
      delivery.priority
    ) &&
    isNonEmptyString(
      delivery.purpose
    ) &&
    isNonEmptyString(
      delivery.title
    ) &&
    isNonEmptyString(
      delivery.body
    ) &&
    isNullableString(
      delivery.actionLabel
    ) &&
    isNullableString(
      delivery.actionHref
    ) &&
    isNullableString(
      delivery.safetyNote
    ) &&
    typeof delivery
      .requiresImmediateDelivery ===
      "boolean" &&
    isNonEmptyString(
      auditMetadata.source
    ) &&
    isNonEmptyString(
      auditMetadata.dispatchStatus
    ) &&
    isNonEmptyString(
      auditMetadata.purpose
    ) &&
    isNonEmptyString(
      auditMetadata.language
    ) &&
    isNonEmptyString(
      auditMetadata.messageGeneratedAt
    ) &&
    isNonEmptyString(
      auditMetadata.dispatchPlanGeneratedAt
    ) &&
    isNonEmptyString(
      auditMetadata.envelopeGeneratedAt
    )
  );
}

function resolveNotificationChannels(
  channel:
    FollowUpDeliveryJobPayload[
      "delivery"
    ]["channel"]
): FollowUpDeliveryJobPayload[
  "delivery"
]["channel"][] {
  if (
    channel ===
      "dashboard"
  ) {
    return [
      "dashboard",
    ];
  }

  return [
    "dashboard",
    channel,
  ];
}

function resolveNotificationAction(
  payload:
    FollowUpDeliveryJobPayload
) {
  const {
    actionLabel,
    actionHref,
  } = payload.delivery;

  if (
    !actionLabel ||
    !actionHref
  ) {
    return null;
  }

  return {
    label:
      actionLabel,

    href:
      actionHref,
  };
}

function resolveNotificationSafety(
  payload:
    FollowUpDeliveryJobPayload
) {
  const {
    purpose,
    safetyNote,
  } = payload.delivery;

  if (!safetyNote) {
    return null;
  }

  return {
    note:
      safetyNote,

    requiresProfessionalReview:
      purpose ===
        "professional-review" ||
      purpose ===
        "urgent-review",

    requiresUrgentReview:
      purpose ===
        "urgent-review",
  };
}

export function createFollowUpDeliveryHandler(
  client:
    SupabaseClient =
      getSupabaseAdminClient()
): JobHandler {
  return async (
    backgroundJob
  ): Promise<void> => {
    const job =
      backgroundJob as
        DurableBackgroundJob;

    if (
      typeof job.userId !==
        "string" ||
      !job.userId.trim()
    ) {
      throw new Error(
        "Follow-up delivery job is missing the user ID."
      );
    }

    if (
      !isFollowUpDeliveryPayload(
        job.payload
      )
    ) {
      throw new Error(
        "Follow-up delivery job payload is invalid."
      );
    }

    const payload =
      job.payload;

    await createAndSaveNotification({
      client,

      userId:
        job.userId,

      purpose:
        payload.delivery.purpose,

      priority:
        payload.delivery.priority,

      channels:
        resolveNotificationChannels(
          payload.delivery.channel
        ),

      title:
        payload.delivery.title,

      body:
        payload.delivery.body,

      action:
        resolveNotificationAction(
          payload
        ),

      safety:
        resolveNotificationSafety(
          payload
        ),

      source:
        "follow-up-delivery",

      sourceReferenceId:
        job.id,

      idempotencyKey:
        payload.idempotencyKey,
    });

    await executeFollowUpDelivery({
      jobId:
        job.id,

      requestId:
        job.requestId,

      userId:
        job.userId,

      payload,
    });
  };
}
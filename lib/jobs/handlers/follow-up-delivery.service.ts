import {
  logApiInfo,
} from "@/lib/api/api-logger";

import type {
  FollowUpDeliveryJobPayload,
} from "@/lib/jobs/background-job.service";

import type {
  CommunicationPreferences,
} from "@/lib/repositories/communication-preferences.repository";

import {
  buildWhatsAppFollowUpTemplate,
} from "@/lib/communication/whatsapp-follow-up-template.service";

import {
  sendWhatsAppTemplate,
  type SendWhatsAppTemplateInput,
  type WhatsAppCloudSendResult,
} from "@/lib/communication/whatsapp-cloud.provider";

type FollowUpChannel =
  FollowUpDeliveryJobPayload[
    "delivery"
  ]["channel"];

export type FollowUpDeliveryExecutionResult = {
  delivered:
    boolean;

  dryRun:
  boolean;

providerMessageId:
  string | null;

  channel:
    FollowUpChannel;

  userId:
    string;

  idempotencyKey:
    string;

  reason:
    string;

  executedAt:
    string;
};

export type FollowUpPreferencesLoader =
  (
    userId:
      string
  ) =>
    Promise<
      CommunicationPreferences | null
    >;

export type WhatsAppTemplateSender =
  (
    input:
      SendWhatsAppTemplateInput
  ) =>
    Promise<
      WhatsAppCloudSendResult
    >;

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

  loadCommunicationPreferences?:
    FollowUpPreferencesLoader;
    sendWhatsApp?:
  WhatsAppTemplateSender;
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

function hasActiveConsent(
  grantedAt:
    string | null,
  revokedAt:
    string | null
): boolean {
  if (!grantedAt) {
    return false;
  }

  if (!revokedAt) {
    return true;
  }

  const grantedTime =
    new Date(
      grantedAt
    ).getTime();

  const revokedTime =
    new Date(
      revokedAt
    ).getTime();

  if (
    Number.isNaN(
      grantedTime
    ) ||
    Number.isNaN(
      revokedTime
    )
  ) {
    return false;
  }

  return (
    grantedTime >
    revokedTime
  );
}

function isChannelAuthorized(
  channel:
    FollowUpChannel,
  preferences:
    CommunicationPreferences
): boolean {
  switch (channel) {
    case "dashboard":
      return (
        preferences
          .dashboard_enabled
      );

    case "email":
      return (
        preferences
          .email_enabled &&
        hasActiveConsent(
          preferences
            .email_consent_granted_at,
          preferences
            .email_consent_revoked_at
        )
      );

    case "whatsapp":
      return (
        preferences
          .whatsapp_enabled &&
        Boolean(
          preferences
            .whatsapp_phone_e164
            ?.trim()
        ) &&
        Boolean(
          preferences
            .whatsapp_phone_verified_at
        ) &&
        hasActiveConsent(
          preferences
            .whatsapp_consent_granted_at,
          preferences
            .whatsapp_consent_revoked_at
        )
      );

    case "push":
      return (
        preferences
          .push_enabled &&
        hasActiveConsent(
          preferences
            .push_consent_granted_at,
          preferences
            .push_consent_revoked_at
        )
      );
  }
}

export async function executeFollowUpDelivery({
  jobId,
  requestId,
  userId,
  payload,
    referenceTime,
  loadCommunicationPreferences,
  sendWhatsApp =
    sendWhatsAppTemplate,
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
   * Communication preferences are intentionally
   * dependency-injected here.
   *
   * This keeps the delivery service independent
   * from a specific Supabase client and allows the
   * background worker to supply its trusted server
   * repository implementation.
   */

  let communicationPreferences:
  CommunicationPreferences | null =
    null;
  if (
    loadCommunicationPreferences
  ) {
    const preferences =
  await loadCommunicationPreferences(
    normalizedUserId
  );

communicationPreferences =
  preferences;

    if (!preferences) {
      logApiInfo(
        "follow_up_delivery.channel_blocked",
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

          reason:
            "communication-preferences-unavailable",

          executedAt,
        }
      );

      return {
        delivered:
          false,

        dryRun:
          true,

        providerMessageId:
          null,

        channel:
          payload.delivery.channel,

        userId:
          normalizedUserId,

        idempotencyKey,

        reason:
          "Delivery was blocked because communication preferences are unavailable.",

        executedAt,
      };
    }

    if (
      !isChannelAuthorized(
        payload.delivery.channel,
        preferences
      )
    ) {
      logApiInfo(
        "follow_up_delivery.channel_blocked",
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

          reason:
            "channel-not-authorized",

          executedAt,
        }
      );

      return {
        delivered:
          false,

        dryRun:
          true,

        providerMessageId:
          null,
        channel:
          payload.delivery.channel,

        userId:
          normalizedUserId,

        idempotencyKey,

        reason:
          "Delivery was blocked because the selected communication channel is not enabled and consented.",

        executedAt,
      };
    }
  }

  const whatsappDeliveryEnabled =
  process.env
    .WHATSAPP_DELIVERY_ENABLED ===
  "true";

if (
  payload.delivery.channel ===
    "whatsapp" &&
  whatsappDeliveryEnabled &&
  communicationPreferences
) {
  const whatsappPhone =
    communicationPreferences
      .whatsapp_phone_e164;

  if (!whatsappPhone) {
    throw new Error(
      "Authorized WhatsApp delivery is missing a destination phone number."
    );
  }

  const template =
    buildWhatsAppFollowUpTemplate(
      payload
    );

  const providerResult =
    await sendWhatsApp({
      to:
        whatsappPhone,

      templateName:
        template.templateName,

      language:
        template.language,

      parameters:
        template.parameters,
    });

  logApiInfo(
    "follow_up_delivery.whatsapp_completed",
    {
      route:
        "background-worker",

      requestId,

      jobId:
        normalizedJobId,

      userId:
        normalizedUserId,

      channel:
        "whatsapp",

      priority:
        payload.delivery.priority,

      purpose:
        payload.delivery.purpose,

      language:
        payload.delivery.language,

      idempotencyKey,

      providerMessageId:
        providerResult.messageId,

      templateName:
        template.templateName,

      executedAt,
    }
  );

  return {
    delivered:
      true,

    dryRun:
      false,

    providerMessageId:
      providerResult.messageId,

    channel:
      "whatsapp",

    userId:
      normalizedUserId,

    idempotencyKey,

    reason:
      "The WhatsApp follow-up message was accepted by the configured provider.",

    executedAt,
  };
}

  /*
   * Dry-run delivery:
   *
   * The durable job pipeline is exercised end to end,
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

      communicationPreferencesChecked:
        Boolean(
          loadCommunicationPreferences
        ),

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

    providerMessageId:
      null,

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
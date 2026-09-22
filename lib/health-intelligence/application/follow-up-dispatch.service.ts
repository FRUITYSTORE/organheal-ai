import type {
  FollowUpChannel,
  FollowUpPriority,
} from "@/lib/health-intelligence/application/follow-up-decision.service";

import type {
  FollowUpMessage,
  FollowUpMessagePurpose,
} from "@/lib/health-intelligence/application/follow-up-message.service";

export type FollowUpDispatchStatus =
  | "ready"
  | "not-required"
  | "message-unavailable";

export type FollowUpDispatchPayload = {
  userId:
    string;

  channel:
    FollowUpChannel;

  priority:
    FollowUpPriority;

  purpose:
    FollowUpMessagePurpose;

  titleEn:
    string;

  titleAr:
    string;

  bodyEn:
    string;

  bodyAr:
    string;

  actionLabelEn:
    string | null;

  actionLabelAr:
    string | null;

  actionHref:
    string | null;

  safetyNoteEn:
    string | null;

  safetyNoteAr:
    string | null;

  requiresImmediateDelivery:
    boolean;
};

export type BuildFollowUpDispatchInput = {
  userId:
    string;

  // Channel, priority, purpose, timing and hrefs are identical between the
  // two — only the text differs by language — so messageEn is used as the
  // canonical source for everything except the bilingual text fields.
  messageEn:
    FollowUpMessage;

  messageAr:
    FollowUpMessage;

  followUpRequired:
    boolean;

  requestId?:
    string | null;

  referenceTime?:
    string | Date;
};

export type FollowUpDispatchPlan = {
  shouldDispatch:
    boolean;

  status:
    FollowUpDispatchStatus;

  dispatchAt:
    string | null;

  channel:
    FollowUpChannel;

  priority:
    FollowUpPriority;

  payload:
    FollowUpDispatchPayload | null;

  deduplicationKey:
    string | null;

  requestId:
    string | null;

  maxAttempts:
    number;

  retryDelaysMinutes:
    number[];

  auditMetadata: {
    purpose:
      FollowUpMessagePurpose;

    messageGeneratedAt:
      string;

    planGeneratedAt:
      string;
  };

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

function normalizeUserId(
  value:
    string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "A valid user ID is required to build a follow-up dispatch plan."
    );
  }

  return normalized;
}

function resolveDispatchAt(
  message:
    FollowUpMessage,
  referenceTime:
    Date
): string {
  if (
    message
      .requiresImmediateDelivery
  ) {
    return referenceTime
      .toISOString();
  }

  const milliseconds =
    message
      .recommendedDelayHours *
    60 *
    60 *
    1000;

  return new Date(
    referenceTime.getTime() +
      milliseconds
  ).toISOString();
}

function resolveMaxAttempts(
  channel:
    FollowUpChannel,
  priority:
    FollowUpPriority
): number {
  if (
    priority ===
      "critical"
  ) {
    return 5;
  }

  switch (channel) {
    case "whatsapp":
    case "email":
    case "push":
      return 3;

    case "dashboard":
      return 1;
  }
}

function resolveRetryDelaysMinutes(
  channel:
    FollowUpChannel,
  priority:
    FollowUpPriority
): number[] {
  if (
    priority ===
      "critical"
  ) {
    return [
      5,
      15,
      30,
      60,
    ];
  }

  switch (channel) {
    case "whatsapp":
      return [
        15,
        60,
      ];

    case "email":
      return [
        30,
        180,
      ];

    case "push":
      return [
        10,
        30,
      ];

    case "dashboard":
      return [];
  }
}

function buildDeduplicationKey({
  userId,
  message,
  dispatchAt,
}: {
  userId:
    string;

  message:
    FollowUpMessage;

  dispatchAt:
    string;
}): string {
  const dispatchDate =
    dispatchAt.slice(
      0,
      10
    );

  return [
    "follow-up",
    userId,
    message.channel,
    message.purpose,
    dispatchDate,
  ].join(
    ":"
  );
}

function createUnavailablePlan({
  userId,
  message,
  requestId,
  generatedAt,
  status,
  reason,
}: {
  userId:
    string;

  message:
    FollowUpMessage;

  requestId:
    string | null;

  generatedAt:
    string;

  status:
    Exclude<
      FollowUpDispatchStatus,
      "ready"
    >;

  reason:
    string;
}): FollowUpDispatchPlan {
  return {
    shouldDispatch:
      false,

    status,

    dispatchAt:
      null,

    channel:
      message.channel,

    priority:
      message.priority,

    payload:
      null,

    deduplicationKey:
      null,

    requestId,

    maxAttempts:
      0,

    retryDelaysMinutes:
      [],

    auditMetadata: {
      purpose:
        message.purpose,

      messageGeneratedAt:
        message.generatedAt,

      planGeneratedAt:
        generatedAt,
    },

    reason:
      `${reason} User: ${userId}.`,

    generatedAt,
  };
}

export function buildFollowUpDispatchPlan({
  userId,
  messageEn,
  messageAr,
  followUpRequired,
  requestId = null,
  referenceTime,
}: BuildFollowUpDispatchInput):
  FollowUpDispatchPlan {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  const normalizedReferenceTime =
    normalizeReferenceTime(
      referenceTime
    );

  const generatedAt =
    normalizedReferenceTime
      .toISOString();

  if (
    !followUpRequired
  ) {
    return createUnavailablePlan({
      userId:
        normalizedUserId,

      message:
        messageEn,

      requestId,

      generatedAt,

      status:
        "not-required",

      reason:
        "The follow-up decision does not require outbound delivery.",
    });
  }

  if (
    !messageEn.available ||
    !messageAr.available
  ) {
    return createUnavailablePlan({
      userId:
        normalizedUserId,

      message:
        messageEn,

      requestId,

      generatedAt,

      status:
        "message-unavailable",

      reason:
        "No deliverable follow-up message is available.",
    });
  }

  const dispatchAt =
    resolveDispatchAt(
      messageEn,
      normalizedReferenceTime
    );

  const payload:
    FollowUpDispatchPayload = {
      userId:
        normalizedUserId,

      channel:
        messageEn.channel,

      priority:
        messageEn.priority,

      purpose:
        messageEn.purpose,

      titleEn:
        messageEn.title,

      titleAr:
        messageAr.title,

      bodyEn:
        messageEn.body,

      bodyAr:
        messageAr.body,

      actionLabelEn:
        messageEn.actionLabel,

      actionLabelAr:
        messageAr.actionLabel,

      actionHref:
        messageEn.actionHref,

      safetyNoteEn:
        messageEn.safetyNote,

      safetyNoteAr:
        messageAr.safetyNote,

      requiresImmediateDelivery:
        messageEn
          .requiresImmediateDelivery,
  };

  return {
    shouldDispatch:
      true,

    status:
      "ready",

    dispatchAt,

    channel:
      messageEn.channel,

    priority:
      messageEn.priority,

    payload,

    deduplicationKey:
      buildDeduplicationKey({
        userId:
          normalizedUserId,

        message:
          messageEn,

        dispatchAt,
      }),

    requestId,

    maxAttempts:
      resolveMaxAttempts(
        messageEn.channel,
        messageEn.priority
      ),

    retryDelaysMinutes:
      resolveRetryDelaysMinutes(
        messageEn.channel,
        messageEn.priority
      ),

    auditMetadata: {
      purpose:
        messageEn.purpose,

      messageGeneratedAt:
        messageEn.generatedAt,

      planGeneratedAt:
        generatedAt,
    },

    reason:
      "A deterministic follow-up dispatch plan was created without sending the message or enqueueing a background job.",

    generatedAt,
  };
}

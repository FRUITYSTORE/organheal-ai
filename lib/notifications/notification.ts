import {
  randomUUID,
} from "node:crypto";

export type NotificationChannel =
  | "dashboard"
  | "email"
  | "whatsapp"
  | "push";

export type NotificationPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type NotificationStatus =
  | "unread"
  | "read"
  | "dismissed"
  | "expired";

export type NotificationPurpose =
  | "routine-continuity"
  | "complete-health-data"
  | "complete-report-analysis"
  | "repeat-checkin"
  | "review-health-plan"
  | "professional-review"
  | "urgent-review"
  | "report-ready"
  | "doctor-brief-ready"
  | "health-intelligence-updated";

export type NotificationAction = {
  label:
    string;

  href:
    string;
};

export type NotificationSafety = {
  note:
    string;

  requiresProfessionalReview:
    boolean;

  requiresUrgentReview:
    boolean;
};

export type Notification = {
  id:
    string;

  userId:
    string;

  purpose:
    NotificationPurpose;

  priority:
    NotificationPriority;

  status:
    NotificationStatus;

  channels:
    NotificationChannel[];

  title:
    string;

  body:
    string;

  action:
    NotificationAction | null;

  safety:
    NotificationSafety | null;

  source:
    string;

  sourceReferenceId:
    string | null;

  idempotencyKey:
    string;

  createdAt:
    string;

  readAt:
    string | null;

  dismissedAt:
    string | null;

  expiresAt:
    string | null;
};

export type CreateNotificationInput = {
  userId:
    string;

  purpose:
    NotificationPurpose;

  priority:
    NotificationPriority;

  channels:
    NotificationChannel[];

  title:
    string;

  body:
    string;

  action?:
    NotificationAction | null;

  safety?:
    NotificationSafety | null;

  source:
    string;

  sourceReferenceId?:
    string | null;

  idempotencyKey:
    string;

  createdAt?:
    string | Date;

  expiresAt?:
    string | Date | null;
};

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
      `${fieldName} is required to create a notification.`
    );
  }

  return normalized;
}

function normalizeDate(
  value:
    string | Date | undefined,
  fallback:
    Date
): string {
  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return value.toISOString();
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
      return parsed.toISOString();
    }
  }

  return fallback.toISOString();
}

function normalizeNullableDate(
  value:
    string | Date | null | undefined
): string | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return value.toISOString();
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
      return parsed.toISOString();
    }
  }

  throw new Error(
    "Notification expiration time is invalid."
  );
}

function normalizeChannels(
  channels:
    NotificationChannel[]
): NotificationChannel[] {
  const uniqueChannels =
    Array.from(
      new Set(
        channels
      )
    );

  if (
    uniqueChannels.length ===
      0
  ) {
    throw new Error(
      "At least one notification channel is required."
    );
  }

  return uniqueChannels;
}

function normalizeAction(
  action:
    NotificationAction | null | undefined
): NotificationAction | null {
  if (!action) {
    return null;
  }

  return {
    label:
      requireText(
        action.label,
        "Notification action label"
      ),

    href:
      requireText(
        action.href,
        "Notification action href"
      ),
  };
}

function normalizeSafety(
  safety:
    NotificationSafety | null | undefined
): NotificationSafety | null {
  if (!safety) {
    return null;
  }

  return {
    note:
      requireText(
        safety.note,
        "Notification safety note"
      ),

    requiresProfessionalReview:
      safety
        .requiresProfessionalReview,

    requiresUrgentReview:
      safety
        .requiresUrgentReview,
  };
}

export function createNotification({
  userId,
  purpose,
  priority,
  channels,
  title,
  body,
  action = null,
  safety = null,
  source,
  sourceReferenceId = null,
  idempotencyKey,
  createdAt,
  expiresAt = null,
}: CreateNotificationInput):
  Notification {
  const now =
    new Date();

  const normalizedCreatedAt =
    normalizeDate(
      createdAt,
      now
    );

  const normalizedExpiresAt =
    normalizeNullableDate(
      expiresAt
    );

  if (
    normalizedExpiresAt &&
    new Date(
      normalizedExpiresAt
    ).getTime() <=
      new Date(
        normalizedCreatedAt
      ).getTime()
  ) {
    throw new Error(
      "Notification expiration time must be after its creation time."
    );
  }

  return {
    id:
      randomUUID(),

    userId:
      requireText(
        userId,
        "Notification user ID"
      ),

    purpose,

    priority,

    status:
      "unread",

    channels:
      normalizeChannels(
        channels
      ),

    title:
      requireText(
        title,
        "Notification title"
      ),

    body:
      requireText(
        body,
        "Notification body"
      ),

    action:
      normalizeAction(
        action
      ),

    safety:
      normalizeSafety(
        safety
      ),

    source:
      requireText(
        source,
        "Notification source"
      ),

    sourceReferenceId:
      sourceReferenceId
        ?.trim() ||
      null,

    idempotencyKey:
      requireText(
        idempotencyKey,
        "Notification idempotency key"
      ),

    createdAt:
      normalizedCreatedAt,

    readAt:
      null,

    dismissedAt:
      null,

    expiresAt:
      normalizedExpiresAt,
  };
}
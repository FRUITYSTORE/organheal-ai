import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  Notification,
  NotificationAction,
  NotificationChannel,
  NotificationPriority,
  NotificationPurpose,
  NotificationSafety,
  NotificationStatus,
} from "@/lib/notifications/notification";

const NOTIFICATION_SELECT =
  "id, user_id, purpose, priority, status, channels, title, body, action, safety, source, source_reference_id, idempotency_key, read_at, dismissed_at, expires_at, created_at";

type NotificationRow = {
  id:
    string;

  user_id:
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

  source_reference_id:
    string | null;

  idempotency_key:
    string;

  read_at:
    string | null;

  dismissed_at:
    string | null;

  expires_at:
    string | null;

  created_at:
    string;
};

export type SaveNotificationResult = {
  notification:
    Notification;

  created:
    boolean;
};

function requireClient(
  client:
    SupabaseClient | undefined
): SupabaseClient {
  if (!client) {
    throw new Error(
      "A Supabase client is required for notification repository operations."
    );
  }

  return client;
}

function mapNotificationRow(
  row:
    NotificationRow
): Notification {
  return {
    id:
      row.id,

    userId:
      row.user_id,

    purpose:
      row.purpose,

    priority:
      row.priority,

    status:
      row.status,

    channels:
      row.channels,

    title:
      row.title,

    body:
      row.body,

    action:
      row.action,

    safety:
      row.safety,

    source:
      row.source,

    sourceReferenceId:
      row.source_reference_id,

    idempotencyKey:
      row.idempotency_key,

    createdAt:
      row.created_at,

    readAt:
      row.read_at,

    dismissedAt:
      row.dismissed_at,

    expiresAt:
      row.expires_at,
  };
}

export async function saveNotification(
  notification:
    Notification,
  client?:
    SupabaseClient
): Promise<
  SaveNotificationResult
> {
  const database =
    requireClient(
      client
    );

  const {
    data,
    error,
  } = await database
    .from(
      "notifications"
    )
    .upsert(
      {
        id:
          notification.id,

        user_id:
          notification.userId,

        purpose:
          notification.purpose,

        priority:
          notification.priority,

        status:
          notification.status,

        channels:
          notification.channels,

        title:
          notification.title,

        body:
          notification.body,

        action:
          notification.action,

        safety:
          notification.safety,

        source:
          notification.source,

        source_reference_id:
          notification
            .sourceReferenceId,

        idempotency_key:
          notification
            .idempotencyKey,

        read_at:
          notification.readAt,

        dismissed_at:
          notification.dismissedAt,

        expires_at:
          notification.expiresAt,

        created_at:
          notification.createdAt,

        updated_at:
          new Date()
            .toISOString(),
      },
      {
        onConflict:
          "user_id,idempotency_key",

        ignoreDuplicates:
          true,
      }
    )
    .select(
      NOTIFICATION_SELECT
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (data) {
    return {
      notification:
        mapNotificationRow(
          data as NotificationRow
        ),

      created:
        true,
    };
  }

  const existing =
    await getNotificationByIdempotencyKey(
      notification.userId,
      notification.idempotencyKey,
      database
    );

  if (!existing) {
    throw new Error(
      "Notification upsert did not return a created or existing notification."
    );
  }

  return {
    notification:
      existing,

    created:
      false,
  };
}

export async function getNotificationByIdempotencyKey(
  userId:
    string,
  idempotencyKey:
    string,
  client?:
    SupabaseClient
): Promise<
  Notification | null
> {
  const database =
    requireClient(
      client
    );

  const {
    data,
    error,
  } = await database
    .from(
      "notifications"
    )
    .select(
      NOTIFICATION_SELECT
    )
    .eq(
      "user_id",
      userId
    )
    .eq(
      "idempotency_key",
      idempotencyKey
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data
    ? mapNotificationRow(
        data as NotificationRow
      )
    : null;
}

export async function getDashboardNotifications(
  userId:
    string,
  limit = 20,
  client?:
    SupabaseClient
): Promise<
  Notification[]
> {
  const database =
    requireClient(
      client
    );

  const safeLimit =
    Math.max(
      1,
      Math.min(
        limit,
        100
      )
    );

  const {
    data,
    error,
  } = await database
    .from(
      "notifications"
    )
    .select(
      NOTIFICATION_SELECT
    )
    .eq(
      "user_id",
      userId
    )
    .contains(
      "channels",
      [
        "dashboard",
      ]
    )
    .in(
      "status",
      [
        "unread",
        "read",
      ]
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    )
    .limit(
      safeLimit
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data ?? []
  ).map(
    (row) =>
      mapNotificationRow(
        row as NotificationRow
      )
  );
}

export async function markNotificationAsRead(
  userId:
    string,
  notificationId:
    string,
  client?:
    SupabaseClient
): Promise<void> {
  const database =
    requireClient(
      client
    );

  const now =
    new Date()
      .toISOString();

  const {
    error,
  } = await database
    .from(
      "notifications"
    )
    .update({
      status:
        "read",

      read_at:
        now,

      updated_at:
        now,
    })
    .eq(
      "id",
      notificationId
    )
    .eq(
      "user_id",
      userId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export async function dismissNotification(
  userId:
    string,
  notificationId:
    string,
  client?:
    SupabaseClient
): Promise<void> {
  const database =
    requireClient(
      client
    );

  const now =
    new Date()
      .toISOString();

  const {
    error,
  } = await database
    .from(
      "notifications"
    )
    .update({
      status:
        "dismissed",

      dismissed_at:
        now,

      updated_at:
        now,
    })
    .eq(
      "id",
      notificationId
    )
    .eq(
      "user_id",
      userId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export async function countUnreadDashboardNotifications(
  userId:
    string,
  client?:
    SupabaseClient
): Promise<number> {
  const database =
    requireClient(
      client
    );

  const {
    count,
    error,
  } = await database
    .from(
      "notifications"
    )
    .select(
      "id",
      {
        count:
          "exact",

        head:
          true,
      }
    )
    .eq(
      "user_id",
      userId
    )
    .eq(
      "status",
      "unread"
    )
    .contains(
      "channels",
      [
        "dashboard",
      ]
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return count ?? 0;
}
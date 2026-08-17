import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  Notification,
} from "@/lib/notifications/notification";

import {
  countUnreadDashboardNotifications,
  dismissNotification,
  getDashboardNotifications,
  markNotificationAsRead,
} from "@/lib/repositories/notification.repository";

export type NotificationApplicationSummary = {
  notifications:
    Notification[];

  unreadCount:
    number;

  hasUnread:
    boolean;
};

export type GetNotificationCenterInput = {
  userId:
    string;

  limit?:
    number;

  client:
    SupabaseClient;
};

export type UpdateNotificationLifecycleInput = {
  userId:
    string;

  notificationId:
    string;

  client:
    SupabaseClient;
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
      `${fieldName} is required for notification operations.`
    );
  }

  return normalized;
}

export async function getNotificationCenter({
  userId,
  limit = 20,
  client,
}: GetNotificationCenterInput):
  Promise<
    NotificationApplicationSummary
  > {
  const normalizedUserId =
    requireText(
      userId,
      "Notification user ID"
    );

  const [
    notifications,
    unreadCount,
  ] =
    await Promise.all([
      getDashboardNotifications(
        normalizedUserId,
        limit,
        client
      ),

      countUnreadDashboardNotifications(
        normalizedUserId,
        client
      ),
    ]);

  return {
    notifications,

    unreadCount,

    hasUnread:
      unreadCount >
        0,
  };
}

export async function getUnreadNotifications({
  userId,
  limit = 20,
  client,
}: GetNotificationCenterInput):
  Promise<
    Notification[]
  > {
  const summary =
    await getNotificationCenter({
      userId,
      limit,
      client,
    });

  return summary
    .notifications
    .filter(
      (notification) =>
        notification.status ===
          "unread"
    );
}

export async function getUnreadNotificationCount({
  userId,
  client,
}: Omit<
  GetNotificationCenterInput,
  "limit"
>): Promise<number> {
  const normalizedUserId =
    requireText(
      userId,
      "Notification user ID"
    );

  return countUnreadDashboardNotifications(
    normalizedUserId,
    client
  );
}

export async function markNotificationRead({
  userId,
  notificationId,
  client,
}: UpdateNotificationLifecycleInput):
  Promise<void> {
  await markNotificationAsRead(
    requireText(
      userId,
      "Notification user ID"
    ),

    requireText(
      notificationId,
      "Notification ID"
    ),

    client
  );
}

export async function dismissUserNotification({
  userId,
  notificationId,
  client,
}: UpdateNotificationLifecycleInput):
  Promise<void> {
  await dismissNotification(
    requireText(
      userId,
      "Notification user ID"
    ),

    requireText(
      notificationId,
      "Notification ID"
    ),

    client
  );
}
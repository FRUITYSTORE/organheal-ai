import type {
  Notification,
} from "@/lib/notifications/notification";

import type {
  NotificationApplicationSummary,
} from "@/lib/notifications/notification-application.service";

export type NotificationResponseContractItem = {
  id:
    string;

  purpose:
    Notification[
      "purpose"
    ];

  priority:
    Notification[
      "priority"
    ];

  status:
    Notification[
      "status"
    ];

  title:
    string;

  body:
    string;

  action:
    Notification[
      "action"
    ];

  safety:
    Notification[
      "safety"
    ];

  createdAt:
    string;

  readAt:
    string | null;

  expiresAt:
    string | null;
};

export type NotificationResponseContract = {
  success:
    true;

  unreadCount:
    number;

  hasUnread:
    boolean;

  notifications:
    NotificationResponseContractItem[];
};

function buildNotificationItem(
  notification:
    Notification
): NotificationResponseContractItem {
  return {
    id:
      notification.id,

    purpose:
      notification.purpose,

    priority:
      notification.priority,

    status:
      notification.status,

    title:
      notification.title,

    body:
      notification.body,

    action:
      notification.action,

    safety:
      notification.safety,

    createdAt:
      notification.createdAt,

    readAt:
      notification.readAt,

    expiresAt:
      notification.expiresAt,
  };
}

export function buildNotificationResponseContract(
  summary:
    NotificationApplicationSummary
): NotificationResponseContract {
  return {
    success:
      true,

    unreadCount:
      summary.unreadCount,

    hasUnread:
      summary.hasUnread,

    notifications:
      summary.notifications.map(
        buildNotificationItem
      ),
  };
}
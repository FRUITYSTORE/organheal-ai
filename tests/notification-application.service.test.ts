import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  dismissUserNotification,
  getNotificationCenter,
  getUnreadNotificationCount,
  getUnreadNotifications,
  markNotificationRead,
} from "@/lib/notifications/notification-application.service";

import {
  countUnreadDashboardNotifications,
  dismissNotification,
  getDashboardNotifications,
  markNotificationAsRead,
} from "@/lib/repositories/notification.repository";

import type {
  Notification,
} from "@/lib/notifications/notification";

vi.mock(
  "@/lib/repositories/notification.repository",
  () => ({
    countUnreadDashboardNotifications:
      vi.fn(),

    dismissNotification:
      vi.fn(),

    getDashboardNotifications:
      vi.fn(),

    markNotificationAsRead:
      vi.fn(),
  })
);

const mockedCountUnread =
  vi.mocked(
    countUnreadDashboardNotifications
  );

const mockedDismiss =
  vi.mocked(
    dismissNotification
  );

const mockedGetDashboard =
  vi.mocked(
    getDashboardNotifications
  );

const mockedMarkRead =
  vi.mocked(
    markNotificationAsRead
  );

function createClient():
  SupabaseClient {
  return {} as
    SupabaseClient;
}

function createNotificationFixture({
  id,
  status,
}: {
  id:
    string;

  status:
    Notification[
      "status"
    ];
}): Notification {
  return {
    id,

    userId:
      "user-123",

    purpose:
      "repeat-checkin",

    priority:
      "medium",

    status,

    channels: [
      "dashboard",
    ],

    title:
      "Add a new health check-in",

    body:
      "Complete a new check-in.",

    action: {
      label:
        "Open Check-In",

      href:
        "/checkin",
    },

    safety:
      null,

    source:
      "follow-up-delivery",

    sourceReferenceId:
      "job-follow-up",

    idempotencyKey:
      `notification:${id}`,

    createdAt:
      "2026-08-07T01:30:00.000Z",

    readAt:
      status ===
        "read"
        ? "2026-08-07T02:00:00.000Z"
        : null,

    dismissedAt:
      null,

    expiresAt:
      null,
  };
}

describe(
  "Notification application service",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();

        mockedGetDashboard
          .mockResolvedValue([
            createNotificationFixture({
              id:
                "notification-unread",

              status:
                "unread",
            }),

            createNotificationFixture({
              id:
                "notification-read",

              status:
                "read",
            }),
          ]);

        mockedCountUnread
          .mockResolvedValue(
            1
          );

        mockedMarkRead
          .mockResolvedValue(
            undefined
          );

        mockedDismiss
          .mockResolvedValue(
            undefined
          );
      }
    );

    it(
      "returns the dashboard notification center summary",
      async () => {
        const client =
          createClient();

        const result =
          await getNotificationCenter({
            userId:
              "user-123",

            limit:
              20,

            client,
          });

        expect(
          result.notifications
        ).toHaveLength(
          2
        );

        expect(
          result.unreadCount
        ).toBe(
          1
        );

        expect(
          result.hasUnread
        ).toBe(
          true
        );

        expect(
          mockedGetDashboard
        ).toHaveBeenCalledWith(
          "user-123",
          20,
          client
        );

        expect(
          mockedCountUnread
        ).toHaveBeenCalledWith(
          "user-123",
          client
        );
      }
    );

    it(
      "returns only unread notifications",
      async () => {
        const result =
          await getUnreadNotifications({
            userId:
              "user-123",

            client:
              createClient(),
          });

        expect(
          result
        ).toHaveLength(
          1
        );

        expect(
          result[0].status
        ).toBe(
          "unread"
        );
      }
    );

    it(
      "returns the exact unread count",
      async () => {
        mockedCountUnread
          .mockResolvedValue(
            7
          );

        const result =
          await getUnreadNotificationCount({
            userId:
              "user-123",

            client:
              createClient(),
          });

        expect(
          result
        ).toBe(
          7
        );
      }
    );

    it(
      "marks a notification as read",
      async () => {
        const client =
          createClient();

        await markNotificationRead({
          userId:
            "user-123",

          notificationId:
            "notification-123",

          client,
        });

        expect(
          mockedMarkRead
        ).toHaveBeenCalledWith(
          "user-123",
          "notification-123",
          client
        );
      }
    );

    it(
      "dismisses a notification without deleting it",
      async () => {
        const client =
          createClient();

        await dismissUserNotification({
          userId:
            "user-123",

          notificationId:
            "notification-123",

          client,
        });

        expect(
          mockedDismiss
        ).toHaveBeenCalledWith(
          "user-123",
          "notification-123",
          client
        );
      }
    );

    it(
      "rejects blank lifecycle identifiers before repository access",
      async () => {
        await expect(
          markNotificationRead({
            userId:
              "user-123",

            notificationId:
              "   ",

            client:
              createClient(),
          })
        ).rejects.toThrow(
          "Notification ID is required"
        );

        expect(
          mockedMarkRead
        ).not.toHaveBeenCalled();
      }
    );
  }
);
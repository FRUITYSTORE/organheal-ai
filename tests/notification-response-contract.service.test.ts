import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildNotificationResponseContract,
} from "@/lib/notifications/notification-response-contract.service";

import type {
  NotificationApplicationSummary,
} from "@/lib/notifications/notification-application.service";

function createSummary():
  NotificationApplicationSummary {
  return {
    unreadCount:
      1,

    hasUnread:
      true,

    notifications: [
      {
        id:
          "notification-123",

        userId:
          "user-123",

        purpose:
          "repeat-checkin",

        priority:
          "medium",

        status:
          "unread",

        channels: [
          "dashboard",
          "email",
        ],

        title:
          "Add a new health check-in",

        body:
          "Complete a new health check-in.",

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
          "notification:user-123:repeat-checkin",

        createdAt:
          "2026-08-07T02:30:00.000Z",

        readAt:
          null,

        dismissedAt:
          null,

        expiresAt:
          null,
      },
    ],
  };
}

describe(
  "Notification response contract",
  () => {
    it(
      "builds the public notification response contract",
      () => {
        const result =
          buildNotificationResponseContract(
            createSummary()
          );

        expect(
          result
        ).toEqual({
          success:
            true,

          unreadCount:
            1,

          hasUnread:
            true,

          notifications: [
            {
              id:
                "notification-123",

              purpose:
                "repeat-checkin",

              priority:
                "medium",

              status:
                "unread",

              title:
                "Add a new health check-in",

              body:
                "Complete a new health check-in.",

              action: {
                label:
                  "Open Check-In",

                href:
                  "/checkin",
              },

              safety:
                null,

              createdAt:
                "2026-08-07T02:30:00.000Z",

              readAt:
                null,

              expiresAt:
                null,
            },
          ],
        });
      }
    );

    it(
      "does not expose internal notification fields",
      () => {
        const result =
          buildNotificationResponseContract(
            createSummary()
          );

        const item =
          result.notifications[0] as
            Record<
              string,
              unknown
            >;

        expect(
          item
        ).not.toHaveProperty(
          "userId"
        );

        expect(
          item
        ).not.toHaveProperty(
          "channels"
        );

        expect(
          item
        ).not.toHaveProperty(
          "source"
        );

        expect(
          item
        ).not.toHaveProperty(
          "sourceReferenceId"
        );

        expect(
          item
        ).not.toHaveProperty(
          "idempotencyKey"
        );

        expect(
          item
        ).not.toHaveProperty(
          "dismissedAt"
        );
      }
    );

    it(
      "preserves urgent safety metadata",
      () => {
        const summary =
          createSummary();

        summary.notifications[0] = {
          ...summary.notifications[0],

          purpose:
            "urgent-review",

          priority:
            "critical",

          safety: {
            note:
              "Seek urgent medical care immediately for severe or worsening symptoms.",

            requiresProfessionalReview:
              true,

            requiresUrgentReview:
              true,
          },
        };

        const result =
          buildNotificationResponseContract(
            summary
          );

        expect(
          result.notifications[0]
            .safety
        ).toEqual({
          note:
            "Seek urgent medical care immediately for severe or worsening symptoms.",

          requiresProfessionalReview:
            true,

          requiresUrgentReview:
            true,
        });
      }
    );

    it(
      "returns an empty notification list safely",
      () => {
        const result =
          buildNotificationResponseContract({
            notifications:
              [],

            unreadCount:
              0,

            hasUnread:
              false,
          });

        expect(
          result
        ).toEqual({
          success:
            true,

          unreadCount:
            0,

          hasUnread:
            false,

          notifications:
            [],
        });
      }
    );
  }
);
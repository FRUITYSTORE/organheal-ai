import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createNotification,
} from "@/lib/notifications/notification";

describe(
  "Notification domain",
  () => {
    it(
      "creates a valid unread notification",
      () => {
        const notification =
          createNotification({
            userId:
              "user-123",

            purpose:
              "repeat-checkin",

            priority:
              "medium",

            channels: [
              "dashboard",
              "email",
            ],

            title:
              "Add a new health check-in",

            body:
              "Complete a new check-in so OrganHeal can compare recent wellness signals.",

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
              "notification:user-123:repeat-checkin:2026-08-09",

            createdAt:
              "2026-08-06T20:30:00.000Z",

            expiresAt:
              "2026-08-16T20:30:00.000Z",
          });

        expect(
          notification.id
        ).toMatch(
          /^[0-9a-f-]{36}$/i
        );

        expect(
          notification.status
        ).toBe(
          "unread"
        );

        expect(
          notification.channels
        ).toEqual([
          "dashboard",
          "email",
        ]);

        expect(
          notification.action
        ).toEqual({
          label:
            "Open Check-In",

          href:
            "/checkin",
        });

        expect(
          notification.readAt
        ).toBeNull();

        expect(
          notification.dismissedAt
        ).toBeNull();
      }
    );

    it(
      "removes duplicate channels while preserving order",
      () => {
        const notification =
          createNotification({
            userId:
              "user-123",

            purpose:
              "review-health-plan",

            priority:
              "low",

            channels: [
              "dashboard",
              "email",
              "dashboard",
            ],

            title:
              "Review your health plan",

            body:
              "Review your latest health actions.",

            source:
              "follow-up-delivery",

            idempotencyKey:
              "notification:user-123:review-health-plan",
          });

        expect(
          notification.channels
        ).toEqual([
          "dashboard",
          "email",
        ]);
      }
    );

    it(
      "preserves urgent safety boundaries",
      () => {
        const notification =
          createNotification({
            userId:
              "user-critical",

            purpose:
              "urgent-review",

            priority:
              "critical",

            channels: [
              "dashboard",
              "push",
            ],

            title:
              "Urgent health review recommended",

            body:
              "Review the available information promptly.",

            safety: {
              note:
                "Seek urgent medical care immediately for severe or worsening symptoms.",

              requiresProfessionalReview:
                true,

              requiresUrgentReview:
                true,
            },

            source:
              "follow-up-delivery",

            idempotencyKey:
              "notification:user-critical:urgent-review",
          });

        expect(
          notification.safety
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
      "rejects a notification without channels",
      () => {
        expect(
          () =>
            createNotification({
              userId:
                "user-123",

              purpose:
                "report-ready",

              priority:
                "medium",

              channels:
                [],

              title:
                "Report ready",

              body:
                "Your report is ready.",

              source:
                "report-analysis",

              idempotencyKey:
                "notification:user-123:report-ready",
            })
        ).toThrow(
          "At least one notification channel is required."
        );
      }
    );

    it(
      "rejects an expiration time before creation",
      () => {
        expect(
          () =>
            createNotification({
              userId:
                "user-123",

              purpose:
                "repeat-checkin",

              priority:
                "medium",

              channels: [
                "dashboard",
              ],

              title:
                "Add a check-in",

              body:
                "Complete a new check-in.",

              source:
                "follow-up-delivery",

              idempotencyKey:
                "notification:user-123:repeat-checkin",

              createdAt:
                "2026-08-10T10:00:00.000Z",

              expiresAt:
                "2026-08-09T10:00:00.000Z",
            })
        ).toThrow(
          "Notification expiration time must be after its creation time."
        );
      }
    );

    it(
      "rejects blank patient-safe content",
      () => {
        expect(
          () =>
            createNotification({
              userId:
                "user-123",

              purpose:
                "repeat-checkin",

              priority:
                "medium",

              channels: [
                "dashboard",
              ],

              title:
                "   ",

              body:
                "Complete a new check-in.",

              source:
                "follow-up-delivery",

              idempotencyKey:
                "notification:user-123:repeat-checkin",
            })
        ).toThrow(
          "Notification title is required"
        );
      }
    );
  }
);
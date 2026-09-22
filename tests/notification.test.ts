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

            titleAr:
              "أضف تحديثًا صحيًا جديدًا",

            body:
              "Complete a new check-in so OrganHeal can compare recent wellness signals.",

            bodyAr:
              "أكمل تحديثًا صحيًا جديدًا لمقارنة إشارات العافية الأخيرة.",

            action: {
              labelEn:
                "Open Check-In",

              labelAr:
                "افتح التحديث الصحي",

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
          notification.titleAr
        ).toBe(
          "أضف تحديثًا صحيًا جديدًا"
        );

        expect(
          notification.action
        ).toEqual({
          labelEn:
            "Open Check-In",

          labelAr:
            "افتح التحديث الصحي",

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

            titleAr:
              "راجع خطتك الصحية",

            body:
              "Review your latest health actions.",

            bodyAr:
              "راجع أحدث إجراءاتك الصحية.",

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

            titleAr:
              "يوصى بمراجعة صحية عاجلة",

            body:
              "Review the available information promptly.",

            bodyAr:
              "راجع المعلومات المتوفرة على الفور.",

            safety: {
              noteEn:
                "Seek urgent medical care immediately for severe or worsening symptoms.",

              noteAr:
                "اطلب رعاية طبية عاجلة فورًا إذا كانت الأعراض شديدة أو تزداد سوءًا.",

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
          noteEn:
            "Seek urgent medical care immediately for severe or worsening symptoms.",

          noteAr:
            "اطلب رعاية طبية عاجلة فورًا إذا كانت الأعراض شديدة أو تزداد سوءًا.",

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

              titleAr:
                "التقرير جاهز",

              body:
                "Your report is ready.",

              bodyAr:
                "تقريرك جاهز.",

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

              titleAr:
                "أضف تحديثًا",

              body:
                "Complete a new check-in.",

              bodyAr:
                "أكمل تحديثًا جديدًا.",

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

              titleAr:
                "أضف تحديثًا",

              body:
                "Complete a new check-in.",

              bodyAr:
                "أكمل تحديثًا جديدًا.",

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

    it(
      "rejects blank Arabic patient-safe content",
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

              titleAr:
                "   ",

              body:
                "Complete a new check-in.",

              bodyAr:
                "أكمل تحديثًا جديدًا.",

              source:
                "follow-up-delivery",

              idempotencyKey:
                "notification:user-123:repeat-checkin",
            })
        ).toThrow(
          "Notification title (Arabic) is required"
        );
      }
    );
  }
);

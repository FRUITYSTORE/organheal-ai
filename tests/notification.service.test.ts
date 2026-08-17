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
  createAndSaveNotification,
} from "@/lib/notifications/notification.service";

import {
  saveNotification,
} from "@/lib/repositories/notification.repository";

import type {
  Notification,
} from "@/lib/notifications/notification";

vi.mock(
  "@/lib/repositories/notification.repository",
  () => ({
    saveNotification:
      vi.fn(),
  })
);

const mockedSaveNotification =
  vi.mocked(
    saveNotification
  );

function createClient():
  SupabaseClient {
  return {
    from:
      vi.fn(),
  } as unknown as
    SupabaseClient;
}

function createSavedNotification(
  overrides:
    Partial<
      Notification
    > = {}
): Notification {
  return {
    id:
      "11111111-1111-4111-8111-111111111111",

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
      "notification:user-123:repeat-checkin:2026-08-09",

    createdAt:
      "2026-08-07T01:00:00.000Z",

    readAt:
      null,

    dismissedAt:
      null,

    expiresAt:
      null,

    ...overrides,
  };
}

describe(
  "Notification service",
  () => {
    beforeEach(
      () => {
        mockedSaveNotification
          .mockReset();

        mockedSaveNotification
          .mockResolvedValue({
            notification:
              createSavedNotification(),

            created:
              true,
          });
      }
    );

    it(
      "creates and saves a notification",
      async () => {
        const client =
          createClient();

        const result =
          await createAndSaveNotification({
            client,

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
              "notification:user-123:repeat-checkin:2026-08-09",

            createdAt:
              "2026-08-07T01:00:00.000Z",
          });

        expect(
          result.created
        ).toBe(
          true
        );

        expect(
          result.notification
        ).toMatchObject({
          userId:
            "user-123",

          purpose:
            "repeat-checkin",

          status:
            "unread",
        });

        expect(
          mockedSaveNotification
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedSaveNotification
        ).toHaveBeenCalledWith(
          expect.objectContaining({
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

            source:
              "follow-up-delivery",

            sourceReferenceId:
              "job-follow-up",

            idempotencyKey:
              "notification:user-123:repeat-checkin:2026-08-09",
          }),
          client
        );
      }
    );

    it(
      "returns an existing notification when persistence is idempotent",
      async () => {
        mockedSaveNotification
          .mockResolvedValue({
            notification:
              createSavedNotification({
                id:
                  "22222222-2222-4222-8222-222222222222",
              }),

            created:
              false,
          });

        const result =
          await createAndSaveNotification({
            client:
              createClient(),

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
              "Add a new health check-in",

            body:
              "Complete a new check-in.",

            source:
              "follow-up-delivery",

            idempotencyKey:
              "notification:user-123:repeat-checkin:2026-08-09",
          });

        expect(
          result
        ).toMatchObject({
          created:
            false,

          notification: {
            id:
              "22222222-2222-4222-8222-222222222222",

            status:
              "unread",
          },
        });
      }
    );

    it(
      "preserves urgent safety metadata",
      async () => {
        await createAndSaveNotification({
          client:
            createClient(),

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

          sourceReferenceId:
            "job-critical",

          idempotencyKey:
            "notification:user-critical:urgent-review",
        });

        expect(
          mockedSaveNotification
        ).toHaveBeenCalledWith(
          expect.objectContaining({
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
          }),
          expect.anything()
        );
      }
    );

    it(
      "rejects invalid notification input before persistence",
      async () => {
        await expect(
          createAndSaveNotification({
            client:
              createClient(),

            userId:
              "user-123",

            purpose:
              "repeat-checkin",

            priority:
              "medium",

            channels:
              [],

            title:
              "Add a new check-in",

            body:
              "Complete a new check-in.",

            source:
              "follow-up-delivery",

            idempotencyKey:
              "notification:user-123:repeat-checkin",
          })
        ).rejects.toThrow(
          "At least one notification channel is required."
        );

        expect(
          mockedSaveNotification
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not alter an existing persisted notification lifecycle",
      async () => {
        mockedSaveNotification
          .mockResolvedValue({
            notification:
              createSavedNotification({
                status:
                  "read",

                readAt:
                  "2026-08-07T02:00:00.000Z",
              }),

            created:
              false,
          });

        const result =
          await createAndSaveNotification({
            client:
              createClient(),

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
              "Add a new check-in",

            body:
              "Complete a new check-in.",

            source:
              "follow-up-delivery",

            idempotencyKey:
              "notification:user-123:repeat-checkin",
          });

        expect(
          result.notification.status
        ).toBe(
          "read"
        );

        expect(
          result.notification.readAt
        ).toBe(
          "2026-08-07T02:00:00.000Z"
        );
      }
    );
  }
);
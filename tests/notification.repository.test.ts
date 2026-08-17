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
  countUnreadDashboardNotifications,
  dismissNotification,
  getDashboardNotifications,
  markNotificationAsRead,
  saveNotification,
} from "@/lib/repositories/notification.repository";

import {
  createNotification,
} from "@/lib/notifications/notification";

const maybeSingleMock =
  vi.fn();

const limitMock =
  vi.fn();

const orderMock =
  vi.fn(
    () => ({
      limit:
        limitMock,
    })
  );

const inMock =
  vi.fn(
    () => ({
      order:
        orderMock,
    })
  );

const containsMock =
  vi.fn(
    () => ({
      in:
        inMock,
    })
  );

const eqSecondMock =
  vi.fn(
    () => ({
      maybeSingle:
        maybeSingleMock,
    })
  );

const eqFirstMock =
  vi.fn(
    () => ({
      eq:
        eqSecondMock,
    })
  );

const selectReadMock =
  vi.fn(
    () => ({
      eq:
        eqFirstMock,
    })
  );

const selectWriteMock =
  vi.fn(
    () => ({
      maybeSingle:
        maybeSingleMock,
    })
  );

const upsertMock =
  vi.fn(
    () => ({
      select:
        selectWriteMock,
    })
  );

const updateEqSecondMock =
  vi.fn();

const updateEqFirstMock =
  vi.fn(
    () => ({
      eq:
        updateEqSecondMock,
    })
  );

const updateMock =
  vi.fn(
    () => ({
      eq:
        updateEqFirstMock,
    })
  );

  const countContainsMock =
  vi.fn();

const countStatusEqMock =
  vi.fn(
    () => ({
      contains:
        countContainsMock,
    })
  );

const countUserEqMock =
  vi.fn(
    () => ({
      eq:
        countStatusEqMock,
    })
  );

const countSelectMock =
  vi.fn(
    () => ({
      eq:
        countUserEqMock,
    })
  );

const fromMock =
  vi.fn(
    () => ({
      upsert:
        upsertMock,

      select:
        vi.fn(
          (
            columns:
              string,
            options?:
              {
                count?:
                  string;

                head?:
                  boolean;
              }
          ) => {
            if (
              columns ===
                "id" &&
              options
                ?.count ===
                "exact" &&
              options
                ?.head ===
                true
            ) {
              return {
                eq:
                  countUserEqMock,
              };
            }

            return {
              eq:
                vi.fn(
                  () => ({
                    eq:
                      eqSecondMock,

                    contains:
                      containsMock,
                  })
                ),
            };
          }
        ),

      update:
        updateMock,
    })
  );

function createClient():
  SupabaseClient {
  return {
    from:
      fromMock,
  } as unknown as
    SupabaseClient;
}

function createNotificationRow() {
  return {
    id:
      "11111111-1111-4111-8111-111111111111",

    user_id:
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

    source_reference_id:
      "job-follow-up",

    idempotency_key:
      "notification:user-123:repeat-checkin",

    read_at:
      null,

    dismissed_at:
      null,

    expires_at:
      null,

    created_at:
      "2026-08-07T00:30:00.000Z",
  };
}

describe(
  "Notification repository",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();

        maybeSingleMock
          .mockResolvedValue({
            data:
              createNotificationRow(),

            error:
              null,
          });

                  countContainsMock
          .mockResolvedValue({
            count:
              3,

            error:
              null,
          });

        limitMock
          .mockResolvedValue({
            data: [
              createNotificationRow(),
            ],

            error:
              null,
          });

        updateEqSecondMock
          .mockResolvedValue({
            error:
              null,
          });
      }
    );

    it(
      "saves a notification idempotently",
      async () => {
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
              "Complete a new check-in.",

            action: {
              label:
                "Open Check-In",

              href:
                "/checkin",
            },

            source:
              "follow-up-delivery",

            sourceReferenceId:
              "job-follow-up",

            idempotencyKey:
              "notification:user-123:repeat-checkin",
          });

        const result =
          await saveNotification(
            notification,
            createClient()
          );

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
          upsertMock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id:
              "user-123",

            idempotency_key:
              "notification:user-123:repeat-checkin",
          }),
          {
            onConflict:
              "user_id,idempotency_key",

            ignoreDuplicates:
              true,
          }
        );
      }
    );

    it(
      "returns dashboard notifications ordered by newest first",
      async () => {
        const result =
          await getDashboardNotifications(
            "user-123",
            20,
            createClient()
          );

        expect(
          result
        ).toHaveLength(
          1
        );

        expect(
          result[0]
        ).toMatchObject({
          userId:
            "user-123",

          channels: [
            "dashboard",
            "email",
          ],
        });

        expect(
          containsMock
        ).toHaveBeenCalledWith(
          "channels",
          [
            "dashboard",
          ]
        );

        expect(
          inMock
        ).toHaveBeenCalledWith(
          "status",
          [
            "unread",
            "read",
          ]
        );

        expect(
          orderMock
        ).toHaveBeenCalledWith(
          "created_at",
          {
            ascending:
              false,
          }
        );
      }
    );

    it(
      "marks a user notification as read",
      async () => {
        await markNotificationAsRead(
          "user-123",
          "notification-123",
          createClient()
        );

        expect(
          updateMock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            status:
              "read",

            read_at:
              expect.any(
                String
              ),

            updated_at:
              expect.any(
                String
              ),
          })
        );

        expect(
          updateEqFirstMock
        ).toHaveBeenCalledWith(
          "id",
          "notification-123"
        );

        expect(
          updateEqSecondMock
        ).toHaveBeenCalledWith(
          "user_id",
          "user-123"
        );
      }
    );

    it(
      "dismisses a user notification without deleting it",
      async () => {
        await dismissNotification(
          "user-123",
          "notification-123",
          createClient()
        );

        expect(
          updateMock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            status:
              "dismissed",

            dismissed_at:
              expect.any(
                String
              ),

            updated_at:
              expect.any(
                String
              ),
          })
        );
      }
    );

    it(
      "caps the dashboard notification limit at one hundred",
      async () => {
        await getDashboardNotifications(
          "user-123",
          500,
          createClient()
        );

        expect(
          limitMock
        ).toHaveBeenCalledWith(
          100
        );
      }
    );
        it(
      "counts unread dashboard notifications exactly",
      async () => {
        const result =
          await countUnreadDashboardNotifications(
            "user-123",
            createClient()
          );

        expect(
          result
        ).toBe(
          3
        );

        expect(
          countUserEqMock
        ).toHaveBeenCalledWith(
          "user_id",
          "user-123"
        );

        expect(
          countStatusEqMock
        ).toHaveBeenCalledWith(
          "status",
          "unread"
        );

        expect(
          countContainsMock
        ).toHaveBeenCalledWith(
          "channels",
          [
            "dashboard",
          ]
        );
      }
    );
  }
);
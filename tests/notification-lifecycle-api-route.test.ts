import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

vi.mock(
  "@/lib/api/api-auth",
  () => ({
    authenticateApiRequest:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/notifications/notification-application.service",
  () => ({
    dismissUserNotification:
      vi.fn(),

    markNotificationRead:
      vi.fn(),
  })
);

import {
  authenticateApiRequest,
} from "@/lib/api/api-auth";

import {
  dismissUserNotification,
  markNotificationRead,
} from "@/lib/notifications/notification-application.service";

import {
  PATCH,
} from "@/app/api/notifications/[id]/route";

const mockedAuthenticate =
  vi.mocked(
    authenticateApiRequest
  );

const mockedDismiss =
  vi.mocked(
    dismissUserNotification
  );

const mockedMarkRead =
  vi.mocked(
    markNotificationRead
  );

function createClient():
  SupabaseClient {
  return {} as
    SupabaseClient;
}

function createRequest(
  body:
    unknown
): Request {
  return new Request(
    "http://localhost/api/notifications/notification-123",
    {
      method:
        "PATCH",

      headers: {
        Authorization:
          "Bearer test-token",

        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(
          body
        ),
    }
  );
}

function createContext(
  id =
    "notification-123"
) {
  return {
    params:
      Promise.resolve({
        id,
      }),
  };
}

describe(
  "PATCH /api/notifications/[id]",
  () => {
    let consoleErrorSpy:
      ReturnType<
        typeof vi.spyOn
      >;

    beforeEach(
      () => {
        vi.clearAllMocks();

        consoleErrorSpy =
          vi.spyOn(
            console,
            "error"
          )
            .mockImplementation(
              () => undefined
            );

        mockedAuthenticate
          .mockResolvedValue({
            success:
              true,

            user: {
              id:
                "user-123",
            },

            client:
              createClient(),
          } as Awaited<
            ReturnType<
              typeof authenticateApiRequest
            >
          >);

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

    afterEach(
      () => {
        consoleErrorSpy
          .mockRestore();
      }
    );

    it(
      "returns 401 when authentication fails",
      async () => {
        mockedAuthenticate
          .mockResolvedValue({
            success:
              false,

            status:
              401,

            error:
              "Unauthorized",
          } as Awaited<
            ReturnType<
              typeof authenticateApiRequest
            >
          >);

        const response =
          await PATCH(
            createRequest({
              action:
                "read",
            }) as never,
            createContext()
          );

        expect(
          response.status
        ).toBe(
          401
        );

        const body =
          (await response.json()) as {
            error?:
              string;

            requestId?:
              string;
          };

        expect(
          body.error
        ).toBe(
          "Unauthorized"
        );

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          body.requestId
        );

        expect(
          mockedMarkRead
        ).not.toHaveBeenCalled();

        expect(
          mockedDismiss
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "marks a notification as read",
      async () => {
        const response =
          await PATCH(
            createRequest({
              action:
                "read",
            }) as never,
            createContext()
          );

        expect(
          response.status
        ).toBe(
          200
        );

        await expect(
          response.json()
        ).resolves.toEqual({
          success:
            true,

          notificationId:
            "notification-123",

          action:
            "read",
        });

        expect(
          mockedMarkRead
        ).toHaveBeenCalledWith({
          userId:
            "user-123",

          notificationId:
            "notification-123",

          client:
            expect.anything(),
        });

        expect(
          mockedDismiss
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "dismisses a notification",
      async () => {
        const response =
          await PATCH(
            createRequest({
              action:
                "dismiss",
            }) as never,
            createContext()
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          mockedDismiss
        ).toHaveBeenCalledWith({
          userId:
            "user-123",

          notificationId:
            "notification-123",

          client:
            expect.anything(),
        });

        expect(
          mockedMarkRead
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 400 for a blank notification ID",
      async () => {
        const response =
          await PATCH(
            createRequest({
              action:
                "read",
            }) as never,
            createContext(
              "   "
            )
          );

        expect(
          response.status
        ).toBe(
          400
        );

        await expect(
          response.json()
        ).resolves.toMatchObject({
          error:
            "Notification ID is required.",
        });

        expect(
          mockedMarkRead
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 400 for an unsupported action",
      async () => {
        const response =
          await PATCH(
            createRequest({
              action:
                "delete",
            }) as never,
            createContext()
          );

        expect(
          response.status
        ).toBe(
          400
        );

        await expect(
          response.json()
        ).resolves.toMatchObject({
          error:
            'Notification action must be "read" or "dismiss".',
        });

        expect(
          mockedMarkRead
        ).not.toHaveBeenCalled();

        expect(
          mockedDismiss
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 400 for malformed JSON",
      async () => {
        const request =
          new Request(
            "http://localhost/api/notifications/notification-123",
            {
              method:
                "PATCH",

              headers: {
                Authorization:
                  "Bearer test-token",

                "Content-Type":
                  "application/json",
              },

              body:
                "{invalid",
            }
          );

        const response =
          await PATCH(
            request as never,
            createContext()
          );

        expect(
          response.status
        ).toBe(
          400
        );

        await expect(
          response.json()
        ).resolves.toMatchObject({
          error:
            "A valid JSON request body is required.",
        });
      }
    );

    it(
      "returns 500 when lifecycle update fails",
      async () => {
        mockedMarkRead
          .mockRejectedValue(
            new Error(
              "Lifecycle update failed"
            )
          );

        const response =
          await PATCH(
            createRequest({
              action:
                "read",
            }) as never,
            createContext()
          );

        expect(
          response.status
        ).toBe(
          500
        );

        const body =
          (await response.json()) as {
            error?:
              string;

            requestId?:
              string;
          };

        expect(
          body.error
        ).toBe(
          "Could not update the notification."
        );

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          body.requestId
        );

        expect(
          consoleErrorSpy
        ).toHaveBeenCalled();
      }
    );
  }
);
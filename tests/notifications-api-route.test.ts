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
    getNotificationCenter:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/notifications/notification-response-contract.service",
  () => ({
    buildNotificationResponseContract:
      vi.fn(),
  })
);

import {
  authenticateApiRequest,
} from "@/lib/api/api-auth";

import {
  getNotificationCenter,
} from "@/lib/notifications/notification-application.service";

import {
  buildNotificationResponseContract,
} from "@/lib/notifications/notification-response-contract.service";

import {
  GET,
} from "@/app/api/notifications/route";

const mockedAuthenticateApiRequest =
  vi.mocked(
    authenticateApiRequest
  );

const mockedGetNotificationCenter =
  vi.mocked(
    getNotificationCenter
  );

const mockedBuildContract =
  vi.mocked(
    buildNotificationResponseContract
  );

function createClient():
  SupabaseClient {
  return {} as
    SupabaseClient;
}

function createRequest(
  query =
    ""
): Request {
  return new Request(
    `http://localhost/api/notifications${query}`,
    {
      method:
        "GET",

      headers: {
        Authorization:
          "Bearer test-token",
      },
    }
  );
}

describe(
  "GET /api/notifications",
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

        mockedAuthenticateApiRequest
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

        mockedGetNotificationCenter
          .mockResolvedValue({
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
                  "notification:user-123:repeat-checkin",

                createdAt:
                  "2026-08-07T03:00:00.000Z",

                readAt:
                  null,

                dismissedAt:
                  null,

                expiresAt:
                  null,
              },
            ],
          });

        mockedBuildContract
          .mockReturnValue({
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
                  "Complete a new check-in.",

                action: {
                  label:
                    "Open Check-In",

                  href:
                    "/checkin",
                },

                safety:
                  null,

                createdAt:
                  "2026-08-07T03:00:00.000Z",

                readAt:
                  null,

                expiresAt:
                  null,
              },
            ],
          });
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
        mockedAuthenticateApiRequest
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
          await GET(
            createRequest() as never
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
          body.requestId
        ).toMatch(
          /^req_[0-9a-f-]+$/i
        );

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          body.requestId
        );

        expect(
          mockedGetNotificationCenter
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns the authenticated notification center",
      async () => {
        const response =
          await GET(
            createRequest() as never
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
                "Complete a new check-in.",

              action: {
                label:
                  "Open Check-In",

                href:
                  "/checkin",
              },

              safety:
                null,

              createdAt:
                "2026-08-07T03:00:00.000Z",

              readAt:
                null,

              expiresAt:
                null,
            },
          ],
        });

        expect(
          mockedGetNotificationCenter
        ).toHaveBeenCalledWith({
          userId:
            "user-123",

          limit:
            20,

          client:
            expect.anything(),
        });

        expect(
          mockedBuildContract
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );

    it(
      "accepts a valid notification limit",
      async () => {
        await GET(
          createRequest(
            "?limit=50"
          ) as never
        );

        expect(
          mockedGetNotificationCenter
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            limit:
              50,
          })
        );
      }
    );

    it(
      "caps the notification limit at one hundred",
      async () => {
        await GET(
          createRequest(
            "?limit=500"
          ) as never
        );

        expect(
          mockedGetNotificationCenter
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            limit:
              100,
          })
        );
      }
    );

    it(
      "uses the default limit for invalid input",
      async () => {
        await GET(
          createRequest(
            "?limit=invalid"
          ) as never
        );

        expect(
          mockedGetNotificationCenter
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            limit:
              20,
          })
        );
      }
    );

    it(
      "returns 500 when notification loading fails",
      async () => {
        mockedGetNotificationCenter
          .mockRejectedValue(
            new Error(
              "Notification loading failed"
            )
          );

        const response =
          await GET(
            createRequest() as never
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
          "Could not load notifications."
        );

        expect(
          body.requestId
        ).toMatch(
          /^req_[0-9a-f-]+$/i
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
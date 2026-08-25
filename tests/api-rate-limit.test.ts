import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  consumePersistentApiRateLimit,
} from "@/lib/api/api-rate-limit";

describe(
  "API persistent rate limiting",
  () => {
    it(
      "maps the shared database rate-limit result",
      async () => {
        const rpc =
          vi.fn()
            .mockResolvedValue({
              data: [
                {
                  allowed:
                    true,

                  request_count:
                    2,

                  remaining:
                    3,

                  reset_at:
                    "2026-08-25T13:30:00.000Z",

                  retry_after_seconds:
                    0,
                },
              ],

              error:
                null,
            });

        const client =
          {
            rpc,
          } as never;

        const result =
          await consumePersistentApiRateLimit({
            client,

            key:
              "assistant:user-1",

            policy: {
              limit:
                5,

              windowMs:
                60_000,
            },
          });

        expect(
          rpc
        ).toHaveBeenCalledWith(
          "consume_api_rate_limit",
          {
            p_key:
              "assistant:user-1",

            p_limit:
              5,

            p_window_seconds:
              60,
          }
        );

        expect(
          result.allowed
        ).toBe(
          true
        );

        expect(
          result.remaining
        ).toBe(
          3
        );

        expect(
          result.retryAfterSeconds
        ).toBe(
          0
        );
      }
    );

    it(
      "preserves a blocked shared rate-limit result",
      async () => {
        const rpc =
          vi.fn()
            .mockResolvedValue({
              data: [
                {
                  allowed:
                    false,

                  request_count:
                    6,

                  remaining:
                    0,

                  reset_at:
                    "2026-08-25T13:30:00.000Z",

                  retry_after_seconds:
                    42,
                },
              ],

              error:
                null,
            });

        const client =
          {
            rpc,
          } as never;

        const result =
          await consumePersistentApiRateLimit({
            client,

            key:
              "voice:user-1",

            policy: {
              limit:
                5,

              windowMs:
                60_000,
            },
          });

        expect(
          result.allowed
        ).toBe(
          false
        );

        expect(
          result.remaining
        ).toBe(
          0
        );

        expect(
          result.retryAfterSeconds
        ).toBe(
          42
        );
      }
    );

    it(
      "rejects invalid policies before calling the database",
      async () => {
        const rpc =
          vi.fn();

        const client =
          {
            rpc,
          } as never;

        await expect(
          consumePersistentApiRateLimit({
            client,

            key:
              "assistant:user-1",

            policy: {
              limit:
                0,

              windowMs:
                60_000,
            },
          })
        ).rejects.toThrow(
          "Rate limit policy must use positive limit and window values."
        );

        expect(
          rpc
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed when the rate-limit RPC fails",
      async () => {
        const rpc =
          vi.fn()
            .mockResolvedValue({
              data:
                null,

              error: {
                message:
                  "Database unavailable",
              },
            });

        const client =
          {
            rpc,
          } as never;

        await expect(
          consumePersistentApiRateLimit({
            client,

            key:
              "assistant:user-1",

            policy: {
              limit:
                5,

              windowMs:
                60_000,
            },
          })
        ).rejects.toThrow(
          "Database unavailable"
        );
      }
    );
  }
);
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  resolveApiRateLimitIdentity,
} from "@/lib/api/api-rate-limit-identity";

describe(
  "API rate-limit identity",
  () => {
    it(
      "prefers the authenticated user id",
      () => {
        const request =
          new Request(
            "http://localhost/api/test",
            {
              headers: {
                "x-forwarded-for":
                  "203.0.113.10",
              },
            }
          );

        const identity =
          resolveApiRateLimitIdentity({
            request,

            userId:
              "user-123",
          });

        expect(
          identity
        ).toEqual({
          type:
            "user",

          value:
            "user-123",
        });
      }
    );

    it(
      "uses the first forwarded IP for anonymous requests",
      () => {
        const request =
          new Request(
            "http://localhost/api/test",
            {
              headers: {
                "x-forwarded-for":
                  "203.0.113.10, 10.0.0.1",
              },
            }
          );

        const identity =
          resolveApiRateLimitIdentity({
            request,
          });

        expect(
          identity
        ).toEqual({
          type:
            "ip",

          value:
            "203.0.113.10",
        });
      }
    );

    it(
      "falls back safely when no identity is available",
      () => {
        const request =
          new Request(
            "http://localhost/api/test"
          );

        const identity =
          resolveApiRateLimitIdentity({
            request,
          });

        expect(
          identity
        ).toEqual({
          type:
            "anonymous",

          value:
            "unknown",
        });
      }
    );
  }
);
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  GET,
} from "@/app/api/health/route";

describe(
  "GET /api/health",
  () => {
    it(
      "returns a lightweight public liveness response without dependency diagnostics",
      async () => {
        const response =
          await GET();

        const body =
          (await response.json()) as {
            status?:
              string;

            service?:
              string;

            timestamp?:
              string;

            requestId?:
              string;
          };

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          body.status
        ).toBe(
          "healthy"
        );

        expect(
          body.service
        ).toBe(
          "organheal"
        );

        expect(
          body.timestamp
        ).toEqual(
          expect.any(
            String
          )
        );

        expect(
          body.requestId
        ).toMatch(
          /^req_[0-9a-f-]+$/i
        );

        expect(
          body
        ).not.toHaveProperty(
          "checks"
        );

        expect(
          body
        ).not.toHaveProperty(
          "environment"
        );

        expect(
          body
        ).not.toHaveProperty(
          "durationMs"
        );

        expect(
          body
        ).not.toHaveProperty(
          "performance"
        );

        expect(
          response.headers.get(
            "cache-control"
          )
        ).toBe(
          "no-store"
        );

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          body.requestId
        );
      }
    );
  }
);
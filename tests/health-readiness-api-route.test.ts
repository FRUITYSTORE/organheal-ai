import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "@/lib/supabase-admin",
  () => ({
    getSupabaseAdminClient:
      vi.fn(),
  })
);

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

import {
  GET,
} from "@/app/api/internal/health/readiness/route";

const mockedGetSupabaseAdminClient =
  vi.mocked(
    getSupabaseAdminClient
  );

const ORIGINAL_ENV =
  process.env;

type QueryResult = {
  data?:
    unknown[];

  count?:
    number | null;

  error:
    null;
};

function createQueryBuilder(
  result:
    QueryResult
) {
  const builder = {
    select:
      vi.fn(),

    limit:
      vi.fn(),

    in:
      vi.fn(),

    lte:
      vi.fn(),

    eq:
      vi.fn(),

    is:
      vi.fn(),

    not:
      vi.fn(),

    then:
      (
        resolve:
          (
            value:
              QueryResult
          ) => unknown
      ) =>
        Promise.resolve(
          result
        ).then(
          resolve
        ),
  };

  builder.select
    .mockReturnValue(
      builder
    );

  builder.limit
    .mockReturnValue(
      builder
    );

  builder.in
    .mockReturnValue(
      builder
    );

  builder.lte
    .mockReturnValue(
      builder
    );

  builder.eq
    .mockReturnValue(
      builder
    );

  builder.is
    .mockReturnValue(
      builder
    );

  builder.not
    .mockReturnValue(
      builder
    );

  return builder;
}

function createRequest(
  authorization?:
    string
): Request {
  return new Request(
    "http://localhost/api/internal/health/readiness",
    {
      method:
        "GET",

      headers:
        authorization
          ? {
              authorization,
            }
          : {},
    }
  );
}

describe(
  "GET /api/internal/health/readiness",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();

        process.env = {
          ...ORIGINAL_ENV,

          HEALTH_READINESS_SECRET:
            "test-readiness-secret",
        };

        const client = {
          from:
            vi.fn(
              (
                table:
                  string
              ) => {
                if (
                  table ===
                  "profiles"
                ) {
                  return createQueryBuilder({
                    data:
                      [],

                    error:
                      null,
                  });
                }

                if (
                  table ===
                  "background_jobs"
                ) {
                  return createQueryBuilder({
                    count:
                      0,

                    error:
                      null,
                  });
                }

                throw new Error(
                  `Unexpected table: ${table}`
                );
              }
            ),
        };

        mockedGetSupabaseAdminClient
          .mockReturnValue(
            client as never
          );
      }
    );

    afterEach(
      () => {
        process.env =
          ORIGINAL_ENV;
      }
    );

    it(
      "returns 503 when the readiness secret is not configured",
      async () => {
        delete process.env
          .HEALTH_READINESS_SECRET;

        const response =
          await GET(
            createRequest(
              "Bearer test-readiness-secret"
            )
          );

        expect(
          response.status
        ).toBe(
          503
        );

        expect(
          mockedGetSupabaseAdminClient
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 401 when the readiness secret is invalid",
      async () => {
        const response =
          await GET(
            createRequest(
              "Bearer wrong-secret"
            )
          );

        expect(
          response.status
        ).toBe(
          401
        );

        expect(
          mockedGetSupabaseAdminClient
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns readiness diagnostics for an authorized operational request",
      async () => {
        const response =
          await GET(
            createRequest(
              "Bearer test-readiness-secret"
            )
          );

        const body =
          (await response.json()) as {
            status?:
              string;

            checks?: {
              database?: {
                status?:
                  string;
              };

              queue?: {
                status?:
                  string;
              };
            };

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
          body.checks
            ?.database
            ?.status
        ).toBe(
          "healthy"
        );

        expect(
          body.checks
            ?.queue
            ?.status
        ).toBe(
          "healthy"
        );

        expect(
          mockedGetSupabaseAdminClient
        ).toHaveBeenCalled();

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
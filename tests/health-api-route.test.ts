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
} from "@/app/api/health/route";

const mockedGetSupabaseAdminClient =
  vi.mocked(
    getSupabaseAdminClient
  );

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

describe(
  "GET /api/health",
  () => {
    let consoleInfoSpy:
      ReturnType<
        typeof vi.spyOn
      >;

    beforeEach(
      () => {
        consoleInfoSpy =
          vi
            .spyOn(
              console,
              "info"
            )
            .mockImplementation(
              () => undefined
            );

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
            client as unknown as
              ReturnType<
                typeof getSupabaseAdminClient
              >
          );
      }
    );

    afterEach(
      () => {
        consoleInfoSpy
          .mockRestore();

        mockedGetSupabaseAdminClient
          .mockReset();
      }
    );

    it(
      "returns healthy with status 200 when dependencies and queue are healthy",
      async () => {
        const response =
          await GET();

        const body =
          (await response.json()) as {
            status?:
              string;

            checks?: {
              database?: {
                status?:
                  string;

                durationMs?:
                  number;
              };

              queue?: {
                status?:
                  string;

                durationMs?:
                  number;
              };
            };

            requestId?:
              string;

            durationMs?:
              number;
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
          body.requestId
        ).toMatch(
          /^req_[0-9a-f-]+$/i
        );

        expect(
          body.durationMs
        ).toBeGreaterThanOrEqual(
          0
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

        expect(
          body.checks
        ).not.toHaveProperty(
          "diagnostics"
        );

        expect(
          body.checks
            ?.queue
        ).not.toHaveProperty(
          "diagnostics"
        );

        expect(
          consoleInfoSpy
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );
  }
);
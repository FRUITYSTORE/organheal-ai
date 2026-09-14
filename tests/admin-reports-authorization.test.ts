import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks =
  vi.hoisted(() => {
    return {
      authorizeAdminApiRequest:
        vi.fn(),

      getSupabaseAdminClient:
        vi.fn(),
    };
  });

vi.mock(
  "@/lib/api/api-admin-auth",
  () => ({
    authorizeAdminApiRequest:
      mocks.authorizeAdminApiRequest,
  })
);

vi.mock(
  "@/lib/supabase-admin",
  () => ({
    getSupabaseAdminClient:
      mocks.getSupabaseAdminClient,
  })
);

import {
  GET,
} from "@/app/api/admin/reports/route";

function createRequest() {
  return new Request(
    "http://localhost/api/admin/reports",
    {
      method:
        "GET",
    }
  );
}

describe(
  "admin reports authorization",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it(
      "returns 401 when authentication is missing",
      async () => {
        mocks
          .authorizeAdminApiRequest
          .mockResolvedValue({
            success: false,
            status: 401,
            error:
              "Authentication is required.",
          });

        const response =
          await GET(
            createRequest()
          );

        expect(
          response.status
        ).toBe(401);

        expect(
          mocks
            .getSupabaseAdminClient
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 403 when authenticated user is not an administrator",
      async () => {
        mocks
          .authorizeAdminApiRequest
          .mockResolvedValue({
            success: false,
            status: 403,
            error:
              "Administrator access is required.",
          });

        const response =
          await GET(
            createRequest()
          );

        expect(
          response.status
        ).toBe(403);

        expect(
          mocks
            .getSupabaseAdminClient
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns reports for an authorized administrator",
      async () => {
        mocks
          .authorizeAdminApiRequest
          .mockResolvedValue({
            success: true,

            token:
              "test-token",

            user: {
              id:
                "admin-user",
            },

            client: {},
          });

        const order =
          vi.fn()
            .mockResolvedValue({
              data: [
                {
                  id: 101,
                  file_name:
                    "synthetic.pdf",
                  report_type:
                    "lab",
                  created_at:
                    "2026-09-14T00:00:00.000Z",
                  extraction_status:
                    "Completed",
                  extracted_text:
                    "Synthetic report",
                  extracted_at:
                    "2026-09-14T00:01:00.000Z",
                  analysis_status:
                    "Completed",
                  ai_summary:
                    "Synthetic summary",
                },
              ],

              error: null,
            });

        const select =
          vi.fn(
            () => ({
              order,
            })
          );

        const from =
          vi.fn(
            () => ({
              select,
            })
          );

        mocks
          .getSupabaseAdminClient
          .mockReturnValue({
            from,
          });

        const response =
          await GET(
            createRequest()
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(200);

        expect(
          body.reports
        ).toHaveLength(1);

        expect(
          from
        ).toHaveBeenCalledWith(
          "uploaded_lab_files"
        );

        expect(
          select
        ).toHaveBeenCalled();

        expect(
          order
        ).toHaveBeenCalledWith(
          "created_at",
          {
            ascending: false,
          }
        );
      }
    );

    it(
      "keeps direct uploaded_lab_files access out of the browser page",
      () => {
        const pageSource =
          readFileSync(
            resolve(
              process.cwd(),
              "app/admin/reports/page.tsx"
            ),
            "utf8"
          );

        expect(
          pageSource
        ).toContain(
          '"/api/admin/reports"'
        );

        expect(
          pageSource
        ).not.toMatch(
          /\.from\(\s*["']uploaded_lab_files["']\s*\)/
        );

        expect(
          pageSource
        ).toContain(
          "Authorization:"
        );
      }
    );
  }
);
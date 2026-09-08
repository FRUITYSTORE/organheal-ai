import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createAssistantReportReferenceResolver,
} from "@/lib/health-intelligence/application/assistant-report-reference/assistant-report-reference-resolver.service";

import type {
  UploadedReportSummary,
} from "@/lib/repositories/reports.repository";

function createReport(
  id:
    number,
  fileName:
    string,
  createdAt:
    string,
  reportType =
    "laboratory"
): UploadedReportSummary {
  return {
    id,

    file_name:
      fileName,

    file_path:
      `user/report-${id}.pdf`,

    report_type:
      reportType,

    extraction_status:
      "completed",

    extracted_text:
      `Report ${id}`,

    created_at:
      createdAt,

    extracted_at:
      createdAt,
  };
}

const REPORTS:
  UploadedReportSummary[] = [
    createReport(
      105,
      "latest-report.pdf",
      "2026-09-05T10:00:00.000Z"
    ),

    createReport(
      104,
      "august-followup.pdf",
      "2026-08-20T10:00:00.000Z"
    ),

    createReport(
      103,
      "august-baseline.pdf",
      "2026-08-01T10:00:00.000Z"
    ),

    createReport(
      102,
      "july-report.pdf",
      "2026-07-01T10:00:00.000Z"
    ),

    createReport(
      101,
      "june-report.pdf",
      "2026-06-01T10:00:00.000Z"
    ),
  ];

function createHarness(
  reports =
    REPORTS
) {
  const getRecentReports =
    vi.fn(
      async (
        _userId:
          string,
        limit:
          number
      ) =>
        reports.slice(
          0,
          limit
        )
    );

  const getReportsByIds =
    vi.fn(
      async (
        _userId:
          string,
        reportIds:
          number[]
      ) =>
        reports.filter(
          (
            report
          ) =>
            reportIds.includes(
              report.id
            )
        )
    );

  const resolver =
    createAssistantReportReferenceResolver({
      getRecentReports,
      getReportsByIds,
    });

  return {
    resolver,
    getRecentReports,
    getReportsByIds,
  };
}

describe(
  "assistant report reference resolver",
  () => {
    it(
      "resolves the latest three real uploaded reports",
      async () => {
        const {
          resolver,
          getRecentReports,
        } =
          createHarness();

        const result =
          await resolver.resolve({
            userId:
              "user-1",

            reference: {
              kind:
                "latest",

              count:
                3,

              value:
                null,
            },

            activeReportId:
              null,
          });

        expect(
          result.status
        ).toBe(
          "resolved"
        );

        expect(
          result.reports.map(
            (
              report
            ) =>
              report.id
          )
        ).toEqual([
          105,
          104,
          103,
        ]);

        expect(
          getRecentReports
        ).toHaveBeenCalledWith(
          "user-1",
          3
        );
      }
    );

    it(
      "returns partial instead of inventing reports when fewer reports exist",
      async () => {
        const {
          resolver,
        } =
          createHarness(
            REPORTS.slice(
              0,
              2
            )
          );

        const result =
          await resolver.resolve({
            userId:
              "user-1",

            reference: {
              kind:
                "latest",

              count:
                3,

              value:
                null,
            },
          });

        expect(
          result.status
        ).toBe(
          "partial"
        );

        expect(
          result.resolvedCount
        ).toBe(
          2
        );

        expect(
          result.reports.map(
            (
              report
            ) =>
              report.id
          )
        ).toEqual([
          105,
          104,
        ]);
      }
    );

    it(
      "resolves previous reports relative to the active report",
      async () => {
        const {
          resolver,
        } =
          createHarness();

        const result =
          await resolver.resolve({
            userId:
              "user-1",

            reference: {
              kind:
                "previous",

              count:
                2,

              value:
                null,
            },

            activeReportId:
              104,
          });

        expect(
          result.status
        ).toBe(
          "resolved"
        );

        expect(
          result.reports.map(
            (
              report
            ) =>
              report.id
          )
        ).toEqual([
          103,
          102,
        ]);
      }
    );

    it(
      "uses the report before latest when previous has no active report",
      async () => {
        const {
          resolver,
        } =
          createHarness();

        const result =
          await resolver.resolve({
            userId:
              "user-1",

            reference: {
              kind:
                "previous",

              count:
                1,

              value:
                null,
            },

            activeReportId:
              null,
          });

        expect(
          result.reports.map(
            (
              report
            ) =>
              report.id
          )
        ).toEqual([
          104,
        ]);
      }
    );

    it(
      "verifies a current-conversation report against the authenticated user",
      async () => {
        const {
          resolver,
          getReportsByIds,
        } =
          createHarness();

        const result =
          await resolver.resolve({
            userId:
              "user-1",

            reference: {
              kind:
                "current-conversation",

              count:
                1,

              value:
                null,
            },

            activeReportId:
              103,
          });

        expect(
          result.status
        ).toBe(
          "resolved"
        );

        expect(
          result.reports[0]
            ?.id
        ).toBe(
          103
        );

        expect(
          getReportsByIds
        ).toHaveBeenCalledWith(
          "user-1",
          [
            103,
          ]
        );
      }
    );

    it(
      "does not guess a current-conversation report when none is active",
      async () => {
        const {
          resolver,
        } =
          createHarness();

        const result =
          await resolver.resolve({
            userId:
              "user-1",

            reference: {
              kind:
                "current-conversation",

              count:
                1,

              value:
                null,
            },

            activeReportId:
              null,
          });

        expect(
          result.status
        ).toBe(
          "ambiguous"
        );

        expect(
          result.reports
        ).toEqual([]);
      }
    );

    it(
      "uses the active report for an unspecified single-report reference",
      async () => {
        const {
          resolver,
        } =
          createHarness();

        const result =
          await resolver.resolve({
            userId:
              "user-1",

            reference: {
              kind:
                "unspecified",

              count:
                null,

              value:
                null,
            },

            activeReportId:
              104,
          });

        expect(
          result.status
        ).toBe(
          "resolved"
        );

        expect(
          result.reports[0]
            ?.id
        ).toBe(
          104
        );
      }
    );

    it(
      "defaults an unspecified report to latest when no report is active",
      async () => {
        const {
          resolver,
        } =
          createHarness();

        const result =
          await resolver.resolve({
            userId:
              "user-1",

            reference: {
              kind:
                "unspecified",

              count:
                null,

              value:
                null,
            },

            activeReportId:
              null,
          });

        expect(
          result.status
        ).toBe(
          "resolved"
        );

        expect(
          result.reports[0]
            ?.id
        ).toBe(
          105
        );
      }
    );

    it(
      "resolves a specific existing filename without inventing an ID",
      async () => {
        const {
          resolver,
        } =
          createHarness();

        const result =
          await resolver.resolve({
            userId:
              "user-1",

            reference: {
              kind:
                "specific",

              count:
                1,

              value:
                "august-followup.pdf",
            },
          });

        expect(
          result.status
        ).toBe(
          "resolved"
        );

        expect(
          result.reports[0]
            ?.id
        ).toBe(
          104
        );
      }
    );

    it(
      "returns ambiguous when specific metadata matches more than one report",
      async () => {
        const {
          resolver,
        } =
          createHarness();

        const result =
          await resolver.resolve({
            userId:
              "user-1",

            reference: {
              kind:
                "specific",

              count:
                1,

              value:
                "laboratory",
            },
          });

        expect(
          result.status
        ).toBe(
          "ambiguous"
        );

        expect(
          result.reports.length
        ).toBeGreaterThan(
          1
        );
      }
    );

    it(
      "does not parse a free-text range using unsafe keyword heuristics",
      async () => {
        const {
          resolver,
        } =
          createHarness();

        const result =
          await resolver.resolve({
            userId:
              "user-1",

            reference: {
              kind:
                "range",

              count:
                null,

              value:
                "last 3 months",
            },
          });

        expect(
          result.status
        ).toBe(
          "unsupported"
        );

        expect(
          result.reports
        ).toEqual([]);
      }
    );
  }
);
import type {
  UploadedReportSummary,
} from "@/lib/repositories/reports.repository";

import type {
  AssistantReportReferenceResolution,
  AssistantReportReferenceResolver,
  AssistantReportReferenceResolverDependencies,
  AssistantReportReferenceResolverInput,
} from "./assistant-report-reference.types";

const MAX_REPORT_LOOKBACK =
  100;

const MAX_REQUESTED_REPORTS =
  50;

function normalizeRequestedCount(
  count:
    number | null
): number {
  if (
    !Number.isInteger(
      count
    ) ||
    count === null ||
    count < 1
  ) {
    return 1;
  }

  return Math.min(
    count,
    MAX_REQUESTED_REPORTS
  );
}

function createResolution({
  input,
  status,
  reports,
  requestedCount,
  reason,
}: {
  input:
    AssistantReportReferenceResolverInput;

  status:
    AssistantReportReferenceResolution["status"];

  reports:
    UploadedReportSummary[];

  requestedCount:
    number;

  reason:
    string;
}): AssistantReportReferenceResolution {
  return {
    status,

    reference:
      input.reference,

    reports,

    requestedCount,

    resolvedCount:
      reports.length,

    reason,
  };
}

function createCountedResolution({
  input,
  reports,
  requestedCount,
  emptyReason,
}: {
  input:
    AssistantReportReferenceResolverInput;

  reports:
    UploadedReportSummary[];

  requestedCount:
    number;

  emptyReason:
    string;
}): AssistantReportReferenceResolution {
  if (
    reports.length === 0
  ) {
    return createResolution({
      input,

      status:
        "not-found",

      reports:
        [],

      requestedCount,

      reason:
        emptyReason,
    });
  }

  if (
    reports.length <
    requestedCount
  ) {
    return createResolution({
      input,

      status:
        "partial",

      reports,

      requestedCount,

      reason:
        "Fewer matching reports exist than the number requested.",
    });
  }

  return createResolution({
    input,

    status:
      "resolved",

    reports,

    requestedCount,

    reason:
      "The requested report reference was resolved.",
  });
}

function normalizeText(
  value:
    string | null | undefined
): string {
  return (
    value ?? ""
  )
    .normalize(
      "NFKC"
    )
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    );
}

function removeFileExtension(
  value:
    string
): string {
  return value.replace(
    /\.[a-z0-9]{1,10}$/i,
    ""
  );
}

function getSpecificReportMatches(
  reports:
    UploadedReportSummary[],
  requestedValue:
    string
): UploadedReportSummary[] {
  const normalizedRequestedValue =
    normalizeText(
      requestedValue
    );

  if (
    !normalizedRequestedValue
  ) {
    return [];
  }

  const exactMatches =
    reports.filter(
      (
        report
      ) => {
        const normalizedFileName =
          normalizeText(
            report.file_name
          );

        const normalizedFileNameWithoutExtension =
          removeFileExtension(
            normalizedFileName
          );

        const normalizedReportType =
          normalizeText(
            report.report_type
          );

        const normalizedCreatedAt =
          normalizeText(
            report.created_at
          );

        return (
          normalizedRequestedValue ===
            String(
              report.id
            ) ||
          normalizedRequestedValue ===
            normalizedFileName ||
          normalizedRequestedValue ===
            normalizedFileNameWithoutExtension ||
          normalizedRequestedValue ===
            normalizedReportType ||
          normalizedCreatedAt.startsWith(
            normalizedRequestedValue
          )
        );
      }
    );

  if (
    exactMatches.length >
    0
  ) {
    return exactMatches;
  }

  /*
   * Safe secondary matching is limited to
   * existing report metadata.
   *
   * It never creates or guesses an ID.
   */
  if (
    normalizedRequestedValue.length <
    4
  ) {
    return [];
  }

  return reports.filter(
    (
      report
    ) => {
      const normalizedFileName =
        normalizeText(
          report.file_name
        );

      const normalizedReportType =
        normalizeText(
          report.report_type
        );

      return (
        normalizedFileName.includes(
          normalizedRequestedValue
        ) ||
        normalizedReportType.includes(
          normalizedRequestedValue
        )
      );
    }
  );
}

export function createAssistantReportReferenceResolver(
  dependencies:
    AssistantReportReferenceResolverDependencies
): AssistantReportReferenceResolver {
  return {
    async resolve(
      input:
        AssistantReportReferenceResolverInput
    ): Promise<
      AssistantReportReferenceResolution
    > {
      const requestedCount =
        normalizeRequestedCount(
          input.reference.count
        );

      switch (
        input.reference.kind
      ) {
        case "latest": {
          const reports =
            await dependencies
              .getRecentReports(
                input.userId,
                requestedCount
              );

          return createCountedResolution({
            input,

            reports:
              reports.slice(
                0,
                requestedCount
              ),

            requestedCount,

            emptyReason:
              "No uploaded reports were found for the authenticated user.",
          });
        }

        case "previous": {
          const reports =
            await dependencies
              .getRecentReports(
                input.userId,
                MAX_REPORT_LOOKBACK
              );

          if (
            reports.length === 0
          ) {
            return createResolution({
              input,

              status:
                "not-found",

              reports:
                [],

              requestedCount,

              reason:
                "No uploaded reports were found for the authenticated user.",
            });
          }

          let anchorIndex =
            0;

          if (
            input.activeReportId !==
              null &&
            input.activeReportId !==
              undefined
          ) {
            anchorIndex =
              reports.findIndex(
                (
                  report
                ) =>
                  report.id ===
                  input.activeReportId
              );

            if (
              anchorIndex ===
              -1
            ) {
              return createResolution({
                input,

                status:
                  "not-found",

                reports:
                  [],

                requestedCount,

                reason:
                  "The active report could not be verified within the authenticated user's recent reports.",
              });
            }
          }

          const previousReports =
            reports.slice(
              anchorIndex + 1,
              anchorIndex +
                1 +
                requestedCount
            );

          return createCountedResolution({
            input,

            reports:
              previousReports,

            requestedCount,

            emptyReason:
              "No earlier report exists relative to the resolved report context.",
          });
        }

        case "current-conversation": {
          if (
            input.activeReportId ===
              null ||
            input.activeReportId ===
              undefined
          ) {
            return createResolution({
              input,

              status:
                "ambiguous",

              reports:
                [],

              requestedCount,

              reason:
                "No active report is available in the current conversation context.",
            });
          }

          const reports =
            await dependencies
              .getReportsByIds(
                input.userId,
                [
                  input
                    .activeReportId,
                ]
              );

          if (
            reports.length !==
            1
          ) {
            return createResolution({
              input,

              status:
                "not-found",

              reports:
                [],

              requestedCount,

              reason:
                "The active report could not be verified for the authenticated user.",
            });
          }

          return createResolution({
            input,

            status:
              "resolved",

            reports,

            requestedCount:
              1,

            reason:
              "The report active in the current conversation was verified.",
          });
        }

        case "specific": {
          const requestedValue =
            input.reference
              .value
              ?.trim();

          if (
            !requestedValue
          ) {
            return createResolution({
              input,

              status:
                "ambiguous",

              reports:
                [],

              requestedCount,

              reason:
                "The specific report reference does not contain enough identifying information.",
            });
          }

          const reports =
            await dependencies
              .getRecentReports(
                input.userId,
                MAX_REPORT_LOOKBACK
              );

          const matches =
            getSpecificReportMatches(
              reports,
              requestedValue
            );

          if (
            matches.length ===
            0
          ) {
            return createResolution({
              input,

              status:
                "not-found",

              reports:
                [],

              requestedCount,

              reason:
                "No uploaded report matched the requested report description.",
            });
          }

          if (
            matches.length >
            1
          ) {
            return createResolution({
              input,

              status:
                "ambiguous",

              reports:
                matches,

              requestedCount,

              reason:
                "More than one uploaded report matched the requested report description.",
            });
          }

          return createResolution({
            input,

            status:
              "resolved",

            reports:
              matches,

            requestedCount:
              1,

            reason:
              "A specific uploaded report was resolved from authenticated report metadata.",
          });
        }

        case "range": {
          return createResolution({
            input,

            status:
              "unsupported",

            reports:
              [],

            requestedCount,

            reason:
              "A structured date range is required before report ranges can be resolved safely.",
          });
        }

        case "unspecified": {
          /*
           * Product policy:
           *
           * If a report is already active in the
           * conversation, keep using it.
           *
           * Otherwise use the latest uploaded
           * report rather than asking the user
           * to repeat information unnecessarily.
           */
          if (
            input.activeReportId !==
              null &&
            input.activeReportId !==
              undefined &&
            requestedCount ===
              1
          ) {
            const activeReports =
              await dependencies
                .getReportsByIds(
                  input.userId,
                  [
                    input
                      .activeReportId,
                  ]
                );

            if (
              activeReports.length ===
              1
            ) {
              return createResolution({
                input,

                status:
                  "resolved",

                reports:
                  activeReports,

                requestedCount:
                  1,

                reason:
                  "The active conversation report was used for the unspecified report reference.",
              });
            }
          }

          const reports =
            await dependencies
              .getRecentReports(
                input.userId,
                requestedCount
              );

          return createCountedResolution({
            input,

            reports:
              reports.slice(
                0,
                requestedCount
              ),

            requestedCount,

            emptyReason:
              "No uploaded reports were found for the authenticated user.",
          });
        }
      }
    },
  };
}
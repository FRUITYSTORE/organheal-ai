import {
  after,
  NextResponse,
} from "next/server";

import {
  authenticateApiRequest,
} from "@/lib/api/api-auth";

import {
  resolveApiRateLimitIdentity,
} from "@/lib/api/api-rate-limit-identity";

import {
  consumePersistentApiRateLimit,
} from "@/lib/api/api-rate-limit";

import {
  createApiRequestId,
  logApiError,
  logApiInfo,
} from "@/lib/api/api-logger";

import {
  createBackgroundJobRuntime,
} from "@/lib/jobs/background-job-runtime";

import {
  BackgroundJobService,
} from "@/lib/jobs/background-job.service";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

export const runtime =
  "nodejs";

const PDF_EXTRACTION_RATE_LIMIT = {
  limit:
    10,

  windowMs:
    60_000,
} as const;

type ExtractPdfRequestPayload = {
  reportId?:
    unknown;

  insightId?:
    unknown;

  filePath?:
    unknown;

  fileName?:
    unknown;
};

function normalizeNumericId(
  value:
    unknown
): number | null {
  if (
    typeof value ===
      "number" &&
    Number.isInteger(
      value
    ) &&
    value > 0
  ) {
    return value;
  }

  if (
    typeof value ===
      "string"
  ) {
    const parsedValue =
      Number(
        value
      );

    if (
      Number.isInteger(
        parsedValue
      ) &&
      parsedValue > 0
    ) {
      return parsedValue;
    }
  }

  return null;
}

function normalizeStoragePath(
  path:
    string
): string {
  return path
    .trim()
    .replace(
      /^\/+/,
      ""
    )
    .replace(
      /^lab-reports\//,
      ""
    );
}

function getFileNameFromPath(
  path:
    string
): string {
  return (
    path
      .split(
        "/"
      )
      .pop() ||
    path
  );
}

export async function POST(
  request:
    Request
) {
  const requestId =
    createApiRequestId();

  try {
    const authentication =
      await authenticateApiRequest(
        request
      );

    if (
      !authentication.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            authentication.error,

          requestId,
        },
        {
          status:
            authentication.status,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const payload =
      (await request
        .json()) as
        ExtractPdfRequestPayload;

    const reportId =
      normalizeNumericId(
        payload.reportId
      );

    const insightId =
      normalizeNumericId(
        payload.insightId
      );

    const payloadFilePath =
      typeof payload.filePath ===
        "string"
        ? payload.filePath
        : "";

    const payloadFileName =
      typeof payload.fileName ===
        "string"
        ? payload.fileName
        : "";

    const supabase =
      authentication.client;

    const user =
      authentication.user;

    let resolvedReportId =
      reportId;

    let resolvedFilePath =
      payloadFilePath;

    let resolvedFileName =
      payloadFileName;

    if (
      (
        !resolvedReportId ||
        !resolvedFilePath
      ) &&
      insightId
    ) {
      const {
        data:
          insightData,

        error:
          insightError,
      } =
        await supabase
          .from(
            "health_insights"
          )
          .select(
            "id, report_id"
          )
          .eq(
            "id",
            insightId
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (insightError) {
        throw insightError;
      }

      if (
        insightData
          ?.report_id
      ) {
        resolvedReportId =
          insightData
            .report_id;
      }
    }

    if (
      resolvedReportId &&
      (
        !resolvedFilePath ||
        !resolvedFileName
      )
    ) {
      const {
        data:
          reportData,

        error:
          reportError,
      } =
        await supabase
          .from(
            "uploaded_lab_files"
          )
          .select(
            "id, file_name, file_path"
          )
          .eq(
            "id",
            resolvedReportId
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (reportError) {
        throw reportError;
      }

      if (
        reportData
          ?.file_path
      ) {
        resolvedFilePath =
          reportData
            .file_path;
      }

      if (
        reportData
          ?.file_name
      ) {
        resolvedFileName =
          reportData
            .file_name;
      }
    }

    const storagePath =
      normalizeStoragePath(
        resolvedFilePath
      );

    if (
      !resolvedReportId ||
      !storagePath ||
      !storagePath.startsWith(
        `${user.id}/`
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Report file path is missing or invalid. Please re-upload the report.",

          requestId,
        },
        {
          status:
            404,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const fileName =
      resolvedFileName ||
      getFileNameFromPath(
        storagePath
      );

    if (!fileName) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Report file name is missing. Please re-upload the report.",

          requestId,
        },
        {
          status:
            400,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

      const rateLimitIdentity =
        resolveApiRateLimitIdentity({
        request,

        userId:
        user.id,
     });

      const adminClient =
        getSupabaseAdminClient();

              const backgroundJobService =
        new BackgroundJobService(
          adminClient
        );

      const existingJobId =
        await backgroundJobService
          .findActivePdfExtraction({
            userId:
              user.id,

            reportId:
              resolvedReportId,
          });

      if (
        existingJobId
      ) {
        logApiInfo(
          "extract_pdf.existing_job_reused",
          {
            route:
              "/api/extract-pdf",

            requestId,

            jobId:
              existingJobId,

            reportId:
              resolvedReportId,
          }
        );

                after(
          async () => {
            try {
              const runtimeInstance =
                createBackgroundJobRuntime();

              const processed =
                await runtimeInstance
                  .worker
                  .processById(
                    existingJobId
                  );

              logApiInfo(
                "extract_pdf.existing_job_kick_completed",
                {
                  route:
                    "/api/extract-pdf",

                  requestId,

                  jobId:
                    existingJobId,

                  reportId:
                    resolvedReportId,

                  processed,
                }
              );
            } catch (error) {
              logApiError(
                "extract_pdf.existing_job_kick_failed",
                error,
                {
                  route:
                    "/api/extract-pdf",

                  requestId,

                  jobId:
                    existingJobId,

                  reportId:
                    resolvedReportId,
                }
              );
            }
          }
        );

        return NextResponse.json(
          {
            success:
              true,

            status:
              "processing",

            jobId:
              existingJobId,

            reportId:
              resolvedReportId,

            requestId,
          },
          {
            status:
              202,

            headers: {
              "x-request-id":
                requestId,
            },
          }
        );
      }

      const rateLimit =
        await consumePersistentApiRateLimit({
        client:
        adminClient,

      key:
      `pdf-extraction:${rateLimitIdentity.type}:${rateLimitIdentity.value}`,

      policy:
      PDF_EXTRACTION_RATE_LIMIT,
   });

if (
  !rateLimit.allowed
) {
  return NextResponse.json(
    {
      success:
        false,

      error:
        "Too many report extraction requests. Please try again shortly.",

      requestId,
    },
    {
      status:
        429,

      headers: {
        "x-request-id":
          requestId,

        "retry-after":
          String(
            rateLimit.retryAfterSeconds
          ),

        "x-ratelimit-limit":
          String(
            rateLimit.limit
          ),

        "x-ratelimit-remaining":
          String(
            rateLimit.remaining
          ),
      },
    }
  );
}

    const enqueueResult =
      await backgroundJobService
        .enqueuePdfExtraction({
          userId:
            user.id,

          requestId,

          payload: {
            reportId:
              resolvedReportId,

            insightId,

            storagePath,

            fileName,
          },
        });

    const jobId =
      enqueueResult.jobId;

         if (
      enqueueResult.created
    ) {
      const {
        error:
          statusUpdateError,
      } =
        await supabase
          .from(
            "uploaded_lab_files"
          )
          .update({
            extraction_status:
              "Pending",
          })
          .eq(
            "id",
            resolvedReportId
          )
          .eq(
            "user_id",
            user.id
          );

      if (
        statusUpdateError
      ) {
        throw statusUpdateError;
      }

      after(
        async () => {
          try {
            const runtimeInstance =
              createBackgroundJobRuntime();

            const processed =
              await runtimeInstance
                .worker
                .processById(
                  jobId
                );

            logApiInfo(
              "extract_pdf.background_kick_completed",
              {
                route:
                  "/api/extract-pdf",

                requestId,

                jobId,

                reportId:
                  resolvedReportId,

                processed,
              }
            );

          } catch (error) {
            logApiError(
              "extract_pdf.background_kick_failed",
              error,
              {
                route:
                  "/api/extract-pdf",

                requestId,

                jobId,

                reportId:
                  resolvedReportId,
              }
            );
          }
        }
      );
    }

    return NextResponse.json(
      {
        success:
          true,

        status:
          "pending",

        jobId,

        reportId:
          resolvedReportId,

        requestId,
      },
      {
        status:
          202,

        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  } catch (error) {
    logApiError(
      "extract_pdf.request_failed",
      error,
      {
        route:
          "/api/extract-pdf",

        requestId,
      }
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Could not queue report extraction. Please try again.",

        requestId,
      },
      {
        status:
          500,

        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  }
}
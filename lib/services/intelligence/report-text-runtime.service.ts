import {
  supabase,
} from "@/lib/supabase";

import {
  getUploadedReportExtractedText,
} from "@/lib/repositories/reports.repository";

type LoadReportTextRuntimeInput = {
  userId:
    string;

  insightId:
    number;

  reportId:
    number | null;

  filePath:
    string | null | undefined;

  fileName:
    string | null | undefined;
};

export type ReportTextRuntimeStatus =
  | "ready"
  | "processing"
  | "failed";

export type LoadReportTextRuntimeResult = {
  status:
    ReportTextRuntimeStatus;

  extractedText:
    string | null;

  errorMessage:
    string | null;

  requiresLogin:
    boolean;

  jobId:
    string | null;

  requestId:
    string | null;
};

type ExtractPdfApiResponse = {
  success?:
    boolean;

  status?:
    "pending" |
    "processing" |
    "completed" |
    "failed";

  jobId?:
    string;

  requestId?:
    string;

  text?:
    string;

  error?:
    string;
};

export async function loadReportTextRuntime({
  userId,
  insightId,
  reportId,
  filePath,
  fileName,
}: LoadReportTextRuntimeInput): Promise<LoadReportTextRuntimeResult> {
  let extractedText:
    string | null =
      null;

  if (reportId) {
    try {
      extractedText =
        await getUploadedReportExtractedText(
          userId,
          reportId
        );
    } catch (error) {
      console.error(
        "Could not load saved extracted report text",
        error
      );

      extractedText =
        null;
    }
  }

  if (
    extractedText &&
    extractedText
      .trim()
      .length >= 30
  ) {
    return {
      status:
        "ready",

      extractedText:
        extractedText.trim(),

      errorMessage:
        null,

      requiresLogin:
        false,

      jobId:
        null,

      requestId:
        null,
    };
  }

  if (
    reportId &&
    filePath
  ) {
    try {
      const {
        data:
          sessionData,

        error:
          sessionError,
      } =
        await supabase
          .auth
          .getSession();

      if (
        sessionError ||
        !sessionData
          .session
          ?.access_token
      ) {
        return {
          status:
            "failed",

          extractedText:
            null,

          errorMessage:
            "Your session expired. Please login again.",

          requiresLogin:
            true,

          jobId:
            null,

          requestId:
            null,
        };
      }

      const extractionResponse =
        await fetch(
          "/api/extract-pdf",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${sessionData.session.access_token}`,
            },

            body:
              JSON.stringify({
                insightId,
                reportId,
                filePath,
                fileName,
              }),
          }
        );

      const extractionResult =
        (await extractionResponse
          .json()) as
          ExtractPdfApiResponse;

      const responseRequestId =
        extractionResult.requestId ??
        extractionResponse
          .headers
          .get(
            "x-request-id"
          );

      /*
       * New asynchronous contract:
       * the extraction job was accepted and will
       * continue through the durable worker.
       */
      if (
        extractionResponse.status ===
          202 &&
        extractionResult.success ===
          true
      ) {
        return {
          status:
            "processing",

          extractedText:
            null,

          errorMessage:
            null,

          requiresLogin:
            false,

          jobId:
            extractionResult.jobId ??
            null,

          requestId:
            responseRequestId,
        };
      }

      if (
        !extractionResponse.ok ||
        extractionResult.success !==
          true
      ) {
        return {
          status:
            "failed",

          extractedText:
            null,

          errorMessage:
            extractionResult.error ||
            "PDF extraction failed.",

          requiresLogin:
            extractionResponse.status ===
              401,

          jobId:
            extractionResult.jobId ??
            null,

          requestId:
            responseRequestId,
        };
      }

      /*
       * Temporary support for the existing synchronous
       * contract until /api/extract-pdf becomes
       * producer-only.
       */
      extractedText =
        typeof extractionResult.text ===
          "string"
          ? extractionResult
              .text
              .trim()
          : null;

      if (
        extractedText &&
        extractedText.length >=
          30
      ) {
        return {
          status:
            "ready",

          extractedText,

          errorMessage:
            null,

          requiresLogin:
            false,

          jobId:
            extractionResult.jobId ??
            null,

          requestId:
            responseRequestId,
        };
      }
    } catch (error) {
      console.error(
        "Extraction failed",
        error
      );

      return {
        status:
          "failed",

        extractedText:
          null,

        errorMessage:
          "Extraction failed.",

        requiresLogin:
          false,

        jobId:
          null,

        requestId:
          null,
      };
    }
  }

  return {
    status:
      "failed",

    extractedText:
      null,

    errorMessage:
      "No readable report text was extracted yet.",

    requiresLogin:
      false,

    jobId:
      null,

    requestId:
      null,
  };
}
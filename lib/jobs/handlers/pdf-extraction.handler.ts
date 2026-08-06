import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

import type {
  JobHandler,
} from "@/lib/jobs/job-handler";

import type {
  DurableBackgroundJob,
} from "@/lib/jobs/background-job-worker.repository";

import {
  executePdfExtraction,
  type PdfExtractionPayload,
} from "@/lib/jobs/handlers/pdf-extraction.service";

function isPdfExtractionPayload(
  value: unknown
): value is PdfExtractionPayload {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const payload =
    value as Record<
      string,
      unknown
    >;

  const reportIdIsValid =
    payload.reportId === null ||
    typeof payload.reportId ===
      "number";

  const insightIdIsValid =
    payload.insightId === null ||
    typeof payload.insightId ===
      "number";

  return (
    reportIdIsValid &&
    insightIdIsValid &&
    typeof payload.storagePath ===
      "string" &&
    payload.storagePath.length >
      0 &&
    typeof payload.fileName ===
      "string" &&
    payload.fileName.length >
      0
  );
}

export function createPdfExtractionHandler(
  client:
    SupabaseClient =
      getSupabaseAdminClient()
): JobHandler {
  return async (
    backgroundJob
  ): Promise<void> => {
    const job =
      backgroundJob as
        DurableBackgroundJob;

    if (
      typeof job.userId !==
        "string" ||
      !job.userId
    ) {
      throw new Error(
        "PDF extraction job is missing the user ID."
      );
    }

    if (
      !isPdfExtractionPayload(
        job.payload
      )
    ) {
      throw new Error(
        "PDF extraction job payload is invalid."
      );
    }

    await executePdfExtraction({
      client,

      userId:
        job.userId,

      payload:
        job.payload,
    });
  };
}
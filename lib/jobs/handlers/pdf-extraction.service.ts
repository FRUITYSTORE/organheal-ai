import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  getReportFileRejectionReason,
  REPORT_UPLOAD_SUPPORTED_EXTENSIONS_LABEL,
  resolveReportFileCapability,
} from "@/lib/report-ingestion/report-file-capabilities";

import {
  extractReportTextFromBuffer,
  type ExtractedReportFileType,
} from "@/lib/report-ingestion/report-text-extractor";

export type PdfExtractionPayload = {
  reportId:
    number | null;

  insightId:
    number | null;

  storagePath:
    string;

  fileName:
    string;
};

export type PdfExtractionResult = {
  reportId:
    number | null;

  fileName:
    string;

  fileType:
    ExtractedReportFileType;

  text:
    string;
};

export class PdfExtractionError
  extends Error {
  constructor(
    message:
      string,

    public readonly statusCode:
      number,

    public readonly publicMessage:
      string
  ) {
    super(
      message
    );

    this.name =
      "PdfExtractionError";
  }
}

async function updateExtractionStatus(
  client:
    SupabaseClient,

  userId:
    string,

  reportId:
    number | null,

  values:
    Record<
      string,
      unknown
    >
): Promise<void> {
  if (
    !reportId
  ) {
    return;
  }

  const {
    error,
  } =
    await client
      .from(
        "uploaded_lab_files"
      )
      .update(
        values
      )
      .eq(
        "id",
        reportId
      )
      .eq(
        "user_id",
        userId
      );

  if (
    error
  ) {
    throw error;
  }
}

/*
 * NOTE:
 * The legacy exported names are intentionally preserved because
 * existing API routes, background-job records, tests and workers
 * still use the historical "PDF extraction" contract.
 *
 * The implementation itself is now capability-aware and handles
 * multiple report formats.
 */
export async function executePdfExtraction({
  client,
  userId,
  payload,
}: {
  client:
    SupabaseClient;

  userId:
    string;

  payload:
    PdfExtractionPayload;
}): Promise<
  PdfExtractionResult
> {
  const {
    reportId,
    storagePath,
    fileName,
  } =
    payload;

  if (
    !storagePath ||
    !storagePath.startsWith(
      `${userId}/`
    )
  ) {
    throw new PdfExtractionError(
      "Invalid or missing report storage path.",
      404,
      "Report file path is missing or invalid. Please re-upload the report."
    );
  }

  const capability =
    resolveReportFileCapability({
      fileName,
    });

  if (
    !capability ||
    !capability
      .uploadEnabled ||
    !capability
      .analysisEnabled
  ) {
    await updateExtractionStatus(
      client,
      userId,
      reportId,
      {
        extraction_status:
          "Failed",
      }
    );

    const reason =
      getReportFileRejectionReason({
        fileName,
      });

    throw new PdfExtractionError(
      `Unsupported report file type: ${reason}`,
      400,
      `This report format is not available for analysis yet. Supported formats: ${REPORT_UPLOAD_SUPPORTED_EXTENSIONS_LABEL}.`
    );
  }

  await updateExtractionStatus(
    client,
    userId,
    reportId,
    {
      extraction_status:
        "Processing",
    }
  );

  const {
    data:
      fileBlob,

    error:
      downloadError,
  } =
    await client.storage
      .from(
        "lab-reports"
      )
      .download(
        storagePath
      );

  if (
    downloadError ||
    !fileBlob
  ) {
    await updateExtractionStatus(
      client,
      userId,
      reportId,
      {
        extraction_status:
          "Failed",
      }
    );

    throw new PdfExtractionError(
      downloadError
        ?.message ||
        "Report storage download failed.",
      500,
      "Report file could not be opened. Please re-upload the report."
    );
  }

  const buffer =
    Buffer.from(
      await fileBlob
        .arrayBuffer()
    );

  try {
    const result =
      await extractReportTextFromBuffer({
        buffer,

        fileName,

        mimeType:
          fileBlob.type ||
          null,
      });

    await updateExtractionStatus(
      client,
      userId,
      reportId,
      {
        extracted_text:
          result.text,

        extraction_status:
          "Completed",

        extracted_at:
          new Date()
            .toISOString(),
      }
    );

    return {
      reportId,

      fileName,

      fileType:
        result.fileType,

      text:
        result.text,
    };
  } catch (
    error
  ) {
    await updateExtractionStatus(
      client,
      userId,
      reportId,
      {
        extraction_status:
          "Failed",

        extracted_text:
          null,
      }
    );

    throw new PdfExtractionError(
      error instanceof
        Error
        ? error.message
        : String(
            error
          ),
      422,
      "OrganHeal could not read usable content from this report. Check the file format and try again."
    );
  }
}
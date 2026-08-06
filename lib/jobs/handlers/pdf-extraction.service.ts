import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import PDFParser from "pdf2json";

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
    "pdf" | "image";

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

function safeDecode(
  text:
    string
): string {
  try {
    return decodeURIComponent(
      text
    );
  } catch {
    return text;
  }
}

function getFileType(
  fileName:
    string
): "pdf" | "image" | "unknown" {
  const normalizedFileName =
    fileName.toLowerCase();

  if (
    normalizedFileName.endsWith(
      ".pdf"
    )
  ) {
    return "pdf";
  }

  if (
    normalizedFileName.endsWith(
      ".png"
    ) ||
    normalizedFileName.endsWith(
      ".jpg"
    ) ||
    normalizedFileName.endsWith(
      ".jpeg"
    )
  ) {
    return "image";
  }

  return "unknown";
}

function extractTextFromPdfBuffer(
  buffer:
    Buffer
): Promise<string> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const parser =
        new PDFParser();

      parser.on(
        "pdfParser_dataError",
        (
          errorData
        ) => {
          reject(
            errorData instanceof Error
              ? errorData
              : errorData.parserError ||
                  new Error(
                    "PDF parsing failed."
                  )
          );
        }
      );

      parser.on(
        "pdfParser_dataReady",
        (
          pdfData
        ) => {
          try {
            const text =
              pdfData.Pages
                .map(
                  (
                    page
                  ) =>
                    page.Texts
                      .map(
                        (
                          textItem
                        ) =>
                          safeDecode(
                            textItem.R
                              .map(
                                (
                                  item
                                ) =>
                                  item.T
                              )
                              .join(
                                " "
                              )
                          )
                      )
                      .join(
                        " "
                      )
                )
                .join(
                  "\n\n"
                );

            resolve(
              text.trim()
            );
          } catch (
            error
          ) {
            reject(
              error
            );
          }
        }
      );

      parser.parseBuffer(
        buffer
      );
    }
  );
}

async function extractTextFromImageBuffer(
  buffer:
    Buffer
): Promise<string> {
  const apiKey =
    process.env
      .OCR_SPACE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OCR image extraction is not configured on the server."
    );
  }

  const formData =
    new FormData();

  formData.append(
    "base64Image",
    `data:image/png;base64,${buffer.toString(
      "base64"
    )}`
  );

  formData.append(
    "language",
    "eng"
  );

  formData.append(
    "isOverlayRequired",
    "false"
  );

  formData.append(
    "OCREngine",
    "2"
  );

  const response =
    await fetch(
      "https://api.ocr.space/parse/image",
      {
        method:
          "POST",

        headers: {
          apikey:
            apiKey,
        },

        body:
          formData,
      }
    );

  const data =
    (await response.json()) as {
      IsErroredOnProcessing?:
        boolean;

      ErrorMessage?:
        string[];

      ParsedResults?:
        Array<{
          ParsedText?:
            string;
        }>;
    };

  if (
    !response.ok ||
    data.IsErroredOnProcessing
  ) {
    throw new Error(
      data.ErrorMessage?.[0] ||
        "Image OCR failed."
    );
  }

  return (
    data.ParsedResults?.[0]
      ?.ParsedText?.trim() ||
    ""
  );
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
  if (!reportId) {
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

  if (error) {
    throw error;
  }
}

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
}): Promise<PdfExtractionResult> {
  const {
    reportId,
    storagePath,
    fileName,
  } = payload;

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

  const fileType =
    getFileType(
      fileName
    );

  if (
    fileType ===
    "unknown"
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
      "Unsupported report file type.",
      400,
      "Unsupported file type. Please upload PDF, PNG, JPG, or JPEG."
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
      downloadError?.message ||
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

  let extractedText =
    "";

  try {
    extractedText =
      fileType === "pdf"
        ? await extractTextFromPdfBuffer(
            buffer
          )
        : await extractTextFromImageBuffer(
            buffer
          );
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
      }
    );

    throw new PdfExtractionError(
      error instanceof Error
        ? error.message
        : String(
            error
          ),
      422,
      "Could not read text from this report. If this is a scanned PDF or image, OCR setup is required."
    );
  }

  const cleanText =
    extractedText.trim();

  if (!cleanText) {
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
      "No readable text was found in the report.",
      422,
      "No readable text was found in this report. If this is a scanned PDF, OCR setup is required."
    );
  }

  await updateExtractionStatus(
    client,
    userId,
    reportId,
    {
      extracted_text:
        cleanText,

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

    fileType,

    text:
      cleanText,
  };
}
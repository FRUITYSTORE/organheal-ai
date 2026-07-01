import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import PDFParser from "pdf2json";

export const runtime = "nodejs";

function safeDecode(text: string) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function normalizeStoragePath(path: string) {
  return path.trim().replace(/^\/+/, "").replace(/^lab-reports\//, "");
}

function getFileNameFromPath(path: string) {
  return path.split("/").pop() || path;
}

function getFileType(fileName: string | null | undefined) {
  const name = (fileName || "").toLowerCase();

  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".png")) return "image";
  if (name.endsWith(".jpg")) return "image";
  if (name.endsWith(".jpeg")) return "image";

  return "unknown";
}

function logExtractionError(context: string, details: Record<string, unknown>) {
  console.error(`[extract-pdf] ${context}`, details);
}

function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errorData) => {
      reject(
        errorData instanceof Error
          ? errorData
          : errorData.parserError || new Error("PDF parsing failed")
      );
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        const text = pdfData.Pages.map((page) =>
          page.Texts.map((textItem) =>
            safeDecode(textItem.R.map((r) => r.T).join(" "))
          ).join(" ")
        ).join("\n\n");

        resolve(text.trim());
      } catch (error) {
        reject(error);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

async function extractTextFromImageBuffer(buffer: Buffer): Promise<string> {
  const apiKey = process.env.OCR_SPACE_API_KEY;

  if (!apiKey) {
    throw new Error("OCR image extraction is not configured on the server.");
  }

  const formData = new FormData();
  formData.append("base64Image", `data:image/png;base64,${buffer.toString("base64")}`);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      apikey: apiKey,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || data.IsErroredOnProcessing) {
    throw new Error(data.ErrorMessage?.[0] || "Image OCR failed.");
  }

  return data.ParsedResults?.[0]?.ParsedText?.trim() || "";
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    const reportId =
      typeof payload?.reportId === "number"
        ? payload.reportId
        : typeof payload?.reportId === "string"
        ? Number(payload.reportId)
        : null;

    const insightId =
      typeof payload?.insightId === "number"
        ? payload.insightId
        : typeof payload?.insightId === "string"
        ? Number(payload.insightId)
        : null;

    const payloadFilePath =
      typeof payload?.filePath === "string" ? payload.filePath : "";

    const payloadFileName =
      typeof payload?.fileName === "string" ? payload.fileName : "";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error. Supabase client is not configured.",
        },
        { status: 500 }
      );
    }

    const authorizationHeader = req.headers.get("authorization") || "";
    const token = authorizationHeader.startsWith("Bearer ")
      ? authorizationHeader.replace("Bearer ", "").trim()
      : "";

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Please login again.",
        },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Please login again.",
        },
        { status: 401 }
      );
    }

    const user = authData.user;

    let resolvedReportId = reportId;
    let resolvedFilePath = payloadFilePath;
    let resolvedFileName = payloadFileName;

    if ((!resolvedReportId || !resolvedFilePath) && insightId) {
      const { data: insightData } = await supabase
        .from("health_insights")
        .select("id, report_id")
        .eq("id", insightId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (insightData?.report_id) {
        resolvedReportId = insightData.report_id;
      }
    }

    if (resolvedReportId && (!resolvedFilePath || !resolvedFileName)) {
      const { data: reportData } = await supabase
        .from("uploaded_lab_files")
        .select("id, file_name, file_path")
        .eq("id", resolvedReportId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (reportData?.file_path) {
        resolvedFilePath = reportData.file_path;
      }

      if (reportData?.file_name) {
        resolvedFileName = reportData.file_name;
      }
    }

    const storagePath = normalizeStoragePath(resolvedFilePath || "");

    if (!storagePath || !storagePath.startsWith(`${user.id}/`)) {
      logExtractionError("Invalid or missing storage path", {
        userId: user.id,
        reportId,
        insightId,
        resolvedReportId,
        storagePath,
        hasPayloadFilePath: Boolean(payloadFilePath),
      });

      return NextResponse.json(
        {
          success: false,
          error: "Report file path is missing or invalid. Please re-upload the report.",
        },
        { status: 404 }
      );
    }

    if (resolvedReportId) {
      await supabase
        .from("uploaded_lab_files")
        .update({ extraction_status: "Processing" })
        .eq("id", resolvedReportId)
        .eq("user_id", user.id);
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("lab-reports")
      .download(storagePath);

    if (downloadError || !fileBlob) {
      if (resolvedReportId) {
        await supabase
          .from("uploaded_lab_files")
          .update({ extraction_status: "Failed" })
          .eq("id", resolvedReportId)
          .eq("user_id", user.id);
      }

      logExtractionError("Storage download failed with user session", {
        userId: user.id,
        reportId,
        insightId,
        resolvedReportId,
        storagePath,
        error: downloadError?.message || null,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Report file could not be opened. Please re-upload the report.",
        },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const fileName = resolvedFileName || getFileNameFromPath(storagePath);
    const fileType = getFileType(fileName);

    if (fileType === "unknown") {
      if (resolvedReportId) {
        await supabase
          .from("uploaded_lab_files")
          .update({ extraction_status: "Failed" })
          .eq("id", resolvedReportId)
          .eq("user_id", user.id);
      }

      return NextResponse.json(
        {
          success: false,
          error: "Unsupported file type. Please upload PDF, PNG, JPG, or JPEG.",
        },
        { status: 400 }
      );
    }

    let extractedText = "";

    try {
      if (fileType === "pdf") {
        extractedText = await extractTextFromPdfBuffer(buffer);
      }

      if (fileType === "image") {
        extractedText = await extractTextFromImageBuffer(buffer);
      }
    } catch (error) {
      if (resolvedReportId) {
        await supabase
          .from("uploaded_lab_files")
          .update({ extraction_status: "Failed" })
          .eq("id", resolvedReportId)
          .eq("user_id", user.id);
      }

      logExtractionError("Text parser failed", {
        userId: user.id,
        reportId,
        insightId,
        resolvedReportId,
        fileName,
        fileType,
        error: error instanceof Error ? error.message : String(error),
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Could not read text from this report. If this is a scanned PDF or image, OCR setup is required.",
        },
        { status: 422 }
      );
    }

    const cleanText = extractedText.trim();

    if (!cleanText) {
      if (resolvedReportId) {
        await supabase
          .from("uploaded_lab_files")
          .update({
            extraction_status: "Failed",
            extracted_text: null,
          })
          .eq("id", resolvedReportId)
          .eq("user_id", user.id);
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "No readable text was found in this report. If this is a scanned PDF, OCR setup is required.",
        },
        { status: 422 }
      );
    }

    if (resolvedReportId) {
      await supabase
        .from("uploaded_lab_files")
        .update({
          extracted_text: cleanText,
          extraction_status: "Completed",
          extracted_at: new Date().toISOString(),
        })
        .eq("id", resolvedReportId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      success: true,
      reportId: resolvedReportId,
      fileName,
      fileType,
      text: cleanText,
    });
  } catch (error) {
    logExtractionError("Unexpected extraction failure", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Report extraction failed unexpectedly. Please try again.",
      },
      { status: 500 }
    );
  }
}

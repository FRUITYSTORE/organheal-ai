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

function logExtractionError(
  context: string,
  details: Record<string, unknown>
) {
  console.error(`[extract-pdf] ${context}`, details);
}

function normalizeStoragePath(path: string) {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/^lab-reports\//, "");
}

function getFileNameFromPath(path: string) {
  return path.split("/").pop() || path;
}

function getFolderFromPath(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

function removeUploadPrefix(name: string) {
  return name.replace(/^\d+[-_]/, "");
}

function normalizeFileNameForMatch(name: string) {
  return safeDecode(name)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

function getFileType(fileName: string | null | undefined) {
  const name = (fileName || "").toLowerCase();

  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".png")) return "image";
  if (name.endsWith(".jpg")) return "image";
  if (name.endsWith(".jpeg")) return "image";

  return "unknown";
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
      const text = pdfData.Pages.map((page) =>
        page.Texts.map((textItem) =>
          safeDecode(textItem.R.map((r) => r.T).join(" "))
        ).join(" ")
      ).join("\n\n");

      resolve(text.trim());
    });

    pdfParser.parseBuffer(buffer);
  });
}

async function extractTextFromImageBuffer(buffer: Buffer): Promise<string> {
  const apiKey = process.env.OCR_SPACE_API_KEY;

  if (!apiKey) {
    throw new Error("OCR image extraction is not configured on the server.");
  }

  const base64Image = buffer.toString("base64");

  const formData = new FormData();
  formData.append("base64Image", `data:image/png;base64,${base64Image}`);
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

    const rawReportId = payload?.reportId;
    const reportId =
      typeof rawReportId === "number"
        ? rawReportId
        : typeof rawReportId === "string"
        ? Number(rawReportId)
        : null;

    const payloadFilePath =
      typeof payload?.filePath === "string" ? payload.filePath : "";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!reportId && !payloadFilePath) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing report information. Please re-upload the report.",
        },
        { status: 400 }
      );
    }

    if (!supabaseUrl || supabaseUrl.includes("/rest/v1")) {
      logExtractionError("Invalid Supabase URL", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        includesRestPath: supabaseUrl?.includes("/rest/v1") || false,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Server configuration error. Supabase URL is not configured correctly.",
        },
        { status: 500 }
      );
    }

    if (!anonKey || !serviceRoleKey) {
      logExtractionError("Missing Supabase server keys", {
        hasAnonKey: Boolean(anonKey),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Server configuration error. Secure report extraction is not configured.",
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

    const userSupabase = createClient(supabaseUrl, anonKey, {
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

    const { data: authData, error: authError } =
      await userSupabase.auth.getUser(token);

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

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    let reportRow: {
      id: number;
      user_id: string;
      file_name: string | null;
      file_path: string | null;
      created_at?: string;
    } | null = null;

    if (reportId) {
      const { data, error } = await adminSupabase
        .from("uploaded_lab_files")
        .select("id, user_id, file_name, file_path, created_at")
        .eq("id", reportId)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        logExtractionError("Report lookup by id failed", {
          reportId,
          userId: user.id,
          error: error.message,
        });
      }

      reportRow = data || null;
    }

    if (!reportRow && payloadFilePath) {
      const normalizedPayloadPath = normalizeStoragePath(payloadFilePath);

      if (!normalizedPayloadPath.startsWith(`${user.id}/`)) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden. This report does not belong to your account.",
          },
          { status: 403 }
        );
      }

      const { data, error } = await adminSupabase
        .from("uploaded_lab_files")
        .select("id, user_id, file_name, file_path, created_at")
        .eq("user_id", user.id)
        .eq("file_path", normalizedPayloadPath)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logExtractionError("Report lookup by file path failed", {
          payloadFilePath,
          normalizedPayloadPath,
          userId: user.id,
          error: error.message,
        });
      }

      reportRow = data || null;
    }

    if (!reportRow) {
      return NextResponse.json(
        {
          success: false,
          error: "Report was not found for your account.",
        },
        { status: 404 }
      );
    }

    const filePath = reportRow.file_path || "";

    if (!filePath) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Report file path could not be found. Please re-upload the report.",
        },
        { status: 404 }
      );
    }

    let storagePath = normalizeStoragePath(filePath);

    if (!storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. This report file does not belong to your account.",
        },
        { status: 403 }
      );
    }

    const fileName =
      reportRow.file_name ||
      getFileNameFromPath(storagePath) ||
      "";

    const fileType = getFileType(fileName);

    if (fileType === "unknown") {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported file type. Please upload PDF, PNG, JPG, or JPEG.",
        },
        { status: 400 }
      );
    }

    await adminSupabase
      .from("uploaded_lab_files")
      .update({ extraction_status: "Processing" })
      .eq("id", reportRow.id)
      .eq("user_id", user.id);

    let { data: fileBlob, error: downloadError } = await adminSupabase.storage
      .from("lab-reports")
      .download(storagePath);

    if (downloadError || !fileBlob) {
      const folderPath = getFolderFromPath(storagePath);
      const fileBaseName = getFileNameFromPath(storagePath);

      const originalFileName =
        fileName && fileName.trim().length > 0
          ? fileName.trim()
          : removeUploadPrefix(fileBaseName);

      const normalizedOriginal = normalizeFileNameForMatch(originalFileName);
      const normalizedBase = normalizeFileNameForMatch(
        removeUploadPrefix(fileBaseName)
      );

      const { data: folderObjects, error: listError } =
        await adminSupabase.storage.from("lab-reports").list(folderPath, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      const matchedObject = folderObjects?.find((object) => {
        const normalizedObjectName = normalizeFileNameForMatch(object.name);
        const normalizedObjectWithoutPrefix = normalizeFileNameForMatch(
          removeUploadPrefix(object.name)
        );

        return (
          normalizedObjectName === normalizedOriginal ||
          normalizedObjectName.endsWith(normalizedOriginal) ||
          normalizedObjectWithoutPrefix === normalizedOriginal ||
          normalizedObjectWithoutPrefix === normalizedBase
        );
      });

      if (listError || !matchedObject) {
        await adminSupabase
          .from("uploaded_lab_files")
          .update({ extraction_status: "Failed" })
          .eq("id", reportRow.id)
          .eq("user_id", user.id);

        logExtractionError("Storage object not found after listing folder", {
          reportId: reportRow.id,
          userId: user.id,
          storagePath,
          folderPath,
          fileBaseName,
          originalFileName,
          listedFiles: folderObjects?.map((item) => item.name) || [],
          downloadError: downloadError?.message || null,
          listError: listError?.message || null,
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "Report file could not be found in secure storage. Please re-upload the report and try again.",
          },
          { status: 500 }
        );
      }

      storagePath = folderPath
        ? `${folderPath}/${matchedObject.name}`
        : matchedObject.name;

      if (!storagePath.startsWith(`${user.id}/`)) {
        await adminSupabase
          .from("uploaded_lab_files")
          .update({ extraction_status: "Failed" })
          .eq("id", reportRow.id)
          .eq("user_id", user.id);

        return NextResponse.json(
          {
            success: false,
            error: "Forbidden. Storage path ownership validation failed.",
          },
          { status: 403 }
        );
      }

      const retryDownload = await adminSupabase.storage
        .from("lab-reports")
        .download(storagePath);

      fileBlob = retryDownload.data;
      downloadError = retryDownload.error;

      if (!downloadError && fileBlob) {
        await adminSupabase
          .from("uploaded_lab_files")
          .update({ file_path: storagePath })
          .eq("id", reportRow.id)
          .eq("user_id", user.id);
      }
    }

    if (downloadError || !fileBlob) {
      await adminSupabase
        .from("uploaded_lab_files")
        .update({ extraction_status: "Failed" })
        .eq("id", reportRow.id)
        .eq("user_id", user.id);

      logExtractionError("Storage retry failed", {
        reportId: reportRow.id,
        userId: user.id,
        finalStoragePath: storagePath,
        downloadError: downloadError?.message || null,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Report file was located but could not be opened for extraction. Please re-upload the report and try again.",
        },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let cleanText = "";

    if (fileType === "pdf") {
      cleanText = await extractTextFromPdfBuffer(buffer);
    }

    if (fileType === "image") {
      cleanText = await extractTextFromImageBuffer(buffer);
    }

    const finalText =
      cleanText && cleanText.length > 0
        ? cleanText
        : "No readable text extracted from this report.";

    await adminSupabase
      .from("uploaded_lab_files")
      .update({
        extracted_text: finalText,
        extraction_status: "Completed",
        extracted_at: new Date().toISOString(),
      })
      .eq("id", reportRow.id)
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      fileName: fileName || null,
      fileType,
      text: finalText,
    });
  } catch (error) {
    logExtractionError("Unexpected extraction failure", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error:
          "Report extraction failed unexpectedly. Please re-upload the report and try again.",
      },
      { status: 500 }
    );
  }
}

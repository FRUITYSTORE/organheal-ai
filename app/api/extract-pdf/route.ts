import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import PDFParser from "pdf2json";

function safeDecode(text: string) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
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
    throw new Error("OCR_SPACE_API_KEY is missing in .env.local");
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
    throw new Error(
      data.ErrorMessage?.[0] || "Image OCR failed."
    );
  }

  return data.ParsedResults?.[0]?.ParsedText?.trim() || "";
}

function getFileType(fileName: string | null | undefined) {
  const name = (fileName || "").toLowerCase();

  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".png")) return "image";
  if (name.endsWith(".jpg")) return "image";
  if (name.endsWith(".jpeg")) return "image";

  return "unknown";
}
function normalizeStoragePath(path: string) {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/^lab-reports\//, "");
}
export async function POST(req: Request) {
  try {
    const { reportId, filePath, fileName } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!reportId || !filePath) {
  return NextResponse.json(
    {
      success: false,
      error: "Missing reportId or filePath from the selected report.",
    },
    { status: 400 }
  );
}

if (!supabaseUrl) {
  return NextResponse.json(
    {
      success: false,
      error: "NEXT_PUBLIC_SUPABASE_URL is missing on the server.",
    },
    { status: 500 }
  );
}

if (!serviceRoleKey) {
  return NextResponse.json(
    {
      success: false,
      error: "SUPABASE_SERVICE_ROLE_KEY is missing on the server.",
    },
    { status: 500 }
  );
}

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

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    await adminSupabase
      .from("uploaded_lab_files")
      .update({ extraction_status: "Processing" })
      .eq("id", reportId);

const storagePath = normalizeStoragePath(filePath);

const { data: fileBlob, error: downloadError } = await adminSupabase.storage
  .from("lab-reports")
  .download(storagePath);

if (downloadError || !fileBlob) {
  await adminSupabase
    .from("uploaded_lab_files")
    .update({ extraction_status: "Failed" })
    .eq("id", reportId);

  return NextResponse.json(
    {
      success: false,
      error:
        downloadError?.message ||
        "File download failed: no file returned from storage.",
      filePath,
      storagePath,
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
      .eq("id", reportId);

    return NextResponse.json({
      success: true,
      fileName: fileName || null,
      fileType,
      text: finalText,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
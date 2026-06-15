import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import PDFParser from "pdf2json";

function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errorData) => {
      if (errorData instanceof Error) {
        reject(errorData);
        return;
      }

      reject(errorData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      const text = pdfData.Pages.map((page) =>
        page.Texts.map((textItem) =>
          decodeURIComponent(textItem.R.map((r) => r.T).join(" "))
        ).join(" ")
      ).join("\n\n");

      resolve(text.trim());
    });

    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(req: Request) {
  console.log("EXTRACT PDF API CALLED");

  try {
    const { reportId, filePath, fileName } = await req.json();
    console.log("REPORT ID:", reportId);
console.log("FILE PATH:", filePath);
console.log("FILE NAME:", fileName);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!reportId || !filePath || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Missing required extraction data" },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    await adminSupabase
      .from("uploaded_lab_files")
      .update({ extraction_status: "Processing" })
      .eq("id", reportId);

const encodedPath = filePath
  .split("/")
  .map((part: string) => encodeURIComponent(part))
  .join("/");

const downloadUrl = `${supabaseUrl}/storage/v1/object/authenticated/lab-reports/${encodedPath}`;

const fileResponse = await fetch(downloadUrl, {
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
  },
});
console.log("DIRECT DOWNLOAD STATUS:", fileResponse.status);
console.log("DIRECT DOWNLOAD TEXT:", await fileResponse.clone().text());
console.log("DIRECT DOWNLOAD STATUS:", fileResponse.status);

if (!fileResponse.ok) {
  return NextResponse.json(
    {
      success: false,
      error: `Direct download failed with status ${fileResponse.status}`,
    },
    { status: 500 }
  );
}

const arrayBuffer = await fileResponse.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
    const cleanText = await extractTextFromPdfBuffer(buffer);

    await adminSupabase
      .from("uploaded_lab_files")
      .update({
        extracted_text: cleanText || "No readable text extracted from this PDF.",
        extraction_status: "Completed",
        extracted_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    return NextResponse.json({
      success: true,
      fileName: fileName || null,
      text: cleanText,
    });
     } catch (error) {
    console.log("PDF EXTRACTION CRASH START");
    console.log(error);
    console.log("PDF EXTRACTION CRASH END");

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
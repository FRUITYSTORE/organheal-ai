import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export async function POST(req: Request) {
  try {
    const { reportId, filePath, fileName } = await req.json();

    if (!reportId || !filePath) {
      return NextResponse.json(
        { success: false, error: "reportId and filePath are required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Missing Supabase server credentials" },
        { status: 500 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    await adminSupabase
      .from("uploaded_lab_files")
      .update({ extraction_status: "Processing" })
      .eq("id", reportId);

    const { data: signedUrlData, error: signedUrlError } =
      await adminSupabase.storage
        .from("lab-reports")
        .createSignedUrl(filePath, 60 * 10);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        { success: false, error: signedUrlError?.message || "Signed URL failed" },
        { status: 500 }
      );
    }

    const fileResponse = await fetch(signedUrlData.signedUrl);

    if (!fileResponse.ok) {
      return NextResponse.json(
        { success: false, error: "Could not download PDF file" },
        { status: 500 }
      );
    }

    const buffer = await fileResponse.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    const pdf = await pdfjsLib.getDocument({
      data: uint8Array,
    }).promise;

    let extractedText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");

      extractedText += `\n\nPage ${pageNumber}\n${pageText}`;
    }

    const cleanText = extractedText.trim();

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
      pages: pdf.numPages,
      text: cleanText,
    });
  } catch (error) {
    console.error("PDF extraction error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "PDF extraction failed",
      },
      { status: 500 }
    );
  }
}
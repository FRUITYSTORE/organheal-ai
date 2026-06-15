import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { filePath, fileName } = await req.json();

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: "filePath is required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 500 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: signedUrlData, error: signedUrlError } =
      await adminSupabase.storage
        .from("lab-reports")
        .createSignedUrl(filePath, 60 * 10);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        {
          success: false,
          error: signedUrlError?.message || "Could not create signed URL",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: fileName || null,
      filePath,
      signedUrl: signedUrlData.signedUrl,
      text: "Signed URL created successfully. PDF extraction will be connected next.",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process extraction request",
      },
      { status: 500 }
    );
  }
}
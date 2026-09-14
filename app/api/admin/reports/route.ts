import {
  NextResponse,
} from "next/server";

import {
  authorizeAdminApiRequest,
} from "@/lib/api/api-admin-auth";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

const ADMIN_REPORT_SELECT = [
  "id",
  "file_name",
  "report_type",
  "created_at",
  "extraction_status",
  "extracted_text",
  "extracted_at",
  "analysis_status",
  "ai_summary",
].join(",");

export async function GET(
  request: Request
) {
  const authorization =
    await authorizeAdminApiRequest(
      request
    );

  if (!authorization.success) {
    return NextResponse.json(
      {
        error:
          authorization.error,
      },
      {
        status:
          authorization.status,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  try {
    const adminClient =
      getSupabaseAdminClient();

    const {
      data,
      error,
    } =
      await adminClient
        .from(
          "uploaded_lab_files"
        )
        .select(
          ADMIN_REPORT_SELECT
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (error) {
      return NextResponse.json(
        {
          error:
            "Unable to load admin reports.",
        },
        {
          status: 500,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        reports:
          data ?? [],
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to load admin reports.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
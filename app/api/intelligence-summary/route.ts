import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createClient,
} from "@supabase/supabase-js";

import {
  getCombinedIntelligenceSummary,
} from "@/lib/services/intelligence/intelligence-summary-v2.service";

type IntelligenceSummaryRequest = {
  language?: "en" | "ar";
  reportId?: number;
};

export async function POST(
  request: NextRequest
) {
  try {
    const authorizationHeader =
      request.headers.get("authorization") || "";

    const token =
      authorizationHeader.startsWith("Bearer ")
        ? authorizationHeader
            .replace("Bearer ", "")
            .trim()
        : "";

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Authentication is required to build the intelligence summary.",
        },
        {
          status: 401,
        }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase environment variables are missing."
      );
    }

    const authenticatedSupabase =
      createClient(
        supabaseUrl,
        supabaseKey,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    const {
      data: authData,
      error: authError,
    } =
      await authenticatedSupabase.auth.getUser(
        token
      );

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error:
            "Your session is invalid or has expired.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as
        IntelligenceSummaryRequest;

    const userId = authData.user.id;
    const language =
      body.language === "ar"
        ? "ar"
        : "en";
const requestedReportId =
  typeof body.reportId === "number" &&
  body.reportId > 0
    ? body.reportId
    : null;
    let healthInsightsQuery = authenticatedSupabase
  .from("health_insights")
  .select(
    "id, report_id, insight_title, summary, key_findings, recommendations, doctor_brief, ai_status, risk_level, next_best_action, report_type, created_at"
  )
  .eq("user_id", userId);

let uploadedReportsQuery = authenticatedSupabase
  .from("uploaded_lab_files")
  .select(
    "id, file_name, file_path, report_type, extraction_status, extracted_text, created_at, extracted_at"
  )
  .eq("user_id", userId);

if (requestedReportId) {
  healthInsightsQuery = healthInsightsQuery.eq(
    "report_id",
    requestedReportId
  );

  uploadedReportsQuery = uploadedReportsQuery.eq(
    "id",
    requestedReportId
  );
} else {
  healthInsightsQuery = healthInsightsQuery
    .order("created_at", {
      ascending: false,
    })
    .limit(20);

  uploadedReportsQuery = uploadedReportsQuery
    .order("created_at", {
      ascending: false,
    })
    .limit(20);
}

const [
  combinedSummary,
  healthInsightsResult,
  uploadedReportsResult,
] = await Promise.all([
  getCombinedIntelligenceSummary(
    userId,
    language
  ),
  healthInsightsQuery,
  uploadedReportsQuery,
]);

    if (healthInsightsResult.error) {
      throw new Error(
        healthInsightsResult.error.message
      );
    }

    if (uploadedReportsResult.error) {
      throw new Error(
        uploadedReportsResult.error.message
      );
    }

    return NextResponse.json({
      ...combinedSummary,
      healthInsights:
        healthInsightsResult.data || [],
      uploadedReports:
        uploadedReportsResult.data || [],
    });
  } catch (error) {
    console.error(
      "Intelligence summary error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build the intelligence summary.",
      },
      {
        status: 500,
      }
    );
  }
}
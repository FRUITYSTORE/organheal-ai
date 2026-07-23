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
import {
  getFocusedIntelligenceSummary,
} from "@/lib/services/intelligence/focused-intelligence-summary.service";

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
      Number.isInteger(body.reportId) &&
      body.reportId > 0
        ? body.reportId
        : null;

    if (requestedReportId !== null) {
      const focusedSummary =
  await getFocusedIntelligenceSummary(
    userId,
    requestedReportId,
    language,
    authenticatedSupabase
  );

      if (!focusedSummary) {
        return NextResponse.json(
          {
            error:
              "The requested report was not found in your account.",
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json(
        focusedSummary
      );
    }

    const combinedSummary =
      await getCombinedIntelligenceSummary(
        userId,
        language
      );

    return NextResponse.json(
      combinedSummary
    );
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
import {
  supabase,
} from "@/lib/supabase";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

const UPLOADED_REPORT_SUMMARY_SELECT =
  "id, file_name, file_path, report_type, extraction_status, extracted_text, created_at, extracted_at";

const REPORTS_STORAGE_BUCKET =
  "lab-reports";

export type UploadedReportSummary = {
  id: number;

  file_name:
    string | null;

  file_path?:
    string | null;

  report_type?:
    string | null;

  extraction_status:
    string | null;

  extracted_text?:
    string | null;

  created_at:
    string;

  extracted_at?:
    string | null;
};

export async function getRecentUploadedReports(
  userId:
    string,
  limit = 50,
  client:
    SupabaseClient = supabase
): Promise<
  UploadedReportSummary[]
> {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        limit,
        100
      )
    );

  const {
    data,
    error,
  } =
    await client
      .from(
        "uploaded_lab_files"
      )
      .select(
        UPLOADED_REPORT_SUMMARY_SELECT
      )
      .eq(
        "user_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        safeLimit
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data ?? []
  ) as UploadedReportSummary[];
}

export async function countUploadedReports(
  userId:
    string,
  client:
    SupabaseClient = supabase
): Promise<number> {
  const {
    count,
    error,
  } =
    await client
      .from(
        "uploaded_lab_files"
      )
      .select(
        "id",
        {
          count:
            "exact",

          head:
            true,
        }
      )
      .eq(
        "user_id",
        userId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return count ?? 0;
}

export async function getUploadedReportsByIds(
  userId:
    string,
  reportIds:
    number[],
  client:
    SupabaseClient = supabase
): Promise<
  UploadedReportSummary[]
> {
  if (
    reportIds.length === 0
  ) {
    return [];
  }

  const {
    data,
    error,
  } =
    await client
      .from(
        "uploaded_lab_files"
      )
      .select(
        UPLOADED_REPORT_SUMMARY_SELECT
      )
      .eq(
        "user_id",
        userId
      )
      .in(
        "id",
        reportIds
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data ?? []
  ) as UploadedReportSummary[];
}

export async function getUploadedReportExtractedText(
  userId:
    string,
  reportId:
    number,
  client:
    SupabaseClient = supabase
): Promise<
  string | null
> {
  const {
    data,
    error,
  } =
    await client
      .from(
        "uploaded_lab_files"
      )
      .select(
        "extracted_text"
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        reportId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data?.extracted_text ??
    null
  );
}

export async function createUploadedReportSignedUrl(
  filePath:
    string,
  expiresInSeconds =
    60 * 60,
  client:
    SupabaseClient = supabase
): Promise<string> {
  const {
    data,
    error,
  } =
    await client.storage
      .from(
        REPORTS_STORAGE_BUCKET
      )
      .createSignedUrl(
        filePath,
        expiresInSeconds
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data.signedUrl;
}
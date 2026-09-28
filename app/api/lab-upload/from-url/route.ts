import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/lib/api/api-auth";
import { createApiRequestId, logApiError } from "@/lib/api/api-logger";
import {
  getReportFileRejectionReason,
  isSupportedReportFile,
  REPORT_UPLOAD_SUPPORTED_EXTENSIONS_LABEL,
} from "@/lib/report-ingestion/report-file-capabilities";
import { fetchReportUrl, FetchReportUrlFailure } from "@/lib/report-ingestion/fetch-report-url";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };
const REPORT_TYPES = ["lab", "radiology", "clinical", "prescription", "medical"] as const;

function fail(error: string, status: number, requestId: string) {
  return NextResponse.json({ error, requestId }, { status, headers: { ...NO_STORE, "x-request-id": requestId } });
}

function safeStorageFileName(name: string): string {
  const safeName = name.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

  return safeName || "medical-report";
}

// Mirrors app/lab-upload/page.tsx's own client-side upload flow exactly
// (same bucket, same tables, same row shapes) — just sourced from a
// member-pasted link instead of a local file, so a report reached this way
// looks identical to the rest of the app afterward.
export async function POST(request: Request) {
  const requestId = createApiRequestId();
  const authentication = await authenticateApiRequest(request);

  if (!authentication.success) {
    return fail(authentication.error, authentication.status, requestId);
  }

  const { user, client } = authentication;

  let url = "";
  let reportType: (typeof REPORT_TYPES)[number] = "lab";

  try {
    const body = (await request.json()) as { url?: unknown; reportType?: unknown };

    url = typeof body.url === "string" ? body.url.trim() : "";
    reportType = REPORT_TYPES.includes(body.reportType as (typeof REPORT_TYPES)[number])
      ? (body.reportType as (typeof REPORT_TYPES)[number])
      : "lab";
  } catch {
    url = "";
  }

  if (!url) {
    return fail("A link is required.", 400, requestId);
  }

  let fetched: Awaited<ReturnType<typeof fetchReportUrl>>;

  try {
    fetched = await fetchReportUrl(url);
  } catch (error) {
    if (error instanceof FetchReportUrlFailure) {
      return fail(error.message, 400, requestId);
    }

    logApiError("lab_upload_from_url.fetch_failed", error, { requestId, userId: user.id });

    return fail("That link could not be reached.", 502, requestId);
  }

  if (
    !isSupportedReportFile({ fileName: fetched.fileName, mimeType: fetched.contentType }) ||
    fetched.contentType === "text/html"
  ) {
    return fail(
      isSupportedReportFile({ fileName: fetched.fileName, mimeType: fetched.contentType })
        ? `That link points to a web page, not a report file. Supported formats: ${REPORT_UPLOAD_SUPPORTED_EXTENSIONS_LABEL}.`
        : getReportFileRejectionReason({ fileName: fetched.fileName, mimeType: fetched.contentType }),
      415,
      requestId
    );
  }

  const safeName = safeStorageFileName(fetched.fileName);
  const filePath = `${user.id}/${Date.now()}-fromurl-${safeName}`;

  const { error: uploadError } = await client.storage.from("lab-reports").upload(filePath, fetched.buffer, {
    upsert: false,
    contentType: fetched.contentType ?? undefined,
  });

  if (uploadError) {
    logApiError("lab_upload_from_url.storage_upload_failed", uploadError, { requestId, userId: user.id });

    return fail("The linked report could not be saved.", 502, requestId);
  }

  const { data: signedUrlData, error: signedUrlError } = await client.storage
    .from("lab-reports")
    .createSignedUrl(filePath, 60 * 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    await client.storage.from("lab-reports").remove([filePath]);

    return fail("The linked report could not be prepared for secure access.", 502, requestId);
  }

  const { data: insertedFile, error: databaseError } = await client
    .from("uploaded_lab_files")
    .insert({
      user_id: user.id,
      file_name: fetched.fileName,
      file_path: filePath,
      file_url: signedUrlData.signedUrl,
      report_type: reportType,
      analysis_status: "uploaded",
      ai_summary: "Medical report uploaded successfully. Report intelligence can be generated from the Reports Library.",
      extraction_status: "Pending",
      extracted_text: null,
      extracted_at: null,
    })
    .select("id")
    .single();

  if (databaseError || !insertedFile) {
    await client.storage.from("lab-reports").remove([filePath]);

    return fail("The linked report could not be saved.", 502, requestId);
  }

  const { error: insightError } = await client.from("health_insights").insert([
    {
      user_id: user.id,
      report_id: insertedFile.id,
      report_type: reportType,
      insight_title: "Medical report uploaded",
      ai_status: "Pending",
      risk_level: "pending",
      summary: "Report uploaded successfully and ready for intelligence review.",
      key_findings: "Pending extraction.",
      risk_signals: "Pending extraction.",
      recommendations: "Open this report from Reports Library to generate report intelligence.",
      doctor_brief: "Pending intelligence generation.",
      next_best_action: "Open Reports Library and analyze this report.",
    },
  ]);

  if (insightError) {
    await client.from("uploaded_lab_files").delete().eq("id", insertedFile.id).eq("user_id", user.id);
    await client.storage.from("lab-reports").remove([filePath]);

    return fail("The linked report could not be prepared for analysis.", 502, requestId);
  }

  return NextResponse.json(
    { reportId: insertedFile.id, fileName: fetched.fileName },
    { headers: { ...NO_STORE, "x-request-id": requestId } }
  );
}

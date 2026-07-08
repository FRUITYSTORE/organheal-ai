import { supabase } from "@/lib/supabase";

export type ReportsLibraryCard = {
  reportId: number;
  insightId: number | null;
  fileName: string;
  filePath: string | null;
  uploadedAt: string | null;
  reportType: string;
  extractionStatus: string;
  aiStatus: string;
  riskLevel: string;
  summary: string;
  nextBestAction: string;
  hasSavedAnalysis: boolean;
  savedUpdatedAt: string | null;
};

type UploadedReportRow = {
  id: number;
  file_name: string | null;
  file_path: string | null;
  report_type: string | null;
  extraction_status: string | null;
  extracted_text?: string | null;
  created_at: string | null;
};

type HealthInsightRow = {
  id: number;
  report_id: number | null;
  ai_status: string | null;
  risk_level: string | null;
  summary: string | null;
  next_best_action: string | null;
  report_type: string | null;
  updated_at?: string | null;
  created_at: string | null;
};

type SavedResultRow = {
  insight_id: number | null;
  report_id: number | null;
  updated_at: string | null;
};

function normalizeStatus(status?: string | null) {
  if (!status) return "Pending";

  const normalized = status.toLowerCase();

  if (normalized.includes("complete") || normalized.includes("generated")) {
    return "Generated";
  }

  if (normalized.includes("fail") || normalized.includes("error")) {
    return "Failed";
  }

  if (normalized.includes("process") || normalized.includes("extract")) {
    return "Processing";
  }

  return status;
}

function getReportTypeLabel(type?: string | null) {
  if (!type) return "Medical Report";

  const normalized = type.toLowerCase();

  if (normalized.includes("lab")) return "Laboratory Report";
  if (normalized.includes("radiology")) return "Radiology Report";
  if (normalized.includes("cardiology")) return "Cardiology Report";
  if (normalized.includes("orthopedic")) return "Orthopedic Report";

  return type;
}

export async function getReportsLibrary(userId: string): Promise<ReportsLibraryCard[]> {
  const { data: uploadedData, error: uploadedError } = await supabase
    .from("uploaded_lab_files")
    .select("id, file_name, file_path, report_type, extraction_status, extracted_text, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (uploadedError) {
    throw new Error(uploadedError.message);
  }

  const uploadedReports = (uploadedData || []) as UploadedReportRow[];
  const reportIds = uploadedReports.map((item) => item.id);

  let insights: HealthInsightRow[] = [];

  if (reportIds.length > 0) {
    const { data: insightData, error: insightError } = await supabase
      .from("health_insights")
      .select("id, report_id, ai_status, risk_level, summary, next_best_action, report_type, created_at")
      .eq("user_id", userId)
      .in("report_id", reportIds)
      .limit(50);

    if (insightError) {
      throw new Error(insightError.message);
    }

    insights = (insightData || []) as HealthInsightRow[];
  }

  const insightIds = insights.map((item) => item.id);
  let savedResults: SavedResultRow[] = [];

  if (insightIds.length > 0) {
    const { data: savedData, error: savedError } = await supabase
      .from("generated_intelligence_results")
      .select("insight_id, report_id, updated_at")
      .eq("user_id", userId)
      .in("insight_id", insightIds)
      .limit(50);

    if (savedError) {
      throw new Error(savedError.message);
    }

    savedResults = (savedData || []) as SavedResultRow[];
  }

  const mergedReports = uploadedReports.map((report) => {
    const insight =
      insights.find((item) => item.report_id === report.id) || null;

    const saved =
      savedResults.find((item) => {
        if (insight?.id && item.insight_id === insight.id) return true;
        if (item.report_id && item.report_id === report.id) return true;
        return false;
      }) || null;

    const extractionStatus = normalizeStatus(report.extraction_status);
    const aiStatus = saved
      ? "Generated"
      : normalizeStatus(insight?.ai_status || "Pending");

    return {
      reportId: report.id,
      insightId: insight?.id || null,
      fileName: report.file_name || "Medical report",
      filePath: report.file_path || null,
      uploadedAt: report.created_at || null,
      reportType: getReportTypeLabel(report.report_type || insight?.report_type),
      extractionStatus,
      aiStatus,
      riskLevel: insight?.risk_level || "Pending",
      summary: insight?.summary || "",
      nextBestAction: insight?.next_best_action || "",
      hasSavedAnalysis: Boolean(saved) || aiStatus === "Generated",
      savedUpdatedAt: saved?.updated_at || insight?.updated_at || null,
    };
  });

  mergedReports.sort((a, b) => {
    return (
      new Date(b.uploadedAt || 0).getTime() -
      new Date(a.uploadedAt || 0).getTime()
    );
  });

  return mergedReports;
}
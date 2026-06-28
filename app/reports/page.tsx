"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";

type UploadedReport = {
  id: number;
  file_name: string;
  file_path: string | null;
  created_at: string;
  extraction_status: string | null;
  extracted_at?: string | null;
};

type HealthInsight = {
  id: number;
  report_id: number | null;
  report_type: string | null;
  ai_status: string | null;
  risk_level: string | null;
  summary: string | null;
  next_best_action: string | null;
  created_at: string;
};

type SavedGeneratedResult = {
  insight_id: number | null;
  report_id?: number | null;
  updated_at: string | null;
};

type ReportLibraryItem = {
  reportId: number;
  insightId: number | null;
  fileName: string;
  filePath: string | null;
  uploadedAt: string;
  extractionStatus: string | null;
  reportType: string | null;
  aiStatus: string | null;
  riskLevel: string | null;
  summary: string | null;
  nextBestAction: string | null;
  hasSavedIntelligence: boolean;
  savedUpdatedAt: string | null;
};

const REPORTS_INITIAL_LIMIT = 3;
const REPORTS_LOAD_STEP = 5;

export default function ReportsPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [reports, setReports] = useState<ReportLibraryItem[]>([]);
  const [visibleReportsCount, setVisibleReportsCount] = useState(REPORTS_INITIAL_LIMIT);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";
      setLanguage(currentLanguage);
    }, 300);

    fetchReports();

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  async function fetchReports() {
    setLoading(true);
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      window.location.href = "/login";
      return;
    }

    const userId = userData.user.id;

    const { data: uploadedReports, error: reportsError } = await supabase
      .from("uploaded_lab_files")
      .select("id, file_name, file_path, created_at, extraction_status, extracted_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (reportsError) {
      setMessage("Database error: " + reportsError.message);
      setLoading(false);
      return;
    }

    const { data: insightsData, error: insightsError } = await supabase
      .from("health_insights")
      .select(
        "id, report_id, report_type, ai_status, risk_level, summary, next_best_action, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (insightsError) {
      setMessage("Database error: " + insightsError.message);
      setLoading(false);
      return;
    }

    let savedGeneratedResults: SavedGeneratedResult[] = [];

    const { data: savedData, error: savedError } = await supabase
      .from("generated_intelligence_results")
      .select("insight_id, report_id, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (!savedError && savedData) {
      savedGeneratedResults = savedData as SavedGeneratedResult[];
    } else {
      const { data: fallbackSavedData } = await supabase
        .from("generated_intelligence_results")
        .select("insight_id, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      savedGeneratedResults = (fallbackSavedData || []) as SavedGeneratedResult[];
    }

    const insights = (insightsData || []) as HealthInsight[];
    const files = (uploadedReports || []) as UploadedReport[];

    const mergedReports: ReportLibraryItem[] = files.map((file) => {
      const insight = insights.find((item) => item.report_id === file.id) || null;

      const savedResult = savedGeneratedResults.find((item) => {
        if (insight?.id && item.insight_id === insight.id) return true;
        if (item.report_id && item.report_id === file.id) return true;
        return false;
      });

      return {
        reportId: file.id,
        insightId: insight?.id || null,
        fileName: file.file_name || "Medical report",
        filePath: file.file_path || null,
        uploadedAt: file.created_at,
        extractionStatus: file.extraction_status || "Pending",
        reportType: insight?.report_type || null,
        aiStatus: insight?.ai_status || null,
        riskLevel: insight?.risk_level || null,
        summary: insight?.summary || null,
        nextBestAction: insight?.next_best_action || null,
        hasSavedIntelligence: Boolean(savedResult),
        savedUpdatedAt: savedResult?.updated_at || null,
      };
    });

    setReports(mergedReports);
    setVisibleReportsCount(REPORTS_INITIAL_LIMIT);
    setLoading(false);
  }

  async function openMedicalReport(filePath: string | null) {
    if (!filePath) {
      alert(
        isArabic
          ? "Ã™â€žÃ˜Â§ Ã™Å Ã™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â± Ã™â€¦Ã™â€žÃ™Â Ã™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸ Ã™â€žÃ™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â±."
          : "No saved file path was found for this report."
      );
      return;
    }

    const { data, error } = await supabase.storage
      .from("lab-reports")
      .createSignedUrl(filePath, 60);

    if (error) {
      alert(
        isArabic
          ? "Ã˜ÂªÃ˜Â¹Ã˜Â°Ã˜Â± Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â¢Ã™â€ ."
          : "Unable to open the report right now."
      );
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  function formatDate(value: string | null) {
    if (!value) return isArabic ? "Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â­" : "Not available";
    return new Date(value).toLocaleString();
  }

  function getReportTypeLabel(type: string | null) {
    if (!type) return isArabic ? "Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã˜Â·Ã˜Â¨Ã™Å " : "Medical report";

    if (type === "lab") return isArabic ? "Ã™â€¦Ã˜Â®Ã˜ÂªÃ˜Â¨Ã˜Â±" : "Laboratory";
    if (type === "radiology") return isArabic ? "Ã˜Â£Ã˜Â´Ã˜Â¹Ã˜Â©" : "Radiology";
    if (type === "clinical") return isArabic ? "Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã˜Â³Ã˜Â±Ã™Å Ã˜Â±Ã™Å " : "Clinical";
    if (type === "prescription") return isArabic ? "Ã™Ë†Ã˜ÂµÃ™ÂÃ˜Â© Ã˜Â·Ã˜Â¨Ã™Å Ã˜Â©" : "Prescription";

    return type;
  }

  function getExtractionLabel(status: string | null) {
    const cleanStatus = status || "Pending";

    if (isArabic) {
      if (cleanStatus === "Completed") return "Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â±Ã˜Â§Ã˜Â¬ Ã™â€¦Ã™Æ’Ã˜ÂªÃ™â€¦Ã™â€ž";
      if (cleanStatus === "Processing") return "Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â±Ã˜Â§Ã˜Â¬";
      if (cleanStatus === "Failed") return "Ã™ÂÃ˜Â´Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â±Ã˜Â§Ã˜Â¬";
      return "Ã˜Â¨Ã˜Â§Ã™â€ Ã˜ÂªÃ˜Â¸Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â±Ã˜Â§Ã˜Â¬";
    }

    if (cleanStatus === "Completed") return "Extraction completed";
    if (cleanStatus === "Processing") return "Extraction processing";
    if (cleanStatus === "Failed") return "Extraction failed";
    return "Extraction pending";
  }

  function getReportDecision(report: ReportLibraryItem) {
    if (report.hasSavedIntelligence) {
      return {
        label: isArabic ? "Ã˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸" : "Saved intelligence",
        title: isArabic
          ? "Ã™â€ Ã˜ÂªÃ™Å Ã˜Â¬Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã™Å  Ã™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸Ã˜Â©"
          : "Health intelligence is saved",
        description: isArabic
          ? "Ã™Å Ã™â€¦Ã™Æ’Ã™â€ Ã™Æ’ Ã™ÂÃ˜ÂªÃ˜Â­ Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â®Ã˜ÂµÃ˜Â§Ã˜ÂªÃ˜Å’ Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ˜Â§Ã™â€ Ã˜ÂªÃ™â€šÃ˜Â§Ã™â€ž Ã˜Â¥Ã™â€žÃ™â€° Ã˜Â®Ã˜Â·Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©."
          : "Open Intelligence Center to review summaries, or continue to your follow-up plan.",
        href: "/intelligence",
        buttonText: isArabic ? "Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜Â§Ã™â€žÃ™â€ Ã˜ÂªÃ™Å Ã˜Â¬Ã˜Â©" : "Open Result",
      };
    }

    if (report.insightId) {
      return {
        label: isArabic ? "Ã˜Â¬Ã˜Â§Ã™â€¡Ã˜Â² Ã™â€žÃ™â€žÃ˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯" : "Ready to generate",
        title: isArabic
          ? "Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã™Å Ã˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡"
          : "This report needs intelligence generation",
        description: isArabic
          ? "Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â­ Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã™Ë†Ã˜Â§Ã˜Â¶Ã˜ÂºÃ˜Â· Generate Ã™â€žÃ˜ÂªÃ˜Â­Ã™Ë†Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã˜Â¥Ã™â€žÃ™â€° Ã™â€¦Ã™â€žÃ˜Â®Ã˜ÂµÃ˜Â§Ã˜Âª Ã™Ë†Ã˜Â®Ã˜Â·Ã˜Â© Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©."
          : "Open Intelligence Center and press Generate to turn this report into summaries and follow-up steps.",
        href: "/intelligence",
        buttonText: isArabic ? "Ã™Ë†Ã™â€žÃ™â€˜Ã˜Â¯ Ã™ÂÃ™Å  Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡" : "Generate in Intelligence",
      };
    }

    return {
      label: isArabic ? "Ã˜ÂªÃ™â€¦ Ã˜Â§Ã™â€žÃ˜Â­Ã™ÂÃ˜Â¸" : "Saved",
      title: isArabic
        ? "Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸ Ã™Ë†Ã™Å Ã˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©"
        : "The report is saved and needs follow-up",
      description: isArabic
        ? "Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â­ Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã˜Â£Ã™Ë† Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â±Ã™â€¹Ã˜Â§ Ã˜Â¢Ã˜Â®Ã˜Â± Ã˜Â¥Ã˜Â°Ã˜Â§ Ã™â€žÃ™â€¦ Ã™Å Ã˜Â¸Ã™â€¡Ã˜Â± Ã˜Â¨Ã˜Â¹Ã˜Â¯."
        : "Open Intelligence Center or upload another report if it does not appear yet.",
      href: "/intelligence",
      buttonText: isArabic ? "Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â­ Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡" : "Open Intelligence",
    };
  }

  const stats = useMemo(() => {
    const savedCount = reports.filter((report) => report.hasSavedIntelligence).length;
    const needsGeneration = reports.filter(
      (report) => !report.hasSavedIntelligence
    ).length;

    return {
      total: reports.length,
      saved: savedCount,
      needsGeneration,
      completedExtraction: reports.filter(
        (report) => report.extractionStatus === "Completed"
      ).length,
    };
  }, [reports]);

  const visibleReports = reports.slice(0, visibleReportsCount);
  const hiddenReportsCount = Math.max(reports.length - visibleReportsCount, 0);
  const canShowMoreReports = hiddenReportsCount > 0;
  const canShowLessReports = visibleReportsCount > REPORTS_INITIAL_LIMIT;

  const primaryNextStep =
    reports.length === 0
      ? {
          label: isArabic ? "Ã˜Â§Ã˜Â¨Ã˜Â¯Ã˜Â£ Ã™â€¡Ã™â€ Ã˜Â§" : "Start here",
          title: isArabic
            ? "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜Â£Ã™Ë†Ã™â€ž Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã˜Â·Ã˜Â¨Ã™Å "
            : "Upload your first medical report",
          description: isArabic
            ? "Ã˜Â¨Ã˜Â¹Ã˜Â¯ Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â±Ã˜Å’ Ã˜Â³Ã™Å Ã˜Â¸Ã™â€¡Ã˜Â± Ã™â€¡Ã™â€ Ã˜Â§ Ã™Ë†Ã™Å Ã™â€¦Ã™Æ’Ã™â€ Ã™Æ’ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â© Ã˜Â¥Ã™â€žÃ™â€° Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡."
            : "After uploading a report, it will appear here and you can continue to Intelligence Center.",
          href: "/lab-upload",
          buttonText: isArabic ? "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â±Ã™â€¹Ã˜Â§" : "Upload Report",
        }
      : stats.saved > 0
      ? {
          label: isArabic ? "Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â·Ã™Ë†Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â§Ã™â€žÃ™Å Ã˜Â©" : "Next step",
          title: isArabic ? "Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹ Ã˜Â®Ã˜Â·Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©" : "Review your follow-up plan",
          description: isArabic
            ? "Ã™â€žÃ˜Â¯Ã™Å Ã™Æ’ Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬ Ã˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸Ã˜Â©. Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦Ã™â€¡Ã˜Â§ Ã™â€žÃ™â€žÃ˜Â§Ã™â€ Ã˜ÂªÃ™â€šÃ˜Â§Ã™â€ž Ã˜Â¥Ã™â€žÃ™â€° Ã˜Â®Ã˜Â·Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©."
            : "You have saved intelligence results. Use them to continue into your follow-up plan.",
          href: "/health-plan",
          buttonText: isArabic ? "Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜Â®Ã˜Â·Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã˜Â©" : "Open Health Plan",
        }
      : {
          label: isArabic ? "Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â·Ã™Ë†Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â§Ã™â€žÃ™Å Ã˜Â©" : "Next step",
          title: isArabic
            ? "Ã™Ë†Ã™â€žÃ™â€˜Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã™Å  Ã™â€žÃ™â€žÃ˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â±"
            : "Generate intelligence for your reports",
          description: isArabic
            ? "Ã™â€žÃ˜Â¯Ã™Å Ã™Æ’ Ã˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸Ã˜Â©Ã˜Å’ Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â¢Ã™â€  Ã˜ÂªÃ˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã˜Â¥Ã™â€žÃ™â€° Ã™ÂÃ˜ÂªÃ˜Â­ Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã™â€žÃ˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â®Ã˜ÂµÃ˜Â§Ã˜Âª."
            : "You have saved reports. Now open Intelligence Center to generate summaries.",
          href: "/intelligence",
          buttonText: isArabic ? "Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â­ Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡" : "Open Intelligence",
        };

  return (
    <main className="reportsConversionPage" dir={isArabic ? "rtl" : "ltr"}>
      <section className="reportsHero">
        <div>
          <p className="launchEyebrow">
            {isArabic ? "Ã™â€¦Ã™Æ’Ã˜ÂªÃ˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â±" : "Reports Library"}
          </p>

          <h1>
            {isArabic
              ? "Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹ Ã˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â±Ã™Æ’ Ã˜Â§Ã™â€žÃ˜Â·Ã˜Â¨Ã™Å Ã˜Â© Ã™Ë†Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬ Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡"
              : "Track your medical reports and intelligence results"}
          </h1>

          <p>
            {isArabic
              ? "Ã™â€¡Ã˜Â°Ã™â€¡ Ã˜Â§Ã™â€žÃ˜ÂµÃ™ÂÃ˜Â­Ã˜Â© Ã˜ÂªÃ™Ë†Ã˜Â¶Ã™â€˜Ã˜Â­ Ã™â€¡Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸Ã˜Å’ Ã™â€¡Ã™â€ž Ã™Å Ã˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯ Ã˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã˜ÂµÃ˜Â­Ã™Å Ã˜Å’ Ã™Ë†Ã™â€¡Ã™â€ž Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€ Ã˜ÂªÃ™Å Ã˜Â¬Ã˜Â© Ã™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸Ã˜Â© Ã™Å Ã™â€¦Ã™Æ’Ã™â€  Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã˜Â§Ã™â€¦Ã™â€¡Ã˜Â§ Ã™ÂÃ™Å  Ã˜Â®Ã˜Â·Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©."
              : "This page shows whether a report is saved, whether it needs health intelligence generation, and whether a saved result can be used for your follow-up plan."}
          </p>
        </div>

        <div className="reportsHeroCard">
          <span>{primaryNextStep.label}</span>
          <h2>{primaryNextStep.title}</h2>
          <p>{primaryNextStep.description}</p>
          <Link href={primaryNextStep.href} className="launchPrimary">
            {primaryNextStep.buttonText}
          </Link>
        </div>
      </section>

      <section className="reportsStatsGrid">
        <article>
          <span>{isArabic ? "Ã™Æ’Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â±" : "Total reports"}</span>
          <strong>{stats.total}</strong>
          <p>{isArabic ? "Ã˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸Ã˜Â© Ã™ÂÃ™Å  Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨Ã™Æ’" : "Reports saved in your account"}</p>
        </article>

        <article>
          <span>{isArabic ? "Ã˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸" : "Saved intelligence"}</span>
          <strong>{stats.saved}</strong>
          <p>{isArabic ? "Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬ Ã˜Â¬Ã˜Â§Ã™â€¡Ã˜Â²Ã˜Â© Ã™â€žÃ™â€žÃ™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â©" : "Results ready for review"}</p>
        </article>

        <article>
          <span>{isArabic ? "Ã˜ÂªÃ˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯" : "Need generation"}</span>
          <strong>{stats.needsGeneration}</strong>
          <p>{isArabic ? "Ã˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â± Ã˜ÂªÃ˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Generate" : "Reports that need Generate"}</p>
        </article>

        <article>
          <span>{isArabic ? "Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â±Ã˜Â§Ã˜Â¬ Ã™â€¦Ã™Æ’Ã˜ÂªÃ™â€¦Ã™â€ž" : "Extraction completed"}</span>
          <strong>{stats.completedExtraction}</strong>
          <p>{isArabic ? "Ã˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â± Ã˜Â¬Ã˜Â§Ã™â€¡Ã˜Â²Ã˜Â© Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â­Ã™â€žÃ™Å Ã™â€ž" : "Reports ready for analysis"}</p>
        </article>
      </section>

      {loading && (
        <section className="reportsPanel">
          <p className="launchEyebrow">{isArabic ? "Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž" : "Loading"}</p>
          <h2>
            {isArabic
              ? "Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã™â€¦Ã™Æ’Ã˜ÂªÃ˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â±..."
              : "Loading your reports library..."}
          </h2>
        </section>
      )}

      {!loading && message && (
        <section className="reportsPanel">
          <p className="launchEyebrow">{isArabic ? "Ã˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡" : "Notice"}</p>
          <h2>
            {isArabic ? "Ã˜ÂªÃ˜Â¹Ã˜Â°Ã˜Â± Ã˜ÂªÃ˜Â­Ã™â€¦Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â±" : "Could not load reports"}
          </h2>
          <p>{message}</p>
        </section>
      )}

      {!loading && !message && reports.length === 0 && (
        <section className="reportsEmptyState">
          <p className="launchEyebrow">
            {isArabic ? "Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â± Ã˜Â¨Ã˜Â¹Ã˜Â¯" : "No reports yet"}
          </p>

          <h2>
            {isArabic
              ? "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â±Ã™â€¹Ã˜Â§ Ã˜Â·Ã˜Â¨Ã™Å Ã™â€¹Ã˜Â§ Ã™â€žÃ˜ÂªÃ˜Â¨Ã˜Â¯Ã˜Â£ Ã˜Â±Ã˜Â­Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã™Å "
              : "Upload a medical report to start health intelligence"}
          </h2>

          <p>
            {isArabic
              ? "Ã˜Â¨Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â±Ã™ÂÃ˜Â¹Ã˜Å’ Ã˜Â³Ã™Å Ã˜Â¸Ã™â€¡Ã˜Â± Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã™â€¡Ã™â€ Ã˜Â§Ã˜Å’ Ã˜Â«Ã™â€¦ Ã˜ÂªÃ˜Â³Ã˜ÂªÃ˜Â·Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â§Ã™â€ Ã˜ÂªÃ™â€šÃ˜Â§Ã™â€ž Ã˜Â¥Ã™â€žÃ™â€° Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã™â€žÃ˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯ Ã™â€¦Ã™â€žÃ˜Â®Ã˜Âµ Ã™â€žÃ™â€žÃ™â€¦Ã˜Â±Ã™Å Ã˜Â¶ Ã™Ë†Ã™â€¦Ã™â€žÃ˜Â®Ã˜Âµ Ã˜Â¬Ã˜Â§Ã™â€¡Ã˜Â² Ã™â€žÃ™â€žÃ˜Â·Ã˜Â¨Ã™Å Ã˜Â¨."
              : "After upload, the report will appear here, then you can move to Intelligence Center to generate a patient-friendly summary and doctor-ready brief."}
          </p>

          <div className="reportsActionRow">
            <Link href="/lab-upload" className="launchPrimary">
              {isArabic ? "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â±Ã™â€¹Ã˜Â§ Ã˜Â·Ã˜Â¨Ã™Å Ã™â€¹Ã˜Â§" : "Upload Medical Report"}
            </Link>

            <Link href="/dashboard" className="launchSecondary">
              {isArabic ? "Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™Æ’Ã™â€¦" : "Dashboard"}
            </Link>
          </div>
          {reports.length > REPORTS_INITIAL_LIMIT && (
            <div className="reportsShowToggle">
              {canShowMoreReports && (
                <button
                  type="button"
                  className="launchSecondary"
                  onClick={() =>
                    setVisibleReportsCount((current) =>
                      Math.min(current + REPORTS_LOAD_STEP, reports.length)
                    )
                  }
                >
                  {isArabic
                    ? `??? ?????? (${Math.min(REPORTS_LOAD_STEP, hiddenReportsCount)})`
                    : `Show More (${Math.min(REPORTS_LOAD_STEP, hiddenReportsCount)})`}
                </button>
              )}

              {canShowLessReports && (
                <button
                  type="button"
                  className="launchSecondary"
                  onClick={() => setVisibleReportsCount(REPORTS_INITIAL_LIMIT)}
                >
                  {isArabic ? "??? ???" : "Show Less"}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {!loading && !message && reports.length > 0 && (
        <section className="reportsListSection">
          <div className="reportsSectionHeader">
            <p className="launchEyebrow">
              {isArabic ? "Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸Ã˜Â©" : "Saved reports"}
            </p>

            <h2>
              {isArabic
                ? "Ã™Æ’Ã™â€ž Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã™Å Ã˜Â¬Ã˜Â¨ Ã˜Â£Ã™â€  Ã™Å Ã™â€šÃ™Ë†Ã˜Â¯ Ã˜Â¥Ã™â€žÃ™â€° Ã˜Â®Ã˜Â·Ã™Ë†Ã˜Â© Ã™Ë†Ã˜Â§Ã˜Â¶Ã˜Â­Ã˜Â©"
                : "Every report should lead to a clear next step"}
            </h2>

            <p>
              {isArabic
                ? "Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â£Ã˜ÂµÃ™â€žÃ™Å Ã˜Å’ Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€ Ã˜ÂªÃ™â€šÃ™â€ž Ã˜Â¥Ã™â€žÃ™â€° Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡ Ã™â€žÃ˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯/Ã™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ™â€ Ã˜ÂªÃ™Å Ã˜Â¬Ã˜Â©Ã˜Å’ Ã˜Â«Ã™â€¦ Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â·Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã™Å Ã˜Â© Ã™â€žÃ™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©."
                : "Open the original report, continue to Intelligence Center to generate or review results, then use Health Plan for follow-up."}
            </p>
          </div>

          <div className="reportsCardGrid">
            {visibleReports.map((report) => {
              const decision = getReportDecision(report);

              return (
                <article className="reportConversionCard" key={report.reportId}>
                  <div className="reportCardTop">
                    <span>{decision.label}</span>
                    <strong>{getReportTypeLabel(report.reportType)}</strong>
                  </div>

                  <h3>{report.fileName}</h3>

                  <div className="reportMetaGrid">
                    <div>
                      <span>{isArabic ? "Ã˜ÂªÃ˜Â§Ã˜Â±Ã™Å Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â±Ã™ÂÃ˜Â¹" : "Uploaded"}</span>
                      <strong>{formatDate(report.uploadedAt)}</strong>
                    </div>

                    <div>
                      <span>{isArabic ? "Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â±Ã˜Â§Ã˜Â¬" : "Extraction"}</span>
                      <strong>{getExtractionLabel(report.extractionStatus)}</strong>
                    </div>

                    <div>
                      <span>{isArabic ? "Ã˜Â­Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡" : "Intelligence"}</span>
                      <strong>
                        {report.hasSavedIntelligence
                          ? isArabic
                            ? "Ã™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸"
                            : "Saved"
                          : report.aiStatus || (isArabic ? "Ã˜Â¨Ã˜Â§Ã™â€ Ã˜ÂªÃ˜Â¸Ã˜Â§Ã˜Â±" : "Pending")}
                      </strong>
                    </div>
                  </div>

                  <div className="reportDecisionBox">
                    <h4>{decision.title}</h4>
                    <p>{decision.description}</p>
                  </div>

                  {report.summary && (
                    <p className="reportSummary">
                      {report.summary.length > 220
                        ? report.summary.slice(0, 220) + "..."
                        : report.summary}
                    </p>
                  )}

                  {report.nextBestAction && (
                    <p className="reportNextText">
                      <strong>{isArabic ? "Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â·Ã™Ë†Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â§Ã™â€žÃ™Å Ã˜Â©:" : "Next:"}</strong>{" "}
                      {report.nextBestAction}
                    </p>
                  )}

                  <div className="reportsActionRow">
                    <button
                      type="button"
                      className="launchSecondary reportButton"
                      onClick={() => openMedicalReport(report.filePath)}
                      disabled={!report.filePath}
                    >
                      {isArabic ? "Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â±" : "Open Report"}
                    </button>

                    <Link href={decision.href} className="launchPrimary">
                      {decision.buttonText}
                    </Link>

                    {report.hasSavedIntelligence && (
                      <Link href="/health-plan" className="launchSecondary">
                        {isArabic ? "Ã˜Â®Ã˜Â·Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â­Ã˜Â©" : "Health Plan"}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {reports.length > REPORTS_INITIAL_LIMIT && (
            <div className="reportsShowToggle">
              {canShowMoreReports && (
                <button
                  type="button"
                  className="launchSecondary"
                  onClick={() =>
                    setVisibleReportsCount((current) =>
                      Math.min(current + REPORTS_LOAD_STEP, reports.length)
                    )
                  }
                >
                  {isArabic
                    ? `??? ?????? (${Math.min(REPORTS_LOAD_STEP, hiddenReportsCount)})`
                    : `Show More (${Math.min(REPORTS_LOAD_STEP, hiddenReportsCount)})`}
                </button>
              )}

              {canShowLessReports && (
                <button
                  type="button"
                  className="launchSecondary"
                  onClick={() => setVisibleReportsCount(REPORTS_INITIAL_LIMIT)}
                >
                  {isArabic ? "??? ???" : "Show Less"}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      <section className="reportsBottomNav">
        <div>
          <p className="launchEyebrow">
            {isArabic ? "Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â§Ã™â€¦Ã™â€ž" : "Full path"}
          </p>
          <h2>
            {isArabic
              ? "Ã™â€¦Ã™â€  Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã˜Â¥Ã™â€žÃ™â€° Ã˜Â®Ã˜Â·Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©"
              : "From report upload to follow-up plan"}
          </h2>
          <p>
            {isArabic
              ? "Ã˜Â§Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â±Ã˜Å’ Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â­ Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡Ã˜Å’ Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹ Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜Â®Ã˜ÂµÃ˜Â§Ã˜ÂªÃ˜Å’ Ã˜Â«Ã™â€¦ Ã˜Â§Ã™â€ Ã˜ÂªÃ™â€šÃ™â€ž Ã˜Â¥Ã™â€žÃ™â€° Ã˜Â®Ã˜Â·Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©."
              : "Upload the report, open Intelligence Center, review summaries, then continue to your follow-up plan."}
          </p>
        </div>

        <div className="reportsBottomLinks">
          <Link href="/lab-upload">{isArabic ? "Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â±" : "Upload"}</Link>
          <Link href="/intelligence">{isArabic ? "Ã˜Â§Ã™â€žÃ˜Â°Ã™Æ’Ã˜Â§Ã˜Â¡" : "Intelligence"}</Link>
          <Link href="/health-plan">{isArabic ? "Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â·Ã˜Â©" : "Health Plan"}</Link>
          <Link href="/doctor-portal">{isArabic ? "Ã˜Â¨Ã™Ë†Ã˜Â§Ã˜Â¨Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â·Ã˜Â¨Ã™Å Ã˜Â¨" : "Doctor Portal"}</Link>
          <Link href="/dashboard">{isArabic ? "Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™Æ’Ã™â€¦" : "Dashboard"}</Link>
        </div>
      </section>
    </main>
  );
}
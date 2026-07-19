"use client";

import Link from "next/link";
import { generateIntelligenceFromText } from "../../lib/extractedTextIntelligence";
import PageBackActions from "../components/PageBackActions";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  prepareReportMarkerRuntime,
} from "@/lib/services/intelligence/report-marker-runtime.service";
import {
  buildReportIntelligenceResult,
  type GeneratedIntelligenceResult,
} from "@/lib/services/intelligence/report-intelligence-result.service";
import ExecutiveSummaryCard from "./components/ExecutiveSummaryCard";
import {
  getGeneratedResultByInsightId,
  getLatestGeneratedResultByInsightIds,
  getRecentHealthInsights,
  saveGeneratedIntelligenceResult,
  updateHealthInsight,
} from "@/lib/repositories/insight.repository";
import {
  buildHealthInsightUpdate,
} from "@/lib/services/intelligence/intelligence-persistence.service";
import HealthStoryCard from "./components/HealthStoryCard";
import ActionPlanCard from "./components/ActionPlanCard";
import TimelineCard from "./components/TimelineCard";
import LongitudinalRiskCard from "./components/LongitudinalRiskCard";
import LabTrendsCard from "./components/LabTrendsCard";
import CrossSourceCard from "./components/CrossSourceCard";
import DigitalTwinCard from "./components/DigitalTwinCard";
import ForecastCard from "./components/ForecastCard";
import UnifiedHealthCard from "./components/UnifiedHealthCard";
import MedicalReportCard from "./components/MedicalReportCard";
import MedicalReportList from "./components/MedicalReportList";
import HealthPassportCard from "./components/HealthPassportCard";
import TopOpportunitiesCard from "./components/TopOpportunitiesCard";
import DoctorReadySummaryCard from "./components/DoctorReadySummaryCard";
import GeneratedReportDetailsCard from "./components/GeneratedReportDetailsCard";
import PersonalHealthStrategyCard from "./components/PersonalHealthStrategyCard";
import DoctorBriefReportCard from "./components/DoctorBriefReportCard";
import PatientReportPdfCard from "./components/PatientReportPdfCard";
import { getIntelligenceSummary } from "@/lib/services/intelligence/intelligence.service";
import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";
import type {
  HealthRuntimeModuleResult,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime";
import type {
  HealthIntelligenceSummaryData,
} from "@/lib/health-intelligence/engines/health-intelligence-summary.engine";
import {
  healthIntelligencePresenter,
} from "@/lib/health-intelligence/presentation/health-intelligence.presenter";
import {
  getUploadedReportExtractedText,
  getUploadedReportsByIds,
} from "@/lib/repositories/reports.repository";

type Assessment = {
  organ_name: string;
  score: number;
  created_at: string;
};

type DailyCheckIn = {
  mood: string | null;
  wellness_score: number | null;
  created_at: string;
};

type HealthEngine = HealthIntelligenceResult;


type HealthInsight = {
  id: number;
  report_id: number | null;
  report_type: string | null;
  insight_title: string | null;
  ai_status: string | null;
  risk_level: string | null;
  next_best_action: string | null;
  created_at: string;

  medical_category?: string | null;
  summary?: string | null;
  key_findings?: string | null;
  risk_signals?: string | null;
  recommendations?: string | null;
  doctor_brief?: string | null;

  extraction_status?: string | null;
  extracted_text?: string | null;
  extracted_at?: string | null;

  file_name?: string;
  file_path?: string | null;
  uploaded_at?: string;
};

const REPORTS_PAGE_SIZE = 5;

type IntelligenceUiLanguage = "en" | "ar";

function getIntelligenceStoredLanguage(): IntelligenceUiLanguage {
  if (typeof window === "undefined") return "en";

  const savedLanguage =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return savedLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export default function IntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [uiLanguage, setUiLanguage] =
    useState<IntelligenceUiLanguage>("en");
  const isArabicUi = uiLanguage === "ar";

  const [healthEngine, setHealthEngine] = useState<HealthEngine | null>(null);
  const [
    intelligenceSummaryV2,
    setIntelligenceSummaryV2,
  ] = useState<
    HealthRuntimeModuleResult<
      HealthIntelligenceSummaryData
    > | null
  >(null);

  const unifiedDoctorPresentationV2 =
    intelligenceSummaryV2?.status === "ready" &&
    intelligenceSummaryV2.data
      ? healthIntelligencePresenter.presentDoctorIntelligence(
          intelligenceSummaryV2.data,
          isArabicUi ? "ar" : "en"
        )
      : null;

  const unifiedDoctorBriefV2 =
    unifiedDoctorPresentationV2?.brief ?? null;

  const unifiedPatientPresentationV2 =
    intelligenceSummaryV2?.status === "ready" &&
    intelligenceSummaryV2.data
      ? healthIntelligencePresenter.presentPatientIntelligence(
          intelligenceSummaryV2.data,
          isArabicUi ? "ar" : "en"
        )
      : null;
  const [healthInsights, setHealthInsights] = useState<HealthInsight[]>([]);
  const [assessmentData, setAssessmentData] = useState<Assessment[]>([]);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [generatedResult, setGeneratedResult] =
    useState<GeneratedIntelligenceResult | null>(null);
  const [activeGeneratedInsightId, setActiveGeneratedInsightId] =
    useState<number | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null);
  const [visibleReportsCount, setVisibleReportsCount] =
    useState(REPORTS_PAGE_SIZE);
  const handledReportRequestRef = useRef("");

  useEffect(() => {
    loadIntelligence();
  }, []);

  useEffect(() => {
    function syncUiLanguage() {
      const selectedLanguage = getIntelligenceStoredLanguage();

      setUiLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncUiLanguage();

    window.addEventListener("storage", syncUiLanguage);
    window.addEventListener("organheal-language-change", syncUiLanguage);

    return () => {
      window.removeEventListener("storage", syncUiLanguage);
      window.removeEventListener("organheal-language-change", syncUiLanguage);
    };
  }, []);

  function text(en: string, ar: string) {
    return isArabicUi ? ar : en;
  }

  useEffect(() => {
    async function handleRequestedReportFromUrl() {
      if (loading || healthInsights.length === 0 || typeof window === "undefined") {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const requestedReportId = Number(params.get("reportId") || 0);
      const requestedInsightId = Number(params.get("insightId") || 0);
      const shouldAutoAnalyze = params.get("auto") === "1";

      const hasRequestedReport =
        requestedReportId > 0 && !Number.isNaN(requestedReportId);

      const hasRequestedInsight =
        requestedInsightId > 0 && !Number.isNaN(requestedInsightId);

      if (!hasRequestedReport && !hasRequestedInsight) {
        return;
      }

      const requestKey = `${requestedReportId || 0}:${requestedInsightId || 0}:${
        shouldAutoAnalyze ? "auto" : "view"
      }`;

      if (handledReportRequestRef.current === requestKey) {
        return;
      }

      const requestedInsight = healthInsights.find((item) => {
        if (hasRequestedInsight) {
          return item.id === requestedInsightId;
        }

        return item.report_id === requestedReportId || item.id === requestedReportId;
      });

      if (!requestedInsight) {
        handledReportRequestRef.current = requestKey;
        setMessage(
          isArabicUi
            ? "لم يتم العثور على هذا التقرير داخل حسابك."
            : "This report was not found in your account."
        );
        return;
      }

      handledReportRequestRef.current = requestKey;

      const requestedIndex = healthInsights.findIndex(
        (item) => item.id === requestedInsight.id
      );

      setVisibleReportsCount(
        Math.max(REPORTS_PAGE_SIZE, requestedIndex + 1)
      );
      setExpandedReportId(requestedInsight.id);

      if (requestedInsight.ai_status === "Generated") {
        await openSavedGeneratedResult(requestedInsight.id);
        return;
      }

      if (shouldAutoAnalyze) {
        setMessage(
          isArabicUi
            ? "جاري تحليل التقرير المحدد..."
            : "Analyzing the selected report..."
        );

        await generateReportIntelligence(requestedInsight.id);
        return;
      }

      setMessage(
        isArabicUi
          ? "هذا التقرير جاهز للتحليل. اضغط Analyze Report."
          : "This report is ready to analyze. Press Analyze Report."
      );
    }

    handleRequestedReportFromUrl();
  }, [loading, healthInsights, isArabicUi]);
  async function loadIntelligence() {
    setLoading(true);
    setMessage("");

    const currentLanguage = getIntelligenceStoredLanguage();
    const currentIsArabic = currentLanguage === "ar";

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      window.location.href = "/login";
      return;
    }

    const userId = userData.user.id;

    let assessmentData: Assessment[] = [];

try {
  const intelligenceSummary =
    await getIntelligenceSummary(userId);

  assessmentData =
    intelligenceSummary.assessments as Assessment[];

  setAssessmentData(assessmentData);

  setDailyCheckIn(
    intelligenceSummary.latestCheckIn as DailyCheckIn | null
  );

  setHealthEngine(
    intelligenceSummary.healthIntelligence
  );
} catch (error) {
  setMessage(
    error instanceof Error
      ? `Database error: ${error.message}`
      : "Database error"
  );
  setLoading(false);
  return;
}

    setIntelligenceSummaryV2(null);

    try {
      const summaryV2Response =
        await fetch(
          "/api/intelligence-summary",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              userId,
              language:
                currentLanguage,
            }),
          }
        );

      if (!summaryV2Response.ok) {
        throw new Error(
          "Could not load the unified intelligence summary."
        );
      }

      const summaryV2Payload =
        await summaryV2Response.json();

      setIntelligenceSummaryV2(
        summaryV2Payload.summary ??
          null
      );
    } catch (error) {
      console.error(
        "Unified intelligence summary error:",
        error
      );

      setIntelligenceSummaryV2(null);
    }

    let insights;

try {
  insights = await getRecentHealthInsights(userId, 20);
} catch {
  setMessage(
    currentIsArabic
      ? "تعذر تحميل نتائج الذكاء الصحي."
      : "Could not load health intelligence results."
  );
  setLoading(false);
  return;
}

    const reportIds = (insights || [])
  .map((item) => item.report_id)
  .filter((reportId): reportId is number => reportId !== null);

    let reports: Awaited<ReturnType<typeof getUploadedReportsByIds>> = [];

    if (reportIds.length > 0) {
  try {
    reports = await getUploadedReportsByIds(userId, reportIds);
  } catch {
    reports = [];
  }
}

    const mergedInsights = (insights || []).map((item) => {
      const report = reports.find(
        (reportItem) => reportItem.id === item.report_id
      );

      return {
        ...item,
        file_name: report?.file_name || "Medical report",
        file_path: report?.file_path || null,
        uploaded_at: report?.created_at || item.created_at,
        extraction_status: report?.extraction_status || "Pending",
        extracted_text: report?.extracted_text || null,
        extracted_at: report?.extracted_at || null,
      };
    });

    setHealthInsights(mergedInsights);

    setGeneratedResult(null);
    setActiveGeneratedInsightId(null);
    setExpandedReportId(null);
    setVisibleReportsCount(REPORTS_PAGE_SIZE);

    const generatedInsightIds = mergedInsights.map((item) => item.id);

    if (generatedInsightIds.length > 0) {
      try {
  const savedGeneratedResult =
    await getLatestGeneratedResultByInsightIds(
      userId,
      generatedInsightIds
    );

  if (savedGeneratedResult?.result) {
    setGeneratedResult(
      savedGeneratedResult.result as GeneratedIntelligenceResult
    );
    setActiveGeneratedInsightId(savedGeneratedResult.insight_id);
  }
} catch {
  // Keep page loading resilient if no saved result can be loaded.
}
    }

    if (assessmentData.length === 0 && mergedInsights.length === 0) {
      setMessage(
        currentIsArabic
          ? "أكمل أول تقييم عضو أو ارفع تقريرًا طبيًا لتفعيل التحليل الصحي."
          : "Complete your first organ assessment or upload a medical report to unlock intelligence."
      );
    }

    setLoading(false);
  }

  async function openMedicalReport(filePath: string | null | undefined) {
    if (!filePath) return;

    const { data, error } = await supabase.storage
      .from("lab-reports")
      .createSignedUrl(filePath, 60 * 60);

    if (error) {
      alert("Could not open report: " + error.message);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function openSavedGeneratedResult(insightId: number) {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("User session expired. Please log in again.");
      return;
    }

    let savedGeneratedResult;

try {
  savedGeneratedResult =
    await getGeneratedResultByInsightId(
      userData.user.id,
      insightId
    );
} catch (error) {
  alert(
    "Could not load saved intelligence result: " +
      (error instanceof Error ? error.message : String(error))
  );
  return;
    }

    if (!savedGeneratedResult?.result) {
      const shouldRegenerate = window.confirm(
        text(
          "No saved intelligence result was found for this report. Generate it now?",
          "لم يتم العثور على نتيجة ذكاء محفوظة لهذا التقرير. هل تريد توليدها الآن؟"
        )
      );

      if (shouldRegenerate) {
        await generateReportIntelligence(insightId);
      }

      return;
    }

    setGeneratedResult(
      savedGeneratedResult.result as GeneratedIntelligenceResult
    );
    setActiveGeneratedInsightId(insightId);
    setExpandedReportId(insightId);
  }

  async function generateReportIntelligence(insightId: number) {
    const selectedInsight = healthInsights.find((item) => item.id === insightId);

    if (!selectedInsight) return;

    setActiveGeneratedInsightId(null);
    setGeneratedResult(null);

    let extractedText: string | null = null;
const { data: userData } = await supabase.auth.getUser();

if (!userData.user) {
  alert("User session expired. Please log in again.");
  return;
}
    if (selectedInsight.report_id && selectedInsight.file_path) {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError || !sessionData.session?.access_token) {
          alert("Your session expired. Please login again.");
          window.location.href = "/login";
          return;
        }

        const extractionResponse = await fetch("/api/extract-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
        insightId: selectedInsight.id,
        reportId: selectedInsight.report_id,
        filePath: selectedInsight.file_path,
        fileName: selectedInsight.file_name,
      }),
        });

        const extractionResult = await extractionResponse.json();

        if (!extractionResponse.ok || !extractionResult.success) {
          alert(extractionResult.error || "PDF extraction failed.");
          return;
        }

        extractedText = extractionResult.text || null;
      } catch (error) {
        console.error("Extraction failed", error);
        alert("Extraction failed.");
        return;
      }
    }

    if (!extractedText && selectedInsight.report_id) {
  try {
   extractedText = await getUploadedReportExtractedText(
  userData.user.id,
  selectedInsight.report_id
);
  } catch {
    extractedText = null;
  }
}

    if (!extractedText || extractedText.length < 30) {
      alert("No readable report text was extracted yet.");
      return;
    }

    const {
      detectedMarkers,
      historicalMarkerRows,
    } = await prepareReportMarkerRuntime({
      userId: userData.user.id,
      reportId: selectedInsight.report_id,
      extractedText,
    });

    const {
      generatedResultPayload,
      markerSummary,
      radiologySummary,
      isRadiologyReport,
      clinicalPatterns,
    } = buildReportIntelligenceResult({
      extractedText,
      reportType: selectedInsight.report_type,
      detectedMarkers,
      assessments: assessmentData,
      dailyCheckIn,
      historicalMarkerRows,
    });

    const { unifiedHealth } = generatedResultPayload;

    setGeneratedResult(generatedResultPayload);
    setActiveGeneratedInsightId(insightId);
    setExpandedReportId(insightId);

    const intelligence = buildHealthInsightUpdate({
      extractedText,
      reportType: selectedInsight.report_type,
      markerSummary,
      radiologySummary,
      isRadiologyReport,
      clinicalPatterns,
      unifiedHealth,
    });

    try {
  await updateHealthInsight(insightId, intelligence);
} catch (error) {
  alert(
    "Could not generate intelligence: " +
      (error instanceof Error ? error.message : String(error))
  );
  return;
}

   try {
  await saveGeneratedIntelligenceResult({
    userId: userData.user.id,
    insightId,
    reportId: selectedInsight.report_id,
    result: generatedResultPayload,
  });
} catch (error) {
  alert(
    "Could not save generated intelligence result: " +
      (error instanceof Error ? error.message : String(error))
  );
  return;
}

    setHealthInsights((currentInsights) =>
      currentInsights.map((item) =>
        item.id === insightId
          ? {
              ...item,
              ...intelligence,
              extraction_status: "Completed",
              extracted_text: extractedText,
              extracted_at: new Date().toISOString(),
            }
          : item
      )
    );
  }

  function getReportTypeLabel(type: string | null) {
    if (type === "lab") return text("Laboratory Report", "تقرير مختبر");
    if (type === "radiology") return text("Radiology Report", "تقرير أشعة");
    if (type === "discharge") return text("Discharge Summary", "ملخص خروج");
    if (type === "clinical") return text("Clinical Report", "تقرير سريري");
    if (type === "prescription") return text("Prescription", "وصفة طبية");
    return text("Medical Report", "تقرير طبي");
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return text("Not available", "غير متاح");

    return new Date(value).toLocaleString(isArabicUi ? "ar-AE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const visibleHealthInsights = healthInsights.slice(0, visibleReportsCount);

  const totalReportInsights = healthInsights.length;
  const generatedReportsCount = healthInsights.filter(
    (item) => item.ai_status === "Generated"
  ).length;
  const pendingReportsCount = Math.max(totalReportInsights - generatedReportsCount, 0);
  const completedExtractionCount = healthInsights.filter(
    (item) => item.extraction_status === "Completed"
  ).length;
  const hasOpenGeneratedResult = Boolean(generatedResult && activeGeneratedInsightId);

  const intelligenceNextStep =
    totalReportInsights === 0
      ? {
          label: text("START HERE", "ابدأ هنا"),
          title: text("Upload a medical report first", "ارفع تقريرًا طبيًا أولًا"),
          description: text(
            "Add a lab report, radiology report, discharge summary, prescription, or medical document before generating intelligence.",
            "أضف تقرير مختبر، تقرير أشعة، ملخص خروج، وصفة، أو مستند طبي قبل توليد الذكاء."
          ),
          href: "/lab-upload",
          buttonText: text("Upload Report", "رفع تقرير"),
        }
      : hasOpenGeneratedResult
      ? {
          label: text("RESULT READY", "النتيجة جاهزة"),
          title: text("Review your saved analysis", "راجع الذكاء المولّد"),
          description: text(
            "Your patient-friendly report and doctor-ready brief are available below. The next best step is to continue to your Health Plan.",
            "ملخص المريض والملخص الجاهز للطبيب متاحان أدناه. الخطوة التالية هي المتابعة إلى خطة الصحة."
          ),
          href: "/health-plan",
          buttonText: text("Open Health Plan", "افتح خطة الصحة"),
        }
      : generatedReportsCount > 0
      ? {
          label: text("SAVED RESULTS", "نتائج محفوظة"),
          title: text("Open a saved intelligence result", "افتح نتيجة ذكاء محفوظة"),
          description: text(
            "Some reports already have saved analysis. Open a saved result or generate intelligence for another report.",
            "بعض التقارير لديها ذكاء مولّد مسبقًا. افتح نتيجة محفوظة أو ولّد ذكاء لتقرير آخر."
          ),
          href: "/reports",
          buttonText: text("Reports Library", "مكتبة التقارير"),
        }
      : {
          label: text("READY TO GENERATE", "جاهز للتوليد"),
          title: text("Generate intelligence for your report", "ولّد الذكاء لهذا التقرير"),
          description: text(
            "Choose a report below and press Generate to create a patient-friendly summary, doctor-ready brief, and follow-up direction.",
            "اختر تقريرًا بالأسفل واضغط توليد الذكاء لإنشاء ملخص للمريض وملخص جاهز للطبيب واتجاه متابعة."
          ),
          href: "#report-intelligence-list",
          buttonText: text("Go to Reports", "اذهب إلى التقارير"),
        };

  const hasOlderReports = healthInsights.length > visibleReportsCount;
  const canShowLessReports = visibleReportsCount > REPORTS_PAGE_SIZE;

  const requestedReportIdForFocus =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("reportId") || 0)
      : 0;

  const focusedReportInsight =
    healthInsights.find((item) => {
      if (!requestedReportIdForFocus || Number.isNaN(requestedReportIdForFocus)) {
        return false;
      }

      return (
        Number(item.report_id) === requestedReportIdForFocus ||
        Number(item.id) === requestedReportIdForFocus
      );
    }) ||
    (activeGeneratedInsightId
      ? healthInsights.find((item) => item.id === activeGeneratedInsightId)
      : null) ||
    healthInsights.find((item) => item.ai_status !== "Generated") ||
    healthInsights[0] ||
    null;

  const focusedReportIsGenerated = Boolean(
    focusedReportInsight &&
      focusedReportInsight.ai_status === "Generated" &&
      focusedReportInsight.extraction_status === "Completed"
  );

  const focusedReportHasVisibleResult = Boolean(
    focusedReportInsight &&
      generatedResult &&
      activeGeneratedInsightId === focusedReportInsight.id
  );

  const compactHealthInsights = focusedReportInsight
    ? visibleHealthInsights.filter((item) => item.id !== focusedReportInsight.id)
    : visibleHealthInsights;

  return (
    <main
      className="ohPageShell intelligenceFocusPage"
      dir={isArabicUi ? "rtl" : "ltr"}
      lang={isArabicUi ? "ar" : "en"}
    >
      <style>{`
        .intelligenceFocusPage,
        .intelligenceFocusPage * {
          box-sizing: border-box;
        }

        .intelligenceFocusPage a {
          color: inherit;
          text-decoration: none;
        }

        .selectedReportFocus {
          border-top: 6px solid #0f766e;
          background:
            radial-gradient(circle at 88% 8%, rgba(20, 184, 166, 0.14), transparent 30%),
            #ffffff;
          box-shadow: 0 22px 58px rgba(15, 23, 42, 0.08);
        }

        .selectedReportGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 0.48fr);
          gap: 20px;
          align-items: stretch;
        }

        .selectedReportPanel {
          border-radius: 24px;
          padding: 20px;
          background: linear-gradient(135deg, #0f172a, #115e59);
          color: white;
          min-height: 100%;
        }

        .selectedReportPanel .ohMetricLabel,
        .selectedReportPanel .ohCardText {
          color: rgba(226, 232, 240, 0.86);
        }

        .selectedReportPanel .ohCardTitle {
          color: white;
        }

        .intelligenceStatusLine {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-top: 14px;
        }

        .intelligencePill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 8px 11px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #f8fafc;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 900;
          line-height: 1;
          white-space: nowrap;
        }

        .intelligencePill.good {
          background: rgba(16, 185, 129, 0.11);
          color: #047857;
          border-color: rgba(16, 185, 129, 0.22);
        }

        .intelligencePill.moderate {
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
          border-color: rgba(245, 158, 11, 0.24);
        }

        .intelligencePill.neutral {
          background: rgba(37, 99, 235, 0.1);
          color: #1d4ed8;
          border-color: rgba(37, 99, 235, 0.18);
        }

        .intelligencePrimaryAction {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          background: linear-gradient(135deg, #0f766e, #14b8a6);
          color: white;
          font-weight: 950;
          border: 0;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(20, 184, 166, 0.28);
        }

        .intelligenceSecondaryAction {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 16px;
          border-radius: 999px;
          background: white;
          color: #0f766e;
          font-weight: 900;
          border: 1px solid rgba(15, 118, 110, 0.2);
          cursor: pointer;
        }

        .focusedResultStack {
          margin-top: 20px;
          display: grid;
          gap: 16px;
        }

        @media (max-width: 980px) {
          .selectedReportGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal Report Analysis", "تحليل التقارير في OrganHeal")}
              </p>

              <h1 className="ohTitle">
                {text("Report Analysis Center", "مركز تحليل التقارير")}
              </h1>

              <p className="ohLead">
                {text(
                  "A focused view for your health profile, medical reports, top opportunities, and doctor-ready intelligence.",
                  "صفحة مركزة لملفك الصحي، تقاريرك الطبية، أهم الفرص الصحية، والملخصات الجاهزة للطبيب."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/lab-upload" className="primaryBtn">
                  {text("Upload Report", "رفع تقرير")}
                </Link>

                <Link href="/reports" className="secondaryBtn">
                  {text("Reports Library", "مكتبة التقارير")}
                </Link>

                <Link href="/health-plan" className="secondaryBtn">
                  {text("Health Plan", "خطة الصحة")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">{intelligenceNextStep.label}</p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {intelligenceNextStep.title}
                  </h2>
                </div>

                <span className="ohStatusBadge neutral">
                  {totalReportInsights} {text("reports", "تقارير")}
                </span>
              </div>

              <p className="ohCardText">{intelligenceNextStep.description}</p>

              <div className="ohDivider" />

              <Link href={intelligenceNextStep.href} className="primaryBtn">
                {intelligenceNextStep.buttonText}
              </Link>
            </div>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Report Insights", "ذكاء التقارير")}
            </span>
            <span className="ohMetricValue">{totalReportInsights}</span>
            <span className="ohMetricHint">
              {text("available report records", "سجلات تقارير متاحة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Generated", "مولّد")}
            </span>
            <span className="ohMetricValue">{generatedReportsCount}</span>
            <span className="ohMetricHint">
              {text("ready for review", "جاهز للمراجعة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Pending", "بانتظار")}
            </span>
            <span className="ohMetricValue">{pendingReportsCount}</span>
            <span className="ohMetricHint">
              {text("need generation", "تحتاج توليد")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Extraction Completed", "استخراج مكتمل")}
            </span>
            <span className="ohMetricValue">{completedExtractionCount}</span>
            <span className="ohMetricHint">
              {text("ready for analysis", "جاهز للتحليل")}
            </span>
          </article>
        </section>

        {loading && (
          <section className="ohCard">
            <p className="ohEyebrow">
              {text("Loading Intelligence", "تحميل الذكاء")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Preparing your health analysis...",
                "جاري تحضير التحليل الصحي..."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "OrganHeal is loading your assessments, check-ins, reports, and saved intelligence results.",
                "يقوم OrganHeal بتحميل التقييمات، Check-Ins، التقارير، ونتائج التحليل المحفوظة."
              )}
            </p>
          </section>
        )}

        {!loading && message && !healthEngine && healthInsights.length === 0 && (
          <section className="ohEmptyState">
            <h2>{text("Not enough data yet", "لا توجد بيانات كافية بعد")}</h2>
            <p>{message}</p>

            <div className="ohButtonRow" style={{ justifyContent: "center" }}>
              <Link href="/assessment" className="primaryBtn">
                {text("Start Assessment", "ابدأ تقييم")}
              </Link>

              <Link href="/lab-upload" className="secondaryBtn">
                {text("Upload Report", "رفع تقرير")}
              </Link>
            </div>
          </section>
        )}

        {!loading && focusedReportInsight && (
          <section className="ohCard selectedReportFocus">
            <div className="selectedReportGrid">
              <div>
                <p className="ohMetricLabel">
                  {text("Selected report", "التقرير المحدد")}
                </p>

                <h2 className="ohCardTitle" style={{ fontSize: "1.65rem" }}>
                  {focusedReportInsight.file_name || "Medical report"}
                </h2>

                <p className="ohCardText">
                  {focusedReportIsGenerated
                    ? text(
                        "This report already has saved analysis. Review the result below or continue to your health plan.",
                        "هذا التقرير لديه تحليل مولد. راجع النتيجة بالأسفل أو تابع إلى خطة الصحة."
                      )
                    : text(
                        "This report is ready for report intelligence. OrganHeal will extract the report text first, then generate a clearer summary.",
                        "هذا التقرير جاهز للتحليل. سيستخرج OrganHeal نص التقرير أولًا، ثم يولد ملخصًا أوضح."
                      )}
                </p>

                <div className="intelligenceStatusLine">
                  <span className="intelligencePill neutral">
                    {text("Uploaded", "تم الرفع")}:{" "}
                    {formatDate(focusedReportInsight.uploaded_at || focusedReportInsight.created_at)}
                  </span>

                  <span className={`intelligencePill ${
                    focusedReportInsight.extraction_status === "Completed" ? "good" : "moderate"
                  }`}>
                    {text("Extraction", "الاستخراج")}:{" "}
                    {focusedReportInsight.extraction_status || "Pending"}
                  </span>

                  <span className={`intelligencePill ${
                    focusedReportIsGenerated ? "good" : "moderate"
                  }`}>
                    {text("Analysis", "التحليل")}:{" "}
                    {focusedReportIsGenerated
                      ? text("Generated", "مولد")
                      : text("Needs generation", "يحتاج توليد")}
                  </span>
                </div>

                <div className="ohButtonRow" style={{ marginTop: "20px" }}>
                  <button
                    type="button"
                    className="intelligencePrimaryAction"
                    onClick={() => {
                      if (focusedReportIsGenerated) {
                        openSavedGeneratedResult(focusedReportInsight.id);
                      } else {
                        generateReportIntelligence(focusedReportInsight.id);
                      }
                    }}
                  >
                    {focusedReportIsGenerated
                      ? text("View Analysis", "عرض التحليل")
                      : text("Analyze Report", "تحليل التقرير")}
                  </button>

                  <button
                    type="button"
                    className="intelligenceSecondaryAction"
                    onClick={() => openMedicalReport(focusedReportInsight.file_path)}
                    disabled={!focusedReportInsight.file_path}
                  >
                    {text("Open File", "فتح الملف")}
                  </button>

                  <Link href="/reports" className="intelligenceSecondaryAction">
                    {text("Back to Reports", "العودة للتقارير")}
                  </Link>

                  {focusedReportIsGenerated && (
                    <Link href="/health-plan" className="intelligenceSecondaryAction">
                      {text("Health Plan", "خطة الصحة")}
                    </Link>
                  )}
                </div>
              </div>

              <aside className="selectedReportPanel">
                <p className="ohMetricLabel">
                  {text("What happens here", "ماذا يحدث هنا")}
                </p>

                <h3 className="ohCardTitle">
                  {text(
                    "Generate or review one selected report.",
                    "توليد أو مراجعة تحليل تقرير واحد محدد."
                  )}
                </h3>

                <p className="ohCardText">
                  {text(
                    "Reports stay organized in the Reports Library. This page focuses only on analyzing the selected report and showing the result clearly.",
                    "تبقى التقارير منظمة في مكتبة التقارير. هذه الصفحة تركز فقط على تحليل التقرير المحدد وعرض النتيجة بوضوح."
                  )}
                </p>
              </aside>
            </div>

            {focusedReportHasVisibleResult && generatedResult && (
              <div className="focusedResultStack">
                <PatientReportPdfCard
                  fileName={focusedReportInsight.file_name || "Medical report"}
                  uploadedAtText={formatDate(focusedReportInsight.uploaded_at || focusedReportInsight.created_at)}
                  summary={focusedReportInsight.summary}
                  keyFindings={focusedReportInsight.key_findings}
                  riskSignals={focusedReportInsight.risk_signals}
                  recommendations={focusedReportInsight.recommendations}
                  healthStory={generatedResult.healthStory}
                  executiveSummary={generatedResult.executiveSummary}
                  patientPresentation={unifiedPatientPresentationV2}
                />

                <DoctorBriefReportCard
                  fileName={focusedReportInsight.file_name || "Medical report"}
                  reportTypeLabel={getReportTypeLabel(focusedReportInsight.report_type)}
                  uploadedAtText={formatDate(focusedReportInsight.uploaded_at || focusedReportInsight.created_at)}
                  summary={focusedReportInsight.summary}
                  keyFindings={focusedReportInsight.key_findings}
                  riskSignals={focusedReportInsight.risk_signals}
                  recommendations={focusedReportInsight.recommendations}
                  doctorBrief={
  unifiedDoctorBriefV2 ??
  focusedReportInsight.doctor_brief
}
                  executiveSummary={generatedResult.executiveSummary}
                />

                <GeneratedReportDetailsCard
                  medicalCategory={focusedReportInsight.medical_category}
                  summary={focusedReportInsight.summary}
                  keyFindings={focusedReportInsight.key_findings}
                  riskSignals={focusedReportInsight.risk_signals}
                  recommendations={focusedReportInsight.recommendations}
                  doctorBrief={
  unifiedDoctorBriefV2 ??
  focusedReportInsight.doctor_brief
}
                />

                {generatedResult.executiveSummary && (
                  <ExecutiveSummaryCard summary={generatedResult.executiveSummary} />
                )}

                {generatedResult.healthStory && (
                  <HealthStoryCard story={generatedResult.healthStory} />
                )}

                {generatedResult.strategy && (
                  <PersonalHealthStrategyCard strategy={generatedResult.strategy} />
                )}

                {generatedResult.actionPlan && (
                  <ActionPlanCard actionPlan={generatedResult.actionPlan} />
                )}

                {generatedResult.unifiedHealth && (
                  <UnifiedHealthCard unifiedHealth={generatedResult.unifiedHealth} />
                )}

                <TimelineCard timeline={generatedResult.timeline} />
                <LabTrendsCard labTrends={generatedResult.labTrends} />
                <LongitudinalRiskCard
                  longitudinalRisk={generatedResult.longitudinalRisk}
                />
                <CrossSourceCard crossSource={generatedResult.crossSource} />
                <DigitalTwinCard digitalTwin={generatedResult.digitalTwin} />
              </div>
            )}
          </section>
        )}

        {!loading && healthEngine && !focusedReportInsight && (
          <section className="ohStack">
          </section>
        )}

        {!loading && (
          <section className="ohCard" id="report-intelligence-list">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Other report intelligence", "تحليلات تقارير أخرى")}
                </p>

                <h2 className="ohCardTitle">
                  {text(
                    "Open another report if needed",
                    "افتح تقريرًا آخر عند الحاجة"
                  )}
                </h2>

                <p className="ohCardText">
                  {text(
                    "The selected report is shown above. Older report actions stay here in a compact list.",
                    "التقرير المحدد يظهر بالأعلى. أما إجراءات التقارير الأخرى فتبقى هنا بشكل مختصر."
                  )}
                </p>
              </div>

              <span className="ohStatusBadge neutral">
                {visibleHealthInsights.length}/{healthInsights.length}
              </span>
            </div>

            <MedicalReportList hasReports={healthInsights.length > 0}>
              {visibleHealthInsights.map((item) => {
                const isGenerated =
                  item.ai_status === "Generated" &&
                  item.extraction_status === "Completed";

                const isActiveGeneratedReport = activeGeneratedInsightId === item.id;
                const isExpandedReport = expandedReportId === item.id;

                return (
                  <MedicalReportCard
                    key={item.id}
                    fileName={item.file_name || "Medical report"}
                    reportTypeLabel={getReportTypeLabel(item.report_type)}
                    uploadedAtText={formatDate(item.uploaded_at || item.created_at)}
                    extractionStatus={item.extraction_status || "Pending"}
                    isGenerated={isGenerated}
                    isExpanded={isExpandedReport}
                    canOpen={Boolean(item.file_path)}
                    onOpen={() => openMedicalReport(item.file_path)}
                    onGenerate={() => {
                      generateReportIntelligence(item.id);
                    }}
                    onViewGenerated={() => openSavedGeneratedResult(item.id)}
                    onHideGenerated={() => {
                      setExpandedReportId(null);

                      if (activeGeneratedInsightId === item.id) {
                        setGeneratedResult(null);
                        setActiveGeneratedInsightId(null);
                      }
                    }}
                  >
                    {isExpandedReport && (
                      <>
                        {isActiveGeneratedReport && generatedResult && (
                          <>
                            <PatientReportPdfCard
                              fileName={item.file_name || "Medical report"}
                              uploadedAtText={formatDate(item.uploaded_at || item.created_at)}
                              summary={item.summary}
                              keyFindings={item.key_findings}
                              riskSignals={item.risk_signals}
                              recommendations={item.recommendations}
                              healthStory={generatedResult.healthStory}
                              executiveSummary={generatedResult.executiveSummary}
                              patientPresentation={unifiedPatientPresentationV2}
                            />

                            <DoctorBriefReportCard
                              fileName={item.file_name || "Medical report"}
                              reportTypeLabel={getReportTypeLabel(item.report_type)}
                              uploadedAtText={formatDate(item.uploaded_at || item.created_at)}
                              summary={item.summary}
                              keyFindings={item.key_findings}
                              riskSignals={item.risk_signals}
                              recommendations={item.recommendations}
                              doctorBrief={
  unifiedDoctorBriefV2 ??
  item.doctor_brief
}
                              executiveSummary={generatedResult.executiveSummary}
                            />

                            <GeneratedReportDetailsCard
                              medicalCategory={item.medical_category}
                              summary={item.summary}
                              keyFindings={item.key_findings}
                              riskSignals={item.risk_signals}
                              recommendations={item.recommendations}
                              doctorBrief={
  unifiedDoctorBriefV2 ??
  item.doctor_brief
}
                            />

                            {generatedResult.executiveSummary && (
                              <ExecutiveSummaryCard summary={generatedResult.executiveSummary} />
                            )}

                            {generatedResult.healthStory && (
                              <HealthStoryCard story={generatedResult.healthStory} />
                            )}

                            {generatedResult.strategy && (
                              <PersonalHealthStrategyCard strategy={generatedResult.strategy} />
                            )}

                            {generatedResult.actionPlan && (
                              <ActionPlanCard actionPlan={generatedResult.actionPlan} />
                            )}

                            {generatedResult.unifiedHealth && (
                              <UnifiedHealthCard unifiedHealth={generatedResult.unifiedHealth} />
                            )}

                            <TimelineCard timeline={generatedResult.timeline} />
                            <LabTrendsCard labTrends={generatedResult.labTrends} />

                            <LongitudinalRiskCard
                              longitudinalRisk={generatedResult.longitudinalRisk}
                            />

                            <CrossSourceCard crossSource={generatedResult.crossSource} />

                            <DigitalTwinCard digitalTwin={generatedResult.digitalTwin} />

                            <ForecastCard forecast={generatedResult.forecast} />

                            <div className="ohCard">
                              <div className="ohCardHeader">
                                <div>
                                  <p className="ohMetricLabel">
                                    {text("Next Step", "الخطوة التالية")}
                                  </p>

                                  <h2 className="ohCardTitle">
                                    {text(
                                      "Continue your health journey",
                                      "تابع رحلتك الصحية"
                                    )}
                                  </h2>

                                  <p className="ohCardText">
                                    {text(
                                      "Your report intelligence is now available. You can return to your reports library, continue your follow-up plan, or go back to your dashboard overview.",
                                      "أصبح تحليل التقرير متاحًا الآن. يمكنك العودة إلى مكتبة التقارير، متابعة خطة الصحة، أو الرجوع إلى لوحة التحكم."
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="ohButtonRow">
                                <Link href="/reports" className="secondaryBtn">
                                  {text("Reports Library", "مكتبة التقارير")}
                                </Link>

                                <Link href="/health-plan" className="primaryBtn">
                                  {text("Open Health Plan", "افتح خطة الصحة")}
                                </Link>

                                <Link href="/dashboard" className="secondaryBtn">
                                  {text("Dashboard", "لوحة التحكم")}
                                </Link>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </MedicalReportCard>
                );
              })}
            </MedicalReportList>

            {healthInsights.length > REPORTS_PAGE_SIZE && (
              <div
                className="ohButtonRow"
                style={{
                  justifyContent: "center",
                  marginTop: "18px",
                }}
              >
                {hasOlderReports && (
                  <button
                    className="secondaryBtn"
                    onClick={() =>
                      setVisibleReportsCount((currentCount) =>
                        Math.min(currentCount + REPORTS_PAGE_SIZE, healthInsights.length)
                      )
                    }
                  >
                    {text("Show Older Reports", "عرض تقارير أقدم")}
                  </button>
                )}

                {canShowLessReports && (
                  <button
                    className="secondaryBtn"
                    onClick={() => {
                      setVisibleReportsCount(REPORTS_PAGE_SIZE);
                      setExpandedReportId(null);
                      setGeneratedResult(null);
                      setActiveGeneratedInsightId(null);
                    }}
                  >
                    {text("Show Less", "عرض أقل")}
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        <section className="ohTrustNotice">
          <span aria-hidden="true">🛡️</span>
          <div>
            <strong>
              {text("Medical safety reminder", "تذكير السلامة الطبية")}
            </strong>
            <br />
            {text(
              "Health intelligence is an educational interpretation of your assessments, check-ins, and uploaded reports. It does not replace diagnosis, treatment, emergency care, or a licensed clinician.",
              "التحليل الصحي هو تفسير تعليمي للتقييمات، Check-Ins، والتقارير المرفوعة. لا يستبدل التشخيص أو العلاج أو الرعاية الطارئة أو الطبيب المختص."
            )}
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Continue your journey", "تابع رحلتك")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Move from intelligence to action",
                  "انتقل من الذكاء إلى التنفيذ"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "After reviewing intelligence, continue to your health plan, reports library, or dashboard command center.",
                  "بعد مراجعة الذكاء، تابع إلى الخطة الصحية، مكتبة التقارير، أو مركز لوحة التحكم."
                )}
              </p>
            </div>
          </div>

          <div className="ohButtonRow">
            <Link href="/health-plan" className="primaryBtn">
              {text("Health Plan", "الخطة الصحية")}
            </Link>

            <Link href="/reports" className="secondaryBtn">
              {text("Reports", "التقارير")}
            </Link>

            <Link href="/lab-upload" className="secondaryBtn">
              {text("Upload Report", "رفع تقرير")}
            </Link>

            <Link href="/dashboard" className="secondaryBtn">
              {text("Dashboard", "لوحة التحكم")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}








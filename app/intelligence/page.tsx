"use client";

import Link from "next/link";
import { buildActionPlan } from "../../lib/actionPlanEngine";
import { buildHealthStory } from "../../lib/healthStoryEngine";
import { buildHistoricalLabTrends } from "../../lib/historicalLabTrendEngine";
import { buildLongitudinalRisk } from "../../lib/longitudinalRiskEngine";
import { buildHealthTimeline } from "../../lib/healthTimelineEngine";
import { buildPatientDigitalTwin } from "../../lib/patientDigitalTwin";
import { buildCrossSourceIntelligence } from "../../lib/crossSourceIntelligence";
import {
  detectRadiologyFindings,
  buildRadiologySummary,
} from "../../lib/radiologyEngine";
import { generateIntelligenceFromText } from "../../lib/extractedTextIntelligence";
import PageBackActions from "../components/PageBackActions";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { buildHealthIntelligence } from "../../lib/intelligenceBuilder";
import {
  detectLabMarkers,
  buildLabMarkerSummary,
} from "../../lib/labMarkerDetector";
import { buildHealthStrategy } from "../../lib/healthStrategyEngine";
import { buildUnifiedHealthIntelligence } from "../../lib/unifiedHealthEngine";
import { detectClinicalPatterns } from "../../lib/clinicalPatternEngine";
import { buildForecast } from "../../lib/forecastEngine";
import ExecutiveSummaryCard from "./components/ExecutiveSummaryCard";
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

type HealthEngine = ReturnType<typeof buildHealthIntelligence>;

type GeneratedIntelligenceResult = {
  strategy: any;
  unifiedHealth: any;
  digitalTwin: any;
  crossSource: any;
  timeline: any;
  longitudinalRisk: any;
  forecast: any;
  healthStory: string;
  actionPlan: any;
  executiveSummary: any;
  labTrends: any[];
};

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

    const { data: checkInData } = await supabase
      .from("daily_checkins")
      .select("mood, wellness_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setDailyCheckIn(checkInData || null);

    const { data: assessments, error: assessmentError } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (assessmentError) {
      setMessage("Database error: " + assessmentError.message);
      setLoading(false);
      return;
    }

    const assessmentData = (assessments || []) as Assessment[];
    setAssessmentData(assessmentData);

    if (assessmentData.length > 0) {
      const intelligence = buildHealthIntelligence({
        assessments: assessmentData,
        labReport: null,
        dailyCheckIn: null,
        isArabic: false,
      });

      setHealthEngine(intelligence);
    }

    const { data: insights, error: insightsError } = await supabase
      .from("health_insights")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (insightsError) {
      setMessage(
        currentIsArabic
          ? "تعذر تحميل ذكاء التقارير الطبية."
          : "Could not load medical report intelligence."
      );
      setLoading(false);
      return;
    }

    const reportIds = (insights || [])
      .map((item) => item.report_id)
      .filter(Boolean);

    let reports: {
      id: number;
      file_name: string;
      file_path: string;
      created_at: string;
      extraction_status: string | null;
      extracted_text: string | null;
      extracted_at: string | null;
    }[] = [];

    if (reportIds.length > 0) {
      const { data: reportData } = await supabase
        .from("uploaded_lab_files")
        .select(
          "id, file_name, file_path, created_at, extraction_status, extracted_text, extracted_at"
        )
        .in("id", reportIds);

      reports = reportData || [];
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
      const { data: savedGeneratedResult, error: savedGeneratedResultError } =
        await supabase
          .from("generated_intelligence_results")
          .select("insight_id, result, updated_at")
          .eq("user_id", userId)
          .in("insight_id", generatedInsightIds)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (!savedGeneratedResultError && savedGeneratedResult?.result) {
        setGeneratedResult(
          savedGeneratedResult.result as GeneratedIntelligenceResult
        );
        setActiveGeneratedInsightId(savedGeneratedResult.insight_id);
      }
    }

    if (assessmentData.length === 0 && mergedInsights.length === 0) {
      setMessage(
        currentIsArabic
          ? "أكمل أول تقييم عضو أو ارفع تقريرًا طبيًا لتفعيل الذكاء الصحي."
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

    const { data: savedGeneratedResult, error } = await supabase
      .from("generated_intelligence_results")
      .select("result")
      .eq("user_id", userData.user.id)
      .eq("insight_id", insightId)
      .maybeSingle();

    if (error) {
      alert("Could not load saved intelligence result: " + error.message);
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
      const { data: reportData } = await supabase
        .from("uploaded_lab_files")
        .select("extracted_text")
        .eq("id", selectedInsight.report_id)
        .single();

      extractedText = reportData?.extracted_text || null;
    }

    if (!extractedText || extractedText.length < 30) {
      alert("No readable report text was extracted yet.");
      return;
    }

    const detectedMarkers = detectLabMarkers(extractedText);
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("User session expired. Please log in again.");
      return;
    }

    if (selectedInsight.report_id) {
      const markerRows = detectedMarkers
        .filter((marker) => marker.value !== null)
        .map((marker) => ({
          user_id: userData.user.id,
          report_id: selectedInsight.report_id,
          marker_name: marker.marker,
          marker_value: marker.value,
          marker_unit: marker.unit,
        }));

      if (markerRows.length > 0) {
        await supabase.from("medical_report_markers").insert(markerRows);
      }
    }

    const markerSummary = buildLabMarkerSummary(detectedMarkers);

    let historicalMarkerRows: any[] = [];

    const { data: userDataForHistory } = await supabase.auth.getUser();

    if (userDataForHistory.user) {
      const { data } = await supabase
        .from("medical_report_markers")
        .select("marker_name, marker_value, created_at")
        .eq("user_id", userDataForHistory.user.id)
        .order("created_at", { ascending: true });

      historicalMarkerRows = data || [];
    }

    const labTrends = buildHistoricalLabTrends(
      historicalMarkerRows
        .filter((row) => row.marker_value !== null)
        .map((row) => ({
          marker: row.marker_name,
          value: Number(row.marker_value),
          date: row.created_at,
        }))
    );

    const radiologyFindings = detectRadiologyFindings(extractedText);
    const radiologySummary = buildRadiologySummary(radiologyFindings);
    const isRadiologyReport = selectedInsight.report_type === "radiology";

    const clinicalPatterns = detectClinicalPatterns(detectedMarkers);
    const healthStrategy = buildHealthStrategy(detectedMarkers);

    const unifiedHealth = buildUnifiedHealthIntelligence({
      detectedMarkers,
      healthStrategy,
    });

    const digitalTwin = buildPatientDigitalTwin({
      markers: detectedMarkers,
      radiologyFindings,
    });

    const crossSource = buildCrossSourceIntelligence({
      detectedMarkers,
      assessments: assessmentData,
      dailyCheckIn,
    });

    const timeline = buildHealthTimeline([
      ...assessmentData.map((item) => ({
        source: "assessment" as const,
        label: item.organ_name,
        score: item.score,
        date: item.created_at,
      })),

      ...(dailyCheckIn
        ? [
            {
              source: "checkin" as const,
              label: "Daily Check-In",
              score: dailyCheckIn.wellness_score || 0,
              date: dailyCheckIn.created_at,
            },
          ]
        : []),
    ]);

    const longitudinalRisk = buildLongitudinalRisk(timeline);
    const forecast = buildForecast(detectedMarkers, crossSource.confidenceScore);

    const healthStory = buildHealthStory({
      timeline,
      longitudinalRisk,
      forecast,
      crossSource,
      digitalTwin,
    });

    const actionPlan = buildActionPlan({
      digitalTwin,
      forecast,
      longitudinalRisk,
      crossSource,
    });

    const executiveSummary = {
      currentScore: forecast.currentScore,
      trend: timeline.trendDirection,
      forecastScore: forecast.forecastScore,
      confidenceLevel: crossSource.confidenceLevel,
      confidenceScore: crossSource.confidenceScore,
      prioritySystem: digitalTwin.primarySystem,
      nextBestAction: unifiedHealth.nextBestAction,
    };

    const generatedResultPayload: GeneratedIntelligenceResult = {
      strategy: healthStrategy,
      unifiedHealth,
      digitalTwin,
      crossSource,
      timeline,
      longitudinalRisk,
      forecast,
      healthStory,
      actionPlan,
      executiveSummary,
      labTrends,
    };

    setGeneratedResult(generatedResultPayload);
    setActiveGeneratedInsightId(insightId);
    setExpandedReportId(insightId);

    const intelligence = {
      ...generateIntelligenceFromText(extractedText, selectedInsight.report_type),
      ai_status: "Generated",
      summary: isRadiologyReport ? radiologySummary.summary : markerSummary.summary,
      key_findings: isRadiologyReport
        ? radiologySummary.riskSignals
        : markerSummary.keyFindings,
      risk_signals:
        clinicalPatterns.length > 0
          ? clinicalPatterns
              .map(
                (pattern) =>
                  `${pattern.title} (${pattern.severity}): ${pattern.summary}`
              )
              .join("\n")
          : markerSummary.riskSignals,
      recommendations: isRadiologyReport
        ? radiologySummary.recommendations
        : clinicalPatterns.length > 0
        ? clinicalPatterns
            .map((pattern) => `${pattern.title}: ${pattern.suggestedFocus}`)
            .join("\n")
        : markerSummary.recommendations,
      doctor_brief: `Detected lab markers:
${markerSummary.keyFindings}

Unified Health Intelligence:
${unifiedHealth.healthForecast}

Priority Goal:
${unifiedHealth.priorityGoal}

Next Best Action:
${unifiedHealth.nextBestAction}

Clinical note: This is an educational interpretation and should be reviewed by a licensed healthcare professional.`,
    };

    const { error } = await supabase
      .from("health_insights")
      .update(intelligence)
      .eq("id", insightId);

    if (error) {
      alert("Could not generate intelligence: " + error.message);
      return;
    }

    const { error: saveGeneratedResultError } = await supabase
      .from("generated_intelligence_results")
      .upsert(
        {
          user_id: userData.user.id,
          insight_id: insightId,
          report_id: selectedInsight.report_id,
          result: generatedResultPayload,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,insight_id",
        }
      );

    if (saveGeneratedResultError) {
      alert(
        "Generated intelligence was created, but could not be saved: " +
          saveGeneratedResultError.message
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
          title: text("Review your generated intelligence", "راجع الذكاء المولّد"),
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
            "Some reports already have generated intelligence. Open a saved result or generate intelligence for another report.",
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

  return (
    <main
      className="ohPageShell"
      dir={isArabicUi ? "rtl" : "ltr"}
      lang={isArabicUi ? "ar" : "en"}
    >
      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal Intelligence Center", "مركز الذكاء في OrganHeal")}
              </p>

              <h1 className="ohTitle">
                {text("Health Intelligence Center", "مركز الذكاء الصحي")}
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
              {text("ready for intelligence", "جاهز للذكاء")}
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
                "Preparing your health intelligence...",
                "جاري تحضير الذكاء الصحي..."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "OrganHeal is loading your assessments, check-ins, reports, and saved intelligence results.",
                "يقوم OrganHeal بتحميل التقييمات، Check-Ins، التقارير، ونتائج الذكاء المحفوظة."
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

        {!loading && healthEngine && (
          <section className="ohStack">
            <HealthPassportCard
              healthProfile={healthEngine.healthProfile}
              overallScore={healthEngine.overallScore}
              healthAgeStatus={healthEngine.healthAgeStatus}
              priorityOrgan={healthEngine.priorityOrgan}
              potentialScore={healthEngine.potentialScore}
            />

            <TopOpportunitiesCard
              strongestOrgan={healthEngine.strongestOrgan}
              riskPattern={healthEngine.riskPattern}
              potentialGain={healthEngine.potentialGain}
              opportunities={healthEngine.opportunities.slice(0, 3)}
            />

            <DoctorReadySummaryCard
              overallScore={healthEngine.overallScore}
              priorityOrgan={healthEngine.priorityOrgan}
              riskPattern={healthEngine.riskPattern}
              opportunityTitle={healthEngine.opportunityTitle}
              bestNextAction={healthEngine.bestNextAction}
            />
          </section>
        )}

        {!loading && (
          <section className="ohCard" id="report-intelligence-list">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Report Intelligence", "ذكاء التقارير")}
                </p>

                <h2 className="ohCardTitle">
                  {text(
                    "Generate or review report intelligence",
                    "ولّد أو راجع ذكاء التقارير"
                  )}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Open a medical report, generate intelligence, or review saved patient and doctor-ready summaries.",
                    "افتح تقريرًا طبيًا، ولّد الذكاء، أو راجع ملخصات المريض والملخصات الجاهزة للطبيب."
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
                            />

                            <DoctorBriefReportCard
                              fileName={item.file_name || "Medical report"}
                              reportTypeLabel={getReportTypeLabel(item.report_type)}
                              uploadedAtText={formatDate(item.uploaded_at || item.created_at)}
                              summary={item.summary}
                              keyFindings={item.key_findings}
                              riskSignals={item.risk_signals}
                              recommendations={item.recommendations}
                              doctorBrief={item.doctor_brief}
                              executiveSummary={generatedResult.executiveSummary}
                            />

                            <GeneratedReportDetailsCard
                              medicalCategory={item.medical_category}
                              summary={item.summary}
                              keyFindings={item.key_findings}
                              riskSignals={item.risk_signals}
                              recommendations={item.recommendations}
                              doctorBrief={item.doctor_brief}
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
                                      "أصبح ذكاء التقرير متاحًا الآن. يمكنك العودة إلى مكتبة التقارير، متابعة خطة الصحة، أو الرجوع إلى لوحة التحكم."
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
              "الذكاء الصحي هو تفسير تعليمي للتقييمات، Check-Ins، والتقارير المرفوعة. لا يستبدل التشخيص أو العلاج أو الرعاية الطارئة أو الطبيب المختص."
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





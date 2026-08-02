"use client";

import Link from "next/link";
import {
  loadIntelligencePage,
} from "@/lib/services/intelligence/intelligence-page-loader.service";
import {
  generateReportIntelligenceRuntime,
} from "@/lib/services/intelligence/report-intelligence-generation-runtime.service";
import PageBackActions from "../components/PageBackActions";
import { useEffect, useRef, useState } from "react";
import type {
  GeneratedIntelligenceResult,
} from "@/lib/services/intelligence/report-intelligence-result.service";
import { presentUnifiedHealth } from "@/lib/presentation/intelligence/unified-health.presenter";
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
import HealthPassportCard from "./components/HealthPassportCard";
import GeneratedReportDetailsCard from "./components/GeneratedReportDetailsCard";
import PersonalHealthStrategyCard from "./components/PersonalHealthStrategyCard";
import DoctorBriefReportCard from "./components/DoctorBriefReportCard";
import PatientReportPdfCard from "./components/PatientReportPdfCard";

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
  loadSavedReportIntelligence,
} from "@/lib/services/intelligence/saved-report-intelligence-runtime.service";
import {
  getIntelligenceSession,
} from "@/lib/services/intelligence/intelligence-session-runtime.service";
import {
  createUploadedReportSignedUrl,
} from "@/lib/repositories/reports.repository";
import {
  getIntelligenceReportRequest,
} from "@/lib/services/intelligence/intelligence-report-request.service";
import {
  getFocusedReportInsight,
  getIntelligenceReportListView,
} from "@/lib/selectors/intelligence-page.selectors";

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
function isAdvancedRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getAdvancedText(
  value: unknown,
  keys: string[]
): string {
  if (!isAdvancedRecord(value)) return "";

  for (const key of keys) {
    const candidate = value[key];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (
      typeof candidate === "number" &&
      Number.isFinite(candidate)
    ) {
      return String(candidate);
    }
  }

  return "";
}

function hasAdvancedResult(
  value: unknown,
  arrayKeys: string[],
  textKeys: string[]
): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (!isAdvancedRecord(value)) {
    return false;
  }

  const hasItems = arrayKeys.some((key) => {
    const candidate = value[key];

    return Array.isArray(candidate) && candidate.length > 0;
  });

  if (hasItems) {
    return true;
  }

  return textKeys.some((key) => {
    const candidate = value[key];

    return (
      (typeof candidate === "string" &&
        candidate.trim().length > 0) ||
      (typeof candidate === "number" &&
        Number.isFinite(candidate))
    );
  });
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

      const {
  requestedReportId,
  requestedInsightId,
  shouldAutoAnalyze,
  hasRequestedReport,
  hasRequestedInsight,
  requestKey,
} = getIntelligenceReportRequest(window.location.search);

      if (handledReportRequestRef.current === requestKey) {
        return;
      }

      const requestedInsight = healthInsights.find((item) => {
        if (hasRequestedInsight) {
          return item.id === requestedInsightId;
        }

        return (
  Number(item.report_id) === requestedReportId ||
  Number(item.id) === requestedReportId
);
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

    const reportRequest =
      typeof window !== "undefined"
        ? getIntelligenceReportRequest(window.location.search)
        : null;

    const requestedReportId = reportRequest?.requestedReportId;

    const hasSelectedReport =
      Boolean(reportRequest?.hasRequestedReport) ||
      Boolean(reportRequest?.hasRequestedInsight);

    const currentIsArabic = currentLanguage === "ar";

    const sessionResult =
      await getIntelligenceSession();

    if (!sessionResult.success) {
      window.location.href = "/login";
      return;
    }

    if (!hasSelectedReport) {
      window.location.replace("/reports?select=intelligence");
      return;
    }

    const pageResult =
  await loadIntelligencePage(
    sessionResult.userId,
    currentLanguage,
    requestedReportId
  );

    if (!pageResult.success) {
      setMessage(pageResult.errorMessage);
      setLoading(false);
      return;
    }

    const {
      intelligenceSummary,
      intelligenceSummaryV2,
      insights,
      latestGeneratedResult,
    } = pageResult.data;

    const assessmentData =
      intelligenceSummary.assessments as Assessment[];

    setAssessmentData(assessmentData);

    setDailyCheckIn(
      intelligenceSummary.latestCheckIn as
        | DailyCheckIn
        | null
    );

    setHealthEngine(
      intelligenceSummary.healthIntelligence
    );

    setIntelligenceSummaryV2(
      intelligenceSummaryV2
    );

    setHealthInsights(insights);

    setGeneratedResult(
      latestGeneratedResult?.result
        ? latestGeneratedResult.result as GeneratedIntelligenceResult
        : null
    );

    setActiveGeneratedInsightId(
      latestGeneratedResult?.insight_id ?? null
    );

    setExpandedReportId(null);
    setVisibleReportsCount(REPORTS_PAGE_SIZE);

    if (
      assessmentData.length === 0 &&
      insights.length === 0
    ) {
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

    try {
      const signedUrl = await createUploadedReportSignedUrl(filePath);
      window.open(signedUrl, "_blank");
    } catch (error) {
      alert(
        "Could not open report: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }
  async function openSavedGeneratedResult(insightId: number) {
    const sessionResult = await getIntelligenceSession();

    if (!sessionResult.success) {
      alert(sessionResult.errorMessage);
      return;
    }

    const savedResultRuntime = await loadSavedReportIntelligence({
      userId: sessionResult.userId,
      insightId,
    });

    if (!savedResultRuntime.success) {
      alert(
        "Could not load saved intelligence result: " +
          savedResultRuntime.errorMessage
      );
      return;
    }

    const savedGeneratedResult =
      savedResultRuntime.savedGeneratedResult;
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
    const selectedInsight = healthInsights.find(
      (item) => item.id === insightId
    );

    if (!selectedInsight) return;

    setActiveGeneratedInsightId(null);
    setGeneratedResult(null);

    const sessionResult = await getIntelligenceSession();

    if (!sessionResult.success) {
      alert(sessionResult.errorMessage);
      return;
    }

    const generationResult =
      await generateReportIntelligenceRuntime({
        userId: sessionResult.userId,
        insight: selectedInsight,
        assessments: assessmentData,
        dailyCheckIn,
      });

    if (!generationResult.success) {
      if (generationResult.stage === "report-text") {
        alert(generationResult.errorMessage);

        if (generationResult.requiresLogin) {
          window.location.href = "/login";
        }
      } else if (generationResult.stage === "health-insight") {
        alert(
          "Could not generate intelligence: " +
            generationResult.errorMessage
        );
      } else {
        alert(
          "Could not save generated intelligence result: " +
            generationResult.errorMessage
        );
      }

      return;
    }

    setGeneratedResult(generationResult.generatedResult);
    setActiveGeneratedInsightId(insightId);
    setExpandedReportId(insightId);

    setHealthInsights((currentInsights) =>
      currentInsights.map((item) =>
        item.id === insightId
          ? {
              ...item,
              ...generationResult.intelligence,
              extraction_status: "Completed",
              extracted_text: generationResult.extractedText,
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

  const requestedReportIdForFocus =
  typeof window !== "undefined"
    ? getIntelligenceReportRequest(window.location.search).requestedReportId
    : 0;

  const focusedReportInsight = getFocusedReportInsight({
  healthInsights,
  requestedReportId: requestedReportIdForFocus,
  activeGeneratedInsightId,
});

const {
  visibleHealthInsights,
  compactHealthInsights,
  hasOlderReports,
  canShowLessReports,
} = getIntelligenceReportListView({
  healthInsights,
  visibleReportsCount,
  reportsPageSize: REPORTS_PAGE_SIZE,
  focusedReportInsight,
});

  const focusedReportIsGenerated = Boolean(
    focusedReportInsight &&
      focusedReportInsight.ai_status === "Generated" &&
      focusedReportInsight.extraction_status === "Completed"
  );

  const unifiedHealthPresentation = generatedResult?.unifiedHealth
    ? presentUnifiedHealth(generatedResult.unifiedHealth)
    : null;

  const focusedReportHasVisibleResult = Boolean(
    focusedReportInsight &&
      generatedResult &&
      activeGeneratedInsightId === focusedReportInsight.id
  );
const hasLongitudinalRiskResult = hasAdvancedResult(
  generatedResult?.longitudinalRisk,
  [
    "items",
    "risks",
    "riskItems",
    "riskSignals",
    "longitudinalRisks",
    "patterns",
    "trends",
  ],
  [
    "summary",
    "overview",
    "narrative",
    "description",
    "overallRiskLevel",
    "overallRisk",
    "riskLevel",
    "level",
  ]
);

const hasCrossSourceResult = hasAdvancedResult(
  generatedResult?.crossSource,
  [
    "items",
    "findings",
    "connections",
    "patterns",
    "insights",
    "crossSource",
    "crossSourceInsights",
    "crossSourceFindings",
  ],
  [
    "summary",
    "overview",
    "narrative",
    "description",
  ]
);

const crossSourceConfidence = getAdvancedText(
  generatedResult?.crossSource,
  [
    "confidence",
    "confidenceLevel",
    "reliability",
    "signalStrength",
  ]
);

const hasDigitalHealthModelResult = hasAdvancedResult(
  generatedResult?.digitalTwin,
  [
    "items",
    "signals",
    "systems",
    "organs",
    "organSignals",
    "digitalTwin",
    "twinSignals",
    "healthModel",
  ],
  [
    "summary",
    "overview",
    "narrative",
    "description",
  ]
);

const hasForecastResult = hasAdvancedResult(
  generatedResult?.forecast,
  [
    "items",
    "forecasts",
    "predictions",
    "projections",
    "riskForecasts",
    "healthForecasts",
    "forecastItems",
    "nextSteps",
  ],
  [
    "summary",
    "overview",
    "narrative",
    "description",
  ]
);

const hasDevelopingAdvancedModels =
  !hasLongitudinalRiskResult ||
  !hasCrossSourceResult ||
  !hasDigitalHealthModelResult ||
  !hasForecastResult;

const hasReportEvidence = Boolean(
  focusedReportInsight &&
    (
      focusedReportInsight.summary?.trim() ||
      focusedReportInsight.key_findings?.trim() ||
      focusedReportInsight.risk_signals?.trim() ||
      focusedReportInsight.recommendations?.trim()
    )
);

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

        .intelligenceCompactHero {
  padding: 26px 30px;
}

.intelligenceCompactHero .ohHeroGrid {
  grid-template-columns: minmax(0, 1fr);
}

.intelligenceCompactHero .ohTitle {
  max-width: 820px;
  margin-top: 8px;
  font-size: clamp(2rem, 3.2vw, 3rem);
}

.intelligenceCompactHero .ohLead {
  max-width: 820px;
  margin-top: 12px;
}

        .analysisDocumentsHeader {
          margin-bottom: 18px;
        }

        .analysisDocumentAnchor {
          scroll-margin-top: 110px;
        }

        .analysisDocumentAnchor + .analysisDocumentAnchor {
          margin-top: 18px;
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
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
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
.selectedReportActions {
  display: grid;
  gap: 18px;
  margin-top: 20px;
}

.selectedReportActionGroup {
  display: grid;
  gap: 10px;
}

.selectedReportActionGroup + .selectedReportActionGroup {
  padding-top: 16px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.selectedReportActionLabel {
  margin: 0;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.selectedReportActionGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  max-width: 760px;
}

.selectedReportActionButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 16px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 14px;
  background: #ffffff;
  color: #0f766e !important;
  font-size: 0.82rem;
  font-weight: 900;
  line-height: 1.2;
  text-align: center;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.selectedReportActionButton:hover {
  background: #f0fdfa;
  border-color: rgba(15, 118, 110, 0.3);
  transform: translateY(-1px);
}

.selectedReportActionButton.primary {
  border-color: transparent;
  background: linear-gradient(
    135deg,
    #0f766e,
    #14b8a6
  );
  color: #ffffff !important;
  box-shadow: 0 10px 24px rgba(20, 184, 166, 0.2);
}

.selectedReportActionButton.primary:hover {
  background: linear-gradient(
    135deg,
    #0d6963,
    #0f9f92
  );
}

.selectedReportActionButton.document {
  background: #f0fdfa;
}

.selectedReportActionButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 820px) {
  .selectedReportActionGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .selectedReportActionGrid {
    grid-template-columns: 1fr;
  }
}
        .focusedResultStack {
          margin-top: 20px;
          display: grid;
          gap: 16px;
        }

        .intelligenceResultLayer {
          display: grid;
          gap: 18px;
          padding: 22px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 28px;
          background:
            radial-gradient(
              circle at 92% 5%,
              rgba(20, 184, 166, 0.09),
              transparent 30%
            ),
            #ffffff;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.06);
        }

        .intelligenceActionLayer {
          background:
            radial-gradient(
              circle at 92% 5%,
              rgba(37, 99, 235, 0.09),
              transparent 30%
            ),
            linear-gradient(180deg, #ffffff, #f8fbff);
        }

        .intelligenceLayerHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 17px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .intelligenceLayerEyebrow {
          margin: 0 0 7px;
          color: #0f766e;
          font-size: 0.75rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .intelligenceLayerTitle {
          margin: 0;
          color: #0f172a;
          font-size: clamp(1.28rem, 2vw, 1.68rem);
          font-weight: 950;
          letter-spacing: -0.025em;
        }

        .intelligenceLayerDescription {
          max-width: 760px;
          margin: 8px 0 0;
          color: #64748b;
          font-weight: 650;
          line-height: 1.7;
        }

        .intelligenceLayerNumber {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 44px;
          width: 44px;
          height: 44px;
          border-radius: 15px;
          background: #ecfdf5;
          color: #047857;
          font-size: 0.83rem;
          font-weight: 950;
        }

        .intelligenceLayerContent {
          display: grid;
          gap: 16px;
        }

        .intelligenceEvidenceStatus {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px 15px;
  border-radius: 16px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  background: #f0fdfa;
}

.intelligenceEvidenceStatus.developing {
  border-color: rgba(245, 158, 11, 0.24);
  background: #fffbeb;
}

.intelligenceEvidenceStatusMark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #ccfbf1;
  color: #0f766e;
  font-size: 0.78rem;
  font-weight: 950;
}

.intelligenceEvidenceStatus.developing
  .intelligenceEvidenceStatusMark {
  background: #fef3c7;
  color: #b45309;
}

.intelligenceEvidenceStatus strong {
  display: block;
  color: #0f172a;
  font-size: 0.86rem;
}

.intelligenceEvidenceStatus p {
  margin: 3px 0 0;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.55;
}

.intelligenceHealthStatus {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) repeat(2, minmax(150px, 0.55fr));
  gap: 12px;
  align-items: stretch;
  padding: 15px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      rgba(239, 246, 255, 0.96),
      rgba(240, 253, 250, 0.92)
    );
}

.intelligenceHealthStatusMain,
.intelligenceHealthStatusMetric {
  display: grid;
  align-content: center;
  gap: 4px;
  min-width: 0;
  padding: 10px 12px;
}

.intelligenceHealthStatusMetric {
  border-inline-start: 1px solid rgba(15, 23, 42, 0.08);
}

.intelligenceHealthStatusLabel {
  margin: 0;
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 950;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.intelligenceHealthStatusValue {
  margin: 0;
  color: #0f172a;
  font-size: 0.94rem;
  font-weight: 950;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.intelligenceHealthStatusMain
  .intelligenceHealthStatusValue {
  color: #0f766e;
  font-size: 1.04rem;
}

@media (max-width: 720px) {
  .intelligenceHealthStatus {
    grid-template-columns: 1fr;
  }

  .intelligenceHealthStatusMetric {
    border-inline-start: 0;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
  }
}

        .intelligenceDisclosure {
          overflow: hidden;
          border: 1px solid rgba(15, 23, 42, 0.09);
          border-radius: 27px;
          background: #ffffff;
          box-shadow: 0 16px 46px rgba(15, 23, 42, 0.055);
        }

        .intelligenceDisclosure[open] {
          box-shadow: 0 22px 60px rgba(15, 23, 42, 0.085);
        }

        .intelligenceDisclosureSummary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px;
          cursor: pointer;
          list-style: none;
          user-select: none;
        }

        .intelligenceDisclosureSummary::-webkit-details-marker {
          display: none;
        }

        .intelligenceDisclosureSummary:hover {
          background: rgba(248, 250, 252, 0.9);
        }

        .intelligenceDisclosureLead {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
        }

        .intelligenceDisclosureIcon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 45px;
          width: 45px;
          height: 45px;
          border-radius: 15px;
          background: linear-gradient(135deg, #0f172a, #115e59);
          color: #ffffff;
          font-size: 0.81rem;
          font-weight: 950;
        }

        .intelligenceDisclosureTitle {
          display: block;
          color: #0f172a;
          font-size: 1.08rem;
          font-weight: 950;
        }

        .intelligenceDisclosureDescription {
          display: block;
          max-width: 760px;
          margin-top: 6px;
          color: #64748b;
          font-size: 0.88rem;
          font-weight: 650;
          line-height: 1.55;
        }

        .intelligenceDisclosureChevron {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #334155;
          font-size: 1rem;
          font-weight: 950;
          transition:
            transform 180ms ease,
            background 180ms ease,
            color 180ms ease;
        }

        .intelligenceDisclosure[open]
          .intelligenceDisclosureChevron {
          transform: rotate(180deg);
          background: #ecfdf5;
          color: #047857;
        }

        .intelligenceDisclosureContent {
          display: grid;
          gap: 16px;
          padding: 20px 22px 22px;
          border-top: 1px solid rgba(15, 23, 42, 0.07);
        }

        .intelligenceActionFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 17px 18px;
          border-radius: 21px;
          background: linear-gradient(135deg, #0f172a, #115e59);
          color: #ffffff;
        }

        .intelligenceActionFooter strong {
          display: block;
          font-size: 0.98rem;
        }

        .intelligenceActionFooter span {
          display: block;
          max-width: 650px;
          margin-top: 4px;
          color: rgba(226, 232, 240, 0.82);
          font-size: 0.84rem;
          line-height: 1.5;
        }

        .intelligenceActionLink {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          min-height: 44px;
          padding: 0 17px;
          border-radius: 999px;
          background: #ffffff;
          color: #0f766e !important;
          font-size: 0.86rem;
          font-weight: 950;
        }
.advancedIntelligenceIntro {
  padding: 4px 2px 2px;
}

.advancedIntelligenceGrid {
  display: grid;
  gap: 12px;
}

.advancedIntelligenceCard {
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  background: #ffffff;
}

.advancedIntelligenceCard > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 17px 18px;
  cursor: pointer;
  list-style: none;
}

.advancedIntelligenceCard > summary::-webkit-details-marker {
  display: none;
}

.advancedIntelligenceCard > summary:hover {
  background: #f8fafc;
}

.advancedIntelligenceCard > summary > span:first-child {
  display: grid;
  gap: 4px;
}

.advancedIntelligenceCard > summary strong {
  color: #0f172a;
  font-size: 0.95rem;
}

.advancedIntelligenceCard > summary small {
  color: #64748b;
  font-size: 0.76rem;
  line-height: 1.45;
}

.advancedIntelligenceCard > summary > span:last-child {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  transition: transform 180ms ease;
}

.advancedIntelligenceCard[open]
  > summary
  > span:last-child {
  transform: rotate(180deg);
  background: #ecfdf5;
  color: #047857;
}

.advancedIntelligenceCardBody {
  display: grid;
  gap: 14px;
  padding: 16px 18px 18px;
  border-top: 1px solid rgba(15, 23, 42, 0.07);
  background: #f8fafc;
}
          @media (max-width: 720px) {
          .intelligenceResultLayer {
            padding: 17px;
            border-radius: 23px;
          }

          .intelligenceLayerHeader {
            gap: 12px;
          }

          .intelligenceDisclosureSummary {
            align-items: flex-start;
            padding: 18px;
          }

          .intelligenceDisclosureDescription {
            display: none;
          }

          .intelligenceDisclosureContent {
            padding: 17px;
          }

          .intelligenceActionFooter {
            align-items: stretch;
            flex-direction: column;
          }

          .intelligenceActionLink {
            width: 100%;
          }
        }
.advancedIntelligenceDeveloping {
  display: grid;
  gap: 15px;
  padding: 18px;
  border: 1px dashed rgba(15, 118, 110, 0.26);
  border-radius: 16px;
  background:
    linear-gradient(
      135deg,
      rgba(240, 253, 250, 0.9),
      rgba(248, 250, 252, 0.96)
    );
}

.advancedIntelligenceDevelopingEyebrow {
  margin: 0;
  color: #0f766e;
  font-size: 0.67rem;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.advancedIntelligenceDevelopingTitle {
  margin: 6px 0 0;
  color: #0f172a;
  font-size: 0.98rem;
  font-weight: 950;
  line-height: 1.4;
}

.advancedIntelligenceDevelopingText {
  max-width: 760px;
  margin: 7px 0 0;
  color: #64748b;
  font-size: 0.8rem;
  line-height: 1.65;
}

.advancedIntelligenceDevelopingItems {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.advancedIntelligenceDevelopingItems span {
  display: inline-flex;
  align-items: center;
  min-height: 29px;
  padding: 0 10px;
  border: 1px solid rgba(15, 118, 110, 0.13);
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  font-size: 0.69rem;
  font-weight: 850;
}
        @media (max-width: 980px) {
          .selectedReportGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        <section className="ohHero intelligenceCompactHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text(
                  "Your Health Intelligence",
                  "ذكاؤك الصحي"
                )}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Understand what matters—and what to do next.",
                  "افهم ما يهم وما يجب فعله بعد ذلك."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "OrganHeal connects the selected report with your wider health context to highlight important findings, supporting evidence, practical next steps, and doctor-ready summaries.",
                  "يربط OrganHeal التقرير المحدد بسياقك الصحي الأوسع ليعرض النتائج المهمة، والأدلة الداعمة، والخطوات العملية التالية، والملخصات المناسبة لمناقشتها مع الطبيب."
                )}
              </p>
            </div>
          </div>
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
  {focusedReportInsight.file_name || text("Medical report", "تقرير طبي")}
</h2>

{focusedReportIsGenerated && (
  <p
    className="ohMetricLabel"
    style={{
      marginTop: "8px",
      color: "#047857",
    }}
  >
    {text(
      "Latest saved analysis available",
      "آخر تحليل محفوظ متاح"
    )}
  </p>
)}

<p className="ohCardText">
                  {focusedReportIsGenerated
                    ? text(
                        "This report already has saved analysis. Review the result below or continue to your health plan.",
                        "هذا التقرير لديه تحليل مولد. راجع النتيجة بالأسفل أو تابع إلى خطة الصحة."
                      )
                    : text(
    "This report is ready for analysis. OrganHeal will identify the important findings, explain what they may mean, and organize your practical next steps.",
    "هذا التقرير جاهز للتحليل. سيحدد OrganHeal النتائج المهمة، ويوضح ما قد تعنيه، وينظم خطواتك العملية التالية."
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

          <div className="selectedReportActions">
  <div className="selectedReportActionGroup">
    <p className="selectedReportActionLabel">
      {text("Report Actions", "إجراءات التقرير")}
    </p>

    <div className="selectedReportActionGrid">
      <button
        type="button"
        className="selectedReportActionButton primary"
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
        className="selectedReportActionButton"
        onClick={() =>
          openMedicalReport(
            focusedReportInsight.file_path
          )
        }
        disabled={!focusedReportInsight.file_path}
      >
        {text(
          "Open Original Report",
          "فتح التقرير الأصلي"
        )}
      </button>

      {focusedReportIsGenerated && (
        <Link
          href="/health-plan"
          className="selectedReportActionButton"
        >
          {text(
            "Open Health Plan",
            "فتح خطة الصحة"
          )}
        </Link>
      )}
    </div>
  </div>

  {focusedReportIsGenerated && (
    <div className="selectedReportActionGroup">
      <p className="selectedReportActionLabel">
        {text(
          "Report Documents",
          "مستندات التقرير"
        )}
      </p>

      <div className="selectedReportActionGrid">
        <button
          type="button"
          className="selectedReportActionButton document"
          onClick={() => {
            const downloadButton =
              document.getElementById(
                "patient-analysis-pdf-download"
              ) as HTMLButtonElement | null;

            if (!downloadButton) {
              window.alert(
                isArabicUi
                  ? "تقرير المريض غير جاهز للتنزيل بعد."
                  : "The Patient Report PDF is not ready yet."
              );
              return;
            }

            downloadButton.click();
          }}
        >
          {text(
            "Patient Report PDF",
            "تقرير المريض PDF"
          )}
        </button>

        <button
          type="button"
          className="selectedReportActionButton document"
          onClick={() => {
            const downloadButton =
              document.getElementById(
                "doctor-brief-pdf-download"
              ) as HTMLButtonElement | null;

            if (!downloadButton) {
              window.alert(
                isArabicUi
                  ? "ملخص الطبيب غير جاهز للتنزيل بعد."
                  : "The Doctor Brief PDF is not ready yet."
              );
              return;
            }

            downloadButton.click();
          }}
        >
          {text(
            "Doctor Brief PDF",
            "ملخص الطبيب PDF"
          )}
        </button>

        <Link
          href="/reports"
          className="selectedReportActionButton"
        >
          {text(
            "Back to Reports",
            "العودة إلى التقارير"
          )}
        </Link>
      </div>
    </div>
  )}

  </div>
              </div>
            </div>
            {focusedReportHasVisibleResult && generatedResult && (
              <div className="focusedResultStack">
                <section
                  className="intelligenceResultLayer"
                  aria-labelledby="intelligence-overview-title"
                >
                  <div className="intelligenceLayerHeader">
                    <div>
                      <p className="intelligenceLayerEyebrow">
                        {text(
                          "Health intelligence overview",
                          "نظرة الذكاء الصحي"
                        )}
                      </p>

                      <h2
                        className="intelligenceLayerTitle"
                        id="intelligence-overview-title"
                      >
                        {text(
                          "Understand what matters first",
                          "افهم ما يهم أولًا"
                        )}
                      </h2>

                      <p className="intelligenceLayerDescription">
                        {text(
                          "A prioritized explanation of the report, its most important health signals, and how they connect to your wider health context.",
                          "شرح مرتب حسب الأولوية للتقرير، وأهم إشاراته الصحية، وكيف ترتبط بسياقك الصحي الكامل."
                        )}
                      </p>
                    </div>

                    <span
                      className="intelligenceLayerNumber"
                      aria-hidden="true"
                    >
                      01
                    </span>
                  </div>

                  <div className="intelligenceLayerContent">
  <div
    className={`intelligenceEvidenceStatus ${
      hasReportEvidence ? "available" : "developing"
    }`}
  >
    <span
      className="intelligenceEvidenceStatusMark"
      aria-hidden="true"
    >
      {hasReportEvidence ? "✓" : "…"}
    </span>

    <div>
      <strong>
        {hasReportEvidence
          ? text(
              "Report evidence available",
              "أدلة التقرير متوفرة"
            )
          : text(
              "Evidence is still developing",
              "الأدلة ما زالت قيد الاكتمال"
            )}
      </strong>

      <p>
        {hasReportEvidence
          ? text(
              "This intelligence includes findings extracted from the selected report. Interpretations should still be reviewed in their clinical context.",
              "يتضمن هذا التحليل نتائج مستخرجة من التقرير المحدد، مع ضرورة مراجعة التفسيرات ضمن سياقها السريري."
            )
          : text(
              "The available report content is limited. Adding clearer reports or more health history may strengthen future intelligence.",
              "محتوى التقرير المتاح محدود. قد تساعد إضافة تقارير أوضح أو تاريخ صحي إضافي على تقوية التحليل لاحقًا."
            )}
      </p>
    </div>
  </div>

<div
  className="intelligenceHealthStatus"
  aria-label={text(
    "Current report status",
    "حالة التقرير الحالية"
  )}
>
  <div className="intelligenceHealthStatusMain">
    <p className="intelligenceHealthStatusLabel">
      {text(
        "Report risk level",
        "مستوى خطورة التقرير"
      )}
    </p>

    <p className="intelligenceHealthStatusValue">
      {focusedReportInsight.risk_level ||
        text(
          "Not currently specified",
          "غير محدد حاليًا"
        )}
    </p>
  </div>

  <div className="intelligenceHealthStatusMetric">
    <p className="intelligenceHealthStatusLabel">
      {text(
        "Current score",
        "الدرجة الحالية"
      )}
    </p>

    <p className="intelligenceHealthStatusValue">
      {typeof generatedResult.executiveSummary?.currentScore === "number"
        ? `${generatedResult.executiveSummary.currentScore}/100`
        : text(
            "Not available",
            "غير متاحة"
          )}
    </p>
  </div>

  <div className="intelligenceHealthStatusMetric">
    <p className="intelligenceHealthStatusLabel">
      {text(
        "Priority system",
        "الجهاز ذو الأولوية"
      )}
    </p>

    <p className="intelligenceHealthStatusValue">
      {generatedResult.executiveSummary?.prioritySystem ||
        text(
          "General health",
          "الصحة العامة"
        )}
    </p>
  </div>
</div>

  {generatedResult.executiveSummary && (
                     <ExecutiveSummaryCard
  summary={generatedResult.executiveSummary}
  isArabic={isArabicUi}
/>
                    )}

                    {generatedResult.healthStory && (
                      <HealthStoryCard
  story={generatedResult.healthStory}
  isArabic={isArabicUi}
/>
                    )}

                    {unifiedHealthPresentation && (
                      <UnifiedHealthCard
  unifiedHealth={generatedResult.unifiedHealth}
  isArabic={isArabicUi}
/>
                    )}
                  </div>
                </section>

                <section
                  className="intelligenceResultLayer intelligenceActionLayer"
                  aria-labelledby="intelligence-action-title"
                >
                  <div className="intelligenceLayerHeader">
                    <div>
                      <p className="intelligenceLayerEyebrow">
                        {text("Action center", "مركز الإجراءات")}
                      </p>

                      <h2
                        className="intelligenceLayerTitle"
                        id="intelligence-action-title"
                      >
                        {text(
                          "Move from understanding to action",
                          "انتقل من الفهم إلى الإجراء"
                        )}
                      </h2>

                      <p className="intelligenceLayerDescription">
                        {text(
                          "Prioritized guidance that translates the report into practical follow-up and a clearer next step.",
                          "إرشادات مرتبة حسب الأولوية تحوّل التقرير إلى متابعة عملية وخطوة تالية أوضح."
                        )}
                      </p>
                    </div>

                    <span
                      className="intelligenceLayerNumber"
                      aria-hidden="true"
                    >
                      02
                    </span>
                  </div>

                  <div className="intelligenceLayerContent">
                    {generatedResult.strategy && (
                      <PersonalHealthStrategyCard
                        strategy={generatedResult.strategy}
                      />
                    )}

                    {generatedResult.actionPlan && (
                      <ActionPlanCard
  actionPlan={generatedResult.actionPlan}
  isArabic={isArabicUi}
/>
                    )}

                    <div className="intelligenceActionFooter">
                      <div>
                        <strong>
                          {text(
                            "Continue with your personalized health plan",
                            "تابع إلى خطتك الصحية الشخصية"
                          )}
                        </strong>

                        <span>
                          {text(
                            "Use this intelligence to guide priorities, follow-up, and ongoing health actions.",
                            "استخدم هذا التحليل لتوجيه الأولويات والمتابعة والإجراءات الصحية القادمة."
                          )}
                        </span>
                      </div>

                      <Link
                        href="/health-plan"
                        className="intelligenceActionLink"
                      >
                        {text(
                          "Open Health Plan",
                          "افتح خطة الصحة"
                        )}
                      </Link>
                    </div>
                  </div>
                </section>

                <details className="intelligenceDisclosure">
                  <summary className="intelligenceDisclosureSummary">
                    <span className="intelligenceDisclosureLead">
                      <span
                        className="intelligenceDisclosureIcon"
                        aria-hidden="true"
                      >
                        03
                      </span>

                      <span>
                        <span className="intelligenceDisclosureTitle">
                          {text(
                            "Report Evidence & Clinical Detail",
                            "أدلة التقرير والتفاصيل السريرية"
                          )}
                        </span>

                        <span className="intelligenceDisclosureDescription">
                          {text(
                            "Patient explanation, doctor-ready brief, extracted findings, risks, and recommendations.",
                            "شرح المريض، ملخص الطبيب، النتائج المستخرجة، المخاطر، والتوصيات."
                          )}
                        </span>
                      </span>
                    </span>

                    <span
                      className="intelligenceDisclosureChevron"
                      aria-hidden="true"
                    >
                      ↓
                    </span>
                  </summary>

                  <div className="intelligenceDisclosureContent">
                    <div className="analysisDocumentsHeader">
                      <p className="ohMetricLabel">
                        {text(
                          "Analysis documents",
                          "مستندات التحليل"
                        )}
                      </p>

                      <h3 className="ohCardTitle">
                        {text(
                          "Reports generated by OrganHeal AI",
                          "تقارير أنشأها OrganHeal AI"
                        )}
                      </h3>

                      <p className="ohCardText">
                        {text(
                          "Download a patient-friendly explanation or prepare a concise clinical brief for your doctor.",
                          "نزّل شرحًا مبسطًا للمريض أو جهّز ملخصًا سريريًا موجزًا للطبيب."
                        )}
                      </p>
                    </div>

                                       <div
                      id="patient-analysis-pdf"
                      className="analysisDocumentAnchor"
                    >
                      <PatientReportPdfCard
                        fileName={
                          focusedReportInsight.file_name ||
                          "Medical report"
                        }
                        uploadedAtText={formatDate(
                          focusedReportInsight.uploaded_at ||
                            focusedReportInsight.created_at
                        )}
                        summary={focusedReportInsight.summary}
                        keyFindings={
                          focusedReportInsight.key_findings
                        }
                        riskSignals={
                          focusedReportInsight.risk_signals
                        }
                        recommendations={
                          focusedReportInsight.recommendations
                        }
                        healthStory={generatedResult.healthStory}
                           executiveSummary={
                          generatedResult.executiveSummary
                        }
                        patientPresentation={
                          unifiedPatientPresentationV2
                        }
                      />
                    </div>

                    <div
                      id="doctor-brief-pdf"
                      className="analysisDocumentAnchor"
                    >
                      <DoctorBriefReportCard
                        fileName={
                          focusedReportInsight.file_name ||
                          "Medical report"
                        }
                        reportTypeLabel={getReportTypeLabel(
                          focusedReportInsight.report_type
                        )}
                        uploadedAtText={formatDate(
                          focusedReportInsight.uploaded_at ||
                            focusedReportInsight.created_at
                        )}
                        summary={focusedReportInsight.summary}
                        keyFindings={
                          focusedReportInsight.key_findings
                        }
                        riskSignals={
                          focusedReportInsight.risk_signals
                        }
                        recommendations={
                          focusedReportInsight.recommendations
                        }
                        doctorBrief={
                          unifiedDoctorBriefV2 ??
                          focusedReportInsight.doctor_brief
                        }
                        doctorPresentation={unifiedDoctorPresentationV2}
                        executiveSummary={
                          generatedResult.executiveSummary
                        }
                      />
                    </div>

                    <GeneratedReportDetailsCard
                      medicalCategory={
                        focusedReportInsight.medical_category
                      }
                      summary={focusedReportInsight.summary}
                      keyFindings={focusedReportInsight.key_findings}
                      riskSignals={focusedReportInsight.risk_signals}
                      recommendations={focusedReportInsight.recommendations}
                      doctorBrief={
                        unifiedDoctorBriefV2 ??
                        focusedReportInsight.doctor_brief
                      }
                    />
                  </div>
                </details>

                <details className="intelligenceDisclosure">
                  <summary className="intelligenceDisclosureSummary">
                    <span className="intelligenceDisclosureLead">
                      <span
                        className="intelligenceDisclosureIcon"
                        aria-hidden="true"
                      >
                        04
                      </span>

                      <span>
                        <span className="intelligenceDisclosureTitle">
                          {text(
                            "Advanced Health Intelligence",
                            "الذكاء الصحي المتقدم"
                          )}
                        </span>

                        <span className="intelligenceDisclosureDescription">
                          {text(
                            "Timeline, laboratory trends, longitudinal risk, cross-source intelligence, digital twin, and forecast.",
                            "الخط الزمني، اتجاهات المختبر، المخاطر طويلة المدى، الذكاء متعدد المصادر، التوأم الرقمي، والتوقعات."
                          )}
                        </span>
                      </span>
                    </span>

                    <span
                      className="intelligenceDisclosureChevron"
                      aria-hidden="true"
                    >
                      ↓
                    </span>
                  </summary>

                  <div className="intelligenceDisclosureContent">
  <div className="advancedIntelligenceIntro">
    <p className="intelligenceLayerEyebrow">
      {text(
        "Advanced intelligence status",
        "حالة الذكاء الصحي المتقدم"
      )}
    </p>

    <h3 className="intelligenceLayerTitle">
      {text(
        "Deeper intelligence grows with your health history",
        "يصبح الذكاء المتقدم أقوى مع نمو تاريخك الصحي"
      )}
    </h3>

    <p className="intelligenceLayerDescription">
      {text(
        "Some advanced models already have useful signals, while others become more meaningful as OrganHeal collects enough longitudinal and connected health data.",
        "بعض نماذج الذكاء المتقدم لديها إشارات مفيدة الآن، بينما تصبح النماذج الأخرى أكثر معنى مع توفر بيانات صحية تاريخية ومترابطة بشكل كافٍ."
      )}
    </p>
  </div>

  <div className="advancedIntelligenceGrid">
    <details className="advancedIntelligenceCard">
      <summary>
        <span>
          <strong>{text("Health Timeline", "الخط الزمني الصحي")}</strong>
          <small>
            {text(
              "Current direction and recent movement",
              "الاتجاه الحالي والحركة الأخيرة"
            )}
          </small>
        </span>
        <span aria-hidden="true">↓</span>
      </summary>

      <div className="advancedIntelligenceCardBody">
        <TimelineCard
  timeline={generatedResult.timeline}
  isArabic={isArabicUi}
/>
      </div>
    </details>

    <details className="advancedIntelligenceCard">
      <summary>
        <span>
          <strong>{text("Laboratory History", "تاريخ التحاليل")}</strong>
          <small>
            {text(
              "Markers tracked across available reports",
              "المؤشرات التي تتم متابعتها عبر التقارير المتاحة"
            )}
          </small>
        </span>
        <span aria-hidden="true">↓</span>
      </summary>

      <div className="advancedIntelligenceCardBody">
        <LabTrendsCard
  labTrends={generatedResult.labTrends}
  isArabic={isArabicUi}
/>
      </div>
    </details>

    <details className="advancedIntelligenceCard">
      <summary>
        <span>
          <strong>
            {text(
              "Connected & Longitudinal Intelligence",
              "الذكاء المترابط وطويل المدى"
            )}
          </strong>
          <small>
            {text(
              "Risk, cross-source intelligence, digital twin, and forecast",
              "المخاطر والذكاء متعدد المصادر والتوأم الرقمي والتوقعات"
            )}
          </small>
        </span>
        <span aria-hidden="true">↓</span>
      </summary>

     <div className="advancedIntelligenceCardBody">
  {hasLongitudinalRiskResult && (
    <LongitudinalRiskCard
  longitudinalRisk={generatedResult.longitudinalRisk}
  isArabic={isArabicUi}
/>
  )}

  {hasCrossSourceResult && (
    <CrossSourceCard
  crossSource={generatedResult.crossSource}
  isArabic={isArabicUi}
/>
  )}

  {hasDigitalHealthModelResult && (
    <DigitalTwinCard
  digitalTwin={generatedResult.digitalTwin}
  isArabic={isArabicUi}
/>
  )}

  {hasForecastResult && (
    <ForecastCard
  forecast={generatedResult.forecast}
  isArabic={isArabicUi}
/>
  )}

  {hasDevelopingAdvancedModels && (
    <div className="advancedIntelligenceDeveloping">
      <div>
        <p className="advancedIntelligenceDevelopingEyebrow">
          {text(
            "Developing with your health history",
            "يتطور مع نمو تاريخك الصحي"
          )}
        </p>

        <h4 className="advancedIntelligenceDevelopingTitle">
          {text(
            "More intelligence unlocks as your data grows",
            "يتم تفعيل المزيد من الذكاء مع نمو بياناتك"
          )}
        </h4>

        <p className="advancedIntelligenceDevelopingText">
          {text(
            "OrganHeal will strengthen longitudinal risk, connected intelligence, personal health modeling, and forward-looking projections as more reliable historical data becomes available.",
            "سيعمل OrganHeal على تقوية تحليل المخاطر طويلة المدى، والذكاء المترابط، والنموذج الصحي الشخصي، والتوقعات المستقبلية مع توفر المزيد من البيانات التاريخية الموثوقة."
          )}
        </p>
      </div>

      <div className="advancedIntelligenceDevelopingItems">
        {!hasLongitudinalRiskResult && (
          <span>
            {text(
              "Longitudinal Risk",
              "المخاطر طويلة المدى"
            )}
          </span>
        )}

        {!hasCrossSourceResult && (
          <span>
            {text(
              crossSourceConfidence
                ? `Connected Intelligence · ${crossSourceConfidence} confidence`
                : "Connected Intelligence",
              crossSourceConfidence
                ? `الذكاء المترابط · ثقة ${crossSourceConfidence}`
                : "الذكاء المترابط"
            )}
          </span>
        )}

        {!hasDigitalHealthModelResult && (
          <span>
            {text(
              "Personal Health Model",
              "النموذج الصحي الشخصي"
            )}
          </span>
        )}

        {!hasForecastResult && (
          <span>
            {text(
              "Forward-Looking Intelligence",
              "الذكاء المستقبلي"
            )}
          </span>
        )}
      </div>
    </div>
  )}
</div>
    </details>
  </div>
</div>
                </details>
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
      </div>
    </main>
  );
}








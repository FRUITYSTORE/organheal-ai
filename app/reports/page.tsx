"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import PageEmptyState from "@/app/components/navigation/PageEmptyState";
import StatCard from "@/app/components/ui/StatCard";
import FeaturedReportCard from "@/app/components/reports/FeaturedReportCard";
import CompactReportRow from "@/app/components/reports/CompactReportRow";
import StatusBadge from "@/app/components/ui/StatusBadge";
import { getReportsLibrary } from "@/lib/services/reports/reports.service";
type Language = "en" | "ar";

type UploadedReport = {
  id: number;
  file_name?: string | null;
  file_path?: string | null;
  created_at?: string | null;
  extraction_status?: string | null;
  report_type?: string | null;
};

type HealthInsight = {
  id: number;
  report_id?: number | null;
  report_type?: string | null;
  ai_status?: string | null;
  risk_level?: string | null;
  summary?: string | null;
  next_best_action?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type SavedResult = {
  insight_id?: number | null;
  report_id?: number | null;
  updated_at?: string | null;
};

type ReportCard = {
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

function normalizeStatus(value?: string | null) {
  return value && value.trim() ? value.trim() : "Pending";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function getReportTypeLabel(type?: string | null) {
  const clean = (type || "Laboratory").toLowerCase();

  if (clean.includes("radio")) return "Radiology Report";
  if (clean.includes("clinical")) return "Clinical Summary";
  if (clean.includes("prescription")) return "Prescription";
  if (clean.includes("lab")) return "Laboratory Report";

  return type || "Medical Report";
}

function getStatusTone(status: string) {
  const clean = status.toLowerCase();

  if (
    clean.includes("generated") ||
    clean.includes("completed") ||
    clean.includes("saved") ||
    clean.includes("ready")
  ) {
    return "good";
  }

  if (clean.includes("failed")) {
    return "risk";
  }

  if (
    clean.includes("processing") ||
    clean.includes("pending") ||
    clean.includes("next")
  ) {
    return "moderate";
  }

  return "neutral";
}

export default function ReportsPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [showAllReports, setShowAllReports] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<
    "all" | "needs-analysis" | "saved" | "failed"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSelectingForIntelligence, setIsSelectingForIntelligence] =
    useState(false);

  const isArabic = language === "ar";

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  useEffect(() => {
    const selectMode =
      new URLSearchParams(window.location.search).get("select");

    setIsSelectingForIntelligence(selectMode === "intelligence");

    function syncLanguage() {
      const savedLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    loadReports();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  async function loadReports() {
    setLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = "/login?next=/reports";
      return;
    }

   const userId = userData.user.id;

try {
  const reportsLibrary = await getReportsLibrary(userId);
  setReports(reportsLibrary as ReportCard[]);
} catch (error) {
  setMessage(
    error instanceof Error ? error.message : "Failed to load reports."
  );
  setLoading(false);
  return;
}
    setLoading(false);
  }

  async function openMedicalReport(filePath: string | null) {
    if (!filePath) {
      alert(text("File path is missing.", "مسار الملف غير موجود."));
      return;
    }

    const { data, error } = await supabase.storage
      .from("lab-reports")
      .createSignedUrl(filePath, 60 * 60);

    if (error || !data?.signedUrl) {
      alert(
        text(
          "Could not open this file. Please re-upload the report.",
          "تعذر فتح الملف. يرجى رفع التقرير مرة أخرى."
        )
      );
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const filteredReports = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch =
        !cleanSearch ||
        report.fileName.toLowerCase().includes(cleanSearch) ||
        report.reportType.toLowerCase().includes(cleanSearch);

      if (!matchesSearch) return false;

      if (filter === "saved") return report.hasSavedAnalysis;
      if (filter === "needs-analysis") return !report.hasSavedAnalysis;
      if (filter === "failed") {
        return (
          report.extractionStatus.toLowerCase().includes("failed") ||
          report.aiStatus.toLowerCase().includes("failed")
        );
      }

      return true;
    });
  }, [reports, searchTerm, filter]);

  const savedCount = reports.filter((item) => item.hasSavedAnalysis).length;
  const needAnalysisCount = reports.filter((item) => !item.hasSavedAnalysis).length;
  const extractionCompletedCount = reports.filter((item) =>
    item.extractionStatus.toLowerCase().includes("completed")
  ).length;

  const featuredReport =
    filteredReports.find((item) => !item.hasSavedAnalysis) ||
    filteredReports[0] ||
    null;

  const compactReports = featuredReport
    ? filteredReports.filter((item) => item.reportId !== featuredReport.reportId)
    : filteredReports;

  function getAnalysisHref(report: ReportCard) {
    return report.hasSavedAnalysis
      ? `/intelligence?reportId=${report.reportId}`
      : `/intelligence?reportId=${report.reportId}&auto=1`;
  }
const visibleCompactReports = showAllReports
  ? compactReports
  : compactReports.slice(0, 3);
  return (
    <main className="ohPageShell reportsFocusPage" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .reportsFocusPage,
        .reportsFocusPage * {
          box-sizing: border-box;
        }

        .reportsFocusPage a {
          color: inherit;
          text-decoration: none;
        }

        .reportSelectionNotice {
          padding: 20px 22px;
          border: 1px solid rgba(15, 118, 110, 0.22);
          border-radius: 18px;
          background:
            linear-gradient(
              135deg,
              rgba(240, 253, 250, 0.98),
              rgba(248, 250, 252, 0.98)
            );
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
        }

        .reportSelectionNoticeContent {
          display: grid;
          gap: 6px;
        }

        .reportSelectionNoticeLabel {
          margin: 0;
          color: #0f766e;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .reportSelectionNoticeTitle {
          margin: 0;
          color: #0f172a;
          font-size: clamp(1.08rem, 2vw, 1.32rem);
          line-height: 1.35;
        }

        .reportSelectionNoticeText {
          margin: 0;
          max-width: 720px;
          color: #475569;
          line-height: 1.65;
        }

        @media (max-width: 720px) {
          .reportSelectionNotice {
            padding: 18px;
          }
        }

        .reportsHero {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(15, 118, 110, 0.16);
          background:
            radial-gradient(circle at 90% 12%, rgba(20, 184, 166, 0.22), transparent 30%),
            linear-gradient(135deg, #ffffff 0%, #eef9f8 54%, #f8fbff 100%);
        }

        .reportsHero .ohHeroGrid {
          grid-template-columns: minmax(0, 1fr) minmax(300px, 0.46fr);
          align-items: center;
        }

        .reportsHero .ohTitle {
          max-width: 820px;
          font-size: clamp(2.05rem, 4vw, 3.6rem);
          line-height: 1;
        }

        .reportsCommandCard {
          border-radius: 28px;
          padding: 24px;
          color: white;
          background:
            radial-gradient(circle at 88% 8%, rgba(45, 212, 191, 0.45), transparent 32%),
            linear-gradient(135deg, #0f172a, #0f766e);
          box-shadow: 0 26px 72px rgba(15, 23, 42, 0.2);
        }

        .reportsCommandCard .ohMetricLabel,
        .reportsCommandCard .ohCardText {
          color: rgba(226, 232, 240, 0.88);
        }

        .reportsCommandCard .ohCardTitle {
          color: white;
        }

        .reportsMetric {
          border-top: 5px solid rgba(20, 184, 166, 0.78);
        }

        .reportsMetric.amber {
          border-top-color: #f59e0b;
        }

        .reportsMetric.green {
          border-top-color: #10b981;
        }

        .reportsMetric.blue {
          border-top-color: #2563eb;
        }

        .reportsToolbar {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 220px auto;
          gap: 12px;
          align-items: end;
          padding: 18px;
          border-radius: 24px;
          border: 1px solid rgba(15, 118, 110, 0.14);
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(15, 118, 110, 0.92));
          color: white;
        }

        .reportsControl {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .reportsControl label {
          font-size: 0.72rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(209, 250, 229, 0.86);
        }

        .reportsInput,
        .reportsSelect {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.96);
          color: #0f172a;
          padding: 12px 13px;
          font-weight: 800;
          outline: none;
        }

        .reportsClearButton {
          min-height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.12);
          color: white;
          font-weight: 900;
          cursor: pointer;
          padding: 0 18px;
        }

        .featuredReportCard {
          overflow: hidden;
          border: 1px solid rgba(15, 118, 110, 0.16);
          border-top: 6px solid #0f766e;
          background:
            radial-gradient(circle at 88% 10%, rgba(20, 184, 166, 0.12), transparent 28%),
            #ffffff;
          box-shadow: 0 22px 58px rgba(15, 23, 42, 0.08);
        }

        .featuredReportGrid {
          display: block;
        }

        .featuredStatusPanel {
          border-radius: 24px;
          padding: 20px;
          background: linear-gradient(135deg, #0f172a, #115e59);
          color: white;
          min-height: 100%;
        }

        .featuredStatusPanel .ohMetricLabel,
        .featuredStatusPanel .ohCardText {
          color: rgba(226, 232, 240, 0.86);
        }

        .featuredStatusPanel .ohCardTitle {
          color: white;
        }

        .reportStatusLine {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-top: 14px;
        }

        .reportStatusPill {
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

        .reportStatusPill.good {
          background: rgba(16, 185, 129, 0.11);
          color: #047857;
          border-color: rgba(16, 185, 129, 0.22);
        }

        .reportStatusPill.moderate {
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
          border-color: rgba(245, 158, 11, 0.24);
        }

        .reportStatusPill.risk {
          background: rgba(239, 68, 68, 0.1);
          color: #b91c1c;
          border-color: rgba(239, 68, 68, 0.2);
        }

        .reportPrimaryAction {
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
          box-shadow: 0 14px 34px rgba(20, 184, 166, 0.28);
        }

        .reportSecondaryAction {
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

        .compactReportTable {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .compactReportHeader,
        .compactReportRow {
          display: grid;
          grid-template-columns: minmax(230px, 1.25fr) minmax(150px, 0.7fr) minmax(170px, 0.8fr) minmax(160px, 0.55fr);
          gap: 12px;
          align-items: center;
        }

        .compactReportHeader {
          padding: 0 14px;
          color: var(--oh-muted);
          font-size: 0.74rem;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .compactReportRow {
          padding: 14px;
          border-radius: 20px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: white;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
        }

        .compactReportRow.saved {
          border-inline-start: 5px solid #10b981;
        }

        .compactReportRow.pending {
          border-inline-start: 5px solid #f59e0b;
        }

        .compactReportName {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .compactReportName strong {
          color: var(--oh-text);
          font-size: 0.96rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .compactReportName span {
          color: var(--oh-muted);
          font-size: 0.82rem;
          font-weight: 750;
        }

        .compactActionRow {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .compactAction {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 13px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 0.82rem;
          border: 1px solid rgba(15, 118, 110, 0.18);
          cursor: pointer;
        }

        .compactAction.primary {
          background: #0f766e;
          color: white;
          border-color: #0f766e;
        }

        .compactAction.secondary {
          background: white;
          color: #0f766e;
        }

        @media (max-width: 980px) {
          .reportsHero .ohHeroGrid,
          .reportsToolbar,
          .featuredReportGrid,
          .compactReportHeader,
          .compactReportRow {
            grid-template-columns: 1fr;
          }

          .compactActionRow {
            justify-content: flex-start;
          }

          .compactReportHeader {
            display: none;
          }
        }
                  /* REPORTS_FINAL_VISUAL_STABILIZATION_V1 */
        .reportsFocusPage .ohContainer {
          max-width: 1180px !important;
        }

        .reportsFocusPage .reportsHero {
  width: 100% !important;
  min-height: 360px !important;
  padding: 38px !important;
  display: block !important;
}

        .reportsFocusPage .reportsHero .ohHeroGrid {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.48fr) !important;
          gap: 48px !important;
          align-items: center !important;
        }

       .reportsFocusPage .reportsHero .ohTitle {
  font-size: clamp(2.6rem, 5vw, 4.2rem) !important;
  line-height: 1 !important;
  max-width: 760px !important;
}

        .reportsFocusPage .reportsHero .ohLead {
          font-size: 1.12rem !important;
          line-height: 1.9 !important;
          max-width: 680px !important;
        }

        .reportsFocusPage .reportsCommandCard {
          background: linear-gradient(135deg, #061826, #0f766e) !important;
          color: #ffffff !important;
          min-height: 300px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
        }

        .reportsFocusPage .reportsCommandCard .ohMetricLabel {
          color: rgba(209, 250, 229, 0.9) !important;
        }

        .reportsFocusPage .reportsCommandCard .ohCardTitle {
          color: #ffffff !important;
        }

        .reportsFocusPage .reportsCommandCard .ohCardText {
          color: rgba(255, 255, 255, 0.88) !important;
        }

        .reportsFocusPage .compactReportTable + .ohButtonRow .secondaryBtn {
          background: #ffffff !important;
          color: #0f766e !important;
          border: 1px solid rgba(15, 118, 110, 0.34) !important;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08) !important;
        }

        @media (max-width: 980px) {
          .reportsFocusPage .reportsHero {
            min-height: auto !important;
            padding: 32px !important;
          }

          .reportsFocusPage .reportsHero .ohHeroGrid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }

          .reportsFocusPage .reportsHero .ohTitle {
            font-size: clamp(2.4rem, 10vw, 3.8rem) !important;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        {isSelectingForIntelligence && (
          <section
            className="reportSelectionNotice"
            aria-labelledby="report-selection-title"
          >
            <div className="reportSelectionNoticeContent">
              <p className="reportSelectionNoticeLabel">
                {text("Report selection", "اختيار التقرير")}
              </p>

              <h2
                id="report-selection-title"
                className="reportSelectionNoticeTitle"
              >
                {text(
                  "Select a report to analyze",
                  "اختر تقريرًا لتحليله"
                )}
              </h2>

              <p className="reportSelectionNoticeText">
                {text(
                  "Choose one of your uploaded reports below to open its AI Intelligence analysis.",
                  "اختر أحد تقاريرك المرفوعة أدناه لفتح تحليله في صفحة الذكاء الصحي."
                )}
              </p>
            </div>
          </section>
        )}
        <Link
          href="/dashboard"
          className="ohMetricHint"
          style={{ color: "var(--oh-primary)", fontWeight: 900 }}
        >
          ← {text("Back to Dashboard", "العودة إلى لوحة التحكم")}
        </Link>

        <section className="ohHero reportsHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Reports Library", "مكتبة التقارير")}
              </p>

              <h1 className="ohTitle">
               {text(
  "Your personal health record. Organized. Explained. Ready.",
  "سجلك الصحي الشخصي. منظم، مفهوم، وجاهز."
)}
              </h1>

              <p className="ohLead">
               {text(
  "Keep every medical report in one secure place. Review previous results, open AI analyses, and continue your health journey whenever you need.",
  "احتفظ بجميع تقاريرك الطبية في مكان آمن واحد. راجع نتائجك السابقة، وافتح تحليلات الذكاء الاصطناعي، وتابع رحلتك الصحية في أي وقت."
)}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "22px" }}>
                <Link href="/lab-upload" className="primaryBtn">
                  {text("Upload Report", "رفع تقرير")}
                </Link>
              </div>
            </div>

            <aside className="reportsCommandCard">
              <p className="ohMetricLabel">
                {text("Recommended next step", "الخطوة المقترحة")}
              </p>

              <h2 className="ohCardTitle">
                {featuredReport
                  ? featuredReport.hasSavedAnalysis
                    ? text("Review your latest saved analysis.", "راجع آخر تحليل محفوظ.")
                    : text("Analyze the next pending report.", "حلّل التقرير التالي.")
                  : text("Upload your first report.", "ارفع أول تقرير.")}
              </h2>

              <p className="ohCardText">
                {text(
  "Your latest report is highlighted first, while your previous reports remain organized below for quick access.",
  "يظهر أحدث تقرير لديك أولًا، بينما تبقى التقارير السابقة منظمة بالأسفل للوصول السريع."
)}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "18px" }}>
                <Link
                  href={featuredReport ? getAnalysisHref(featuredReport) : "/lab-upload"}
                  className="reportPrimaryAction"
                >
                  {featuredReport?.hasSavedAnalysis
                    ? text("View Analysis", "عرض التحليل")
                    : featuredReport
                    ? text("Analyze Report", "تحليل التقرير")
                    : text("Upload Report", "رفع تقرير")}
                </Link>
              </div>
            </aside>
          </div>
        </section>

        <section className="ohMetricGrid">
  <StatCard
    label={text("Total reports", "إجمالي التقارير")}
    value={reports.length}
    hint={text("saved in your account", "محفوظة في حسابك")}
  />

  <StatCard
    label={text("Ready insights", "رؤى جاهزة")}
    value={savedCount}
    hint={text("available to review", "جاهزة للمراجعة")}
  />

  <StatCard
    label={text("Awaiting analysis", "بانتظار التحليل")}
    value={needAnalysisCount}
    hint={text("ready for your next step", "جاهزة لخطوتك التالية")}
  />

  <StatCard
    label={text("Reports processed", "تقارير تمت معالجتها")}
    value={extractionCompletedCount}
    hint={text("prepared for intelligence", "مهيأة للتحليل الذكي")}
  />
</section>

        <section className="reportsToolbar">
          <div className="reportsControl">
            <label>{text("Find a report", "ابحث عن تقرير")}</label>
            <input
              className="reportsInput"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={text("Search by file name or report type", "ابحث باسم الملف أو نوع التقرير")}
            />
          </div>

          <div className="reportsControl">
            <label>{text("Status", "الحالة")}</label>
            <select
              className="reportsSelect"
              value={filter}
              onChange={(event) => setFilter(event.target.value as typeof filter)}
            >
              <option value="all">{text("All reports", "كل التقارير")}</option>
              <option value="needs-analysis">{text("Needs analysis", "تحتاج تحليل")}</option>
              <option value="saved">{text("Saved analysis", "تحليل محفوظ")}</option>
              <option value="failed">{text("Needs attention", "تحتاج مراجعة")}</option>
            </select>
          </div>

          <button
            type="button"
            className="reportsClearButton"
            onClick={() => {
              setSearchTerm("");
              setFilter("all");
            }}
          >
            {text("Reset", "إعادة")}
          </button>
        </section>

        {message && (
          <section className="ohTrustNotice">
            <span aria-hidden="true">⚠️</span>
            <div>
              <strong>{text("Reports notice", "تنبيه التقارير")}</strong>
              <br />
              {message}
            </div>
          </section>
        )}

        {loading ? (
  <PageEmptyState
    title={text("Loading your reports...", "جاري تحميل التقارير...")}
    description={text(
      "Please wait while OrganHeal prepares your report library.",
      "يرجى الانتظار بينما يجهز OrganHeal مكتبة التقارير."
    )}
  />
) : filteredReports.length === 0 ? (
  <PageEmptyState
    title={text("No reports found", "لا توجد تقارير")}
    description={text(
      "Upload a report or reset your search filters.",
      "ارفع تقريرًا أو أعد ضبط الفلاتر."
    )}
    actionHref="/lab-upload"
    actionLabel={text("Upload Report", "رفع تقرير")}
  />
) : (
          <>
            {featuredReport && (
  <FeaturedReportCard
    fileName={featuredReport.fileName}
    hasSavedAnalysis={featuredReport.hasSavedAnalysis}
    uploadedAt={featuredReport.uploadedAt}
    extractionStatus={featuredReport.extractionStatus}
    riskLevel={featuredReport.riskLevel}
    summary={featuredReport.summary}
    filePath={featuredReport.filePath}
    analysisHref={getAnalysisHref(featuredReport)}
    statusTone={getStatusTone}
    formatDate={formatDate}
    onOpenFile={() => openMedicalReport(featuredReport.filePath)}
    labels={{
      latestAnalysisFocus: text("Latest analysis focus", "آخر تحليل للمتابعة"),
      currentReportFocus: text("Current report focus", "التقرير الحالي للمتابعة"),
      savedDescription: text(
        "This report already has a saved analysis. Review it or continue to your health plan.",
        "هذا التقرير لديه تحليل محفوظ. راجعه أو تابع إلى خطة الصحة."
      ),
      needsAnalysisDescription: text(
        "This report is the next best action. Analyze it to generate a clear report summary.",
        "هذا التقرير هو الخطوة التالية. حلّله لتوليد ملخص واضح."
      ),
      uploaded: text("Uploaded", "تم الرفع"),
      extraction: text("Extraction", "الاستخراج"),
      analysis: text("Analysis", "التحليل"),
      saved: text("Saved", "محفوظ"),
      needsAnalysis: text("Needs analysis", "يحتاج تحليل"),
      risk: text("Risk", "الخطورة"),
      viewAnalysis: text("View Analysis", "عرض التحليل"),
      analyzeReport: text("Analyze Report", "تحليل التقرير"),
      openFile: text(
  "Open Original Report",
  "فتح التقرير الأصلي"
),
      healthPlan: text("Health Plan", "خطة الصحة"),
      sideLabel: text("What this page is for", "وظيفة هذه الصفحة"),
      sideTitle: text(
        "Reports, analysis results, and health-plan follow-up.",
        "التقارير، نتائج التحليل، والمتابعة في خطة الصحة."
      ),
      sideText: text(
        "Use Intelligence only to analyze or review one selected report. Keep this page as your organized report history.",
        "استخدم صفحة الذكاء فقط لتحليل أو مراجعة تقرير محدد. واجعل هذه الصفحة مكتبة منظمة للتقارير."
      ),
    }}
  />
)}

            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Your report history", "سجل تقاريرك الصحية")}
                  </p>

                  <h2 className="ohCardTitle">
                    {text(
  "Every report remains available whenever you need it.",
  "كل تقاريرك تبقى متاحة لك في أي وقت."
)}
                  </h2>

                  <p className="ohCardText">
                    {text(
  "Review previous reports, reopen the original document, or continue your health journey with AI-powered analysis.",
  "راجع تقاريرك السابقة، وافتح الملف الأصلي، أو تابع رحلتك الصحية من خلال التحليل المدعوم بالذكاء الاصطناعي."
)}
                  </p>
                </div>

               <StatusBadge tone="neutral">
  {compactReports.length}
</StatusBadge>
              </div>

              {compactReports.length === 0 ? (
                <div className="ohEmptyState">
                  <h2>{text("No older reports to show", "لا توجد تقارير سابقة")}</h2>
                  <p>
                    {text(
                      "The current focused report is shown above.",
                      "التقرير الحالي ظاهر بالأعلى."
                    )}
                  </p>
                </div>
                           ) : (
                <>
                  <div className="compactReportTable">
                    <div className="compactReportHeader">
                      <span>{text("Report", "التقرير")}</span>
                      <span>{text("Status", "الحالة")}</span>
                      <span>{text("Uploaded", "تاريخ الرفع")}</span>
                      <span>{text("Action", "الإجراء")}</span>
                    </div>

                    {visibleCompactReports.map((report) => {
                      const isSaved = report.hasSavedAnalysis;

                      return (
                        <CompactReportRow
                          key={report.reportId}
                          reportId={report.reportId}
                          fileName={report.fileName}
                          reportType={report.reportType}
                          uploadedAt={report.uploadedAt}
                          extractionStatus={report.extractionStatus}
                          hasSavedAnalysis={isSaved}
                          filePath={report.filePath}
                          analysisHref={getAnalysisHref(report)}
                          statusTone={getStatusTone}
                          formatDate={formatDate}
                          onOpenFile={() => openMedicalReport(report.filePath)}
                          labels={{
                            savedAnalysis: text("Saved analysis", "تحليل محفوظ"),
                            needsAnalysis: text("Needs analysis", "يحتاج تحليل"),
                            view: text("View", "عرض"),
                            analyze: text("Analyze", "تحليل"),
                            file: text("File", "الملف"),
                          }}
                        />
                      );
                    })}
                  </div>

                  {compactReports.length > 3 && (
                    <div className="ohButtonRow" style={{ justifyContent: "center", marginTop: "18px" }}>
                      <button
                        type="button"
                        className="secondaryBtn"
                        onClick={() => setShowAllReports((current) => !current)}
                      >
                        {showAllReports
                          ? text("View Less", "عرض أقل")
                          : text("View More", "عرض المزيد")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}



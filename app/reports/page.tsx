"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageBackActions from "../components/PageBackActions";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";
type ReportFilter = "all" | "saved" | "needs-generation" | "completed-extraction";

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
  const isArabic = language === "ar";

  const [reports, setReports] = useState<ReportLibraryItem[]>([]);
  const [visibleReportsCount, setVisibleReportsCount] = useState(REPORTS_INITIAL_LIMIT);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [reportFilter, setReportFilter] = useState<ReportFilter>("all");

  useEffect(() => {
    function syncLanguage() {
      const savedLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    fetchReports();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

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
        text(
          "No saved file path was found for this report.",
          "لا يوجد مسار ملف محفوظ لهذا التقرير."
        )
      );
      return;
    }

    const { data, error } = await supabase.storage
      .from("lab-reports")
      .createSignedUrl(filePath, 60 * 60);

    if (error) {
      alert(
        text(
          "Unable to open the report right now.",
          "تعذر فتح التقرير الآن."
        )
      );
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  function formatDate(value: string | null) {
    if (!value) return text("Not available", "غير متاح");

    return new Date(value).toLocaleString(isArabic ? "ar-AE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getReportTypeLabel(type: string | null) {
    if (!type) return text("Medical report", "تقرير طبي");

    if (type === "lab") return text("Laboratory", "مختبر");
    if (type === "radiology") return text("Radiology", "أشعة");
    if (type === "clinical") return text("Clinical", "تقرير سريري");
    if (type === "prescription") return text("Prescription", "وصفة طبية");
    if (type === "medical") return text("General Medical", "تقرير طبي عام");

    return type;
  }

  function getExtractionLabel(status: string | null) {
    const cleanStatus = status || "Pending";

    if (cleanStatus === "Completed") {
      return text("Extraction completed", "الاستخراج مكتمل");
    }

    if (cleanStatus === "Processing") {
      return text("Extraction processing", "جاري الاستخراج");
    }

    if (cleanStatus === "Failed") {
      return text("Extraction failed", "فشل الاستخراج");
    }

    return text("Extraction pending", "بانتظار الاستخراج");
  }

  function getExtractionTone(status: string | null) {
    const cleanStatus = status || "Pending";

    if (cleanStatus === "Completed") return "good";
    if (cleanStatus === "Processing") return "moderate";
    if (cleanStatus === "Failed") return "risk";
    return "neutral";
  }

  function getRiskTone(riskLevel: string | null) {
    const cleanLevel = (riskLevel || "").toLowerCase();

    if (cleanLevel.includes("high") || cleanLevel.includes("risk")) return "risk";
    if (cleanLevel.includes("moderate") || cleanLevel.includes("medium")) return "moderate";
    if (cleanLevel.includes("low") || cleanLevel.includes("normal")) return "good";

    return "neutral";
  }

  function getReportDecision(report: ReportLibraryItem) {
    if (report.hasSavedIntelligence) {
      return {
        label: text("Saved intelligence", "ذكاء محفوظ"),
        title: text(
          "Health intelligence is saved",
          "نتيجة الذكاء الصحي محفوظة"
        ),
        description: text(
          "Open Intelligence Center to review summaries, or continue to your follow-up plan.",
          "يمكنك فتح مركز الذكاء لمراجعة الملخصات، أو الانتقال إلى خطة المتابعة."
        ),
        href: "/intelligence",
        buttonText: text("Open Result", "فتح النتيجة"),
        tone: "good",
      };
    }

    if (report.insightId) {
      return {
        label: text("Ready to generate", "جاهز للتوليد"),
        title: text(
          "This report needs intelligence generation",
          "هذا التقرير يحتاج توليد الذكاء"
        ),
        description: text(
          "Open Intelligence Center and press Generate to turn this report into summaries and follow-up steps.",
          "افتح مركز الذكاء واضغط Generate لتحويل التقرير إلى ملخصات وخطوات متابعة."
        ),
        href: "/intelligence",
        buttonText: text("Generate in Intelligence", "ولّد في مركز الذكاء"),
        tone: "moderate",
      };
    }

    return {
      label: text("Saved", "تم الحفظ"),
      title: text(
        "The report is saved and needs follow-up",
        "التقرير محفوظ ويحتاج متابعة"
      ),
      description: text(
        "Open Intelligence Center or upload another report if it does not appear yet.",
        "افتح مركز الذكاء أو ارفع تقريرًا آخر إذا لم يظهر بعد."
      ),
      href: "/intelligence",
      buttonText: text("Open Intelligence", "فتح مركز الذكاء"),
      tone: "neutral",
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

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.fileName
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());

    const matchesFilter =
      reportFilter === "all" ||
      (reportFilter === "saved" && report.hasSavedIntelligence) ||
      (reportFilter === "needs-generation" && !report.hasSavedIntelligence) ||
      (reportFilter === "completed-extraction" &&
        report.extractionStatus === "Completed");

    return matchesSearch && matchesFilter;
  });

  const visibleReports = filteredReports.slice(0, visibleReportsCount);
  const hiddenReportsCount = Math.max(filteredReports.length - visibleReportsCount, 0);
  const canShowMoreReports = hiddenReportsCount > 0;
  const canShowLessReports = visibleReportsCount > REPORTS_INITIAL_LIMIT;

  const primaryNextStep =
    reports.length === 0
      ? {
          label: text("Start here", "ابدأ هنا"),
          title: text(
            "Upload your first medical report",
            "ارفع أول تقرير طبي"
          ),
          description: text(
            "After uploading a report, it will appear here and you can continue to Intelligence Center.",
            "بعد رفع التقرير، سيظهر هنا ويمكنك المتابعة إلى مركز الذكاء."
          ),
          href: "/lab-upload",
          buttonText: text("Upload Report", "رفع تقرير"),
        }
      : stats.saved > 0
      ? {
          label: text("Next step", "الخطوة التالية"),
          title: text(
            "Review your follow-up plan",
            "راجع خطة المتابعة"
          ),
          description: text(
            "You have saved intelligence results. Use them to continue into your follow-up plan.",
            "لديك نتائج ذكاء محفوظة. استخدمها للانتقال إلى خطة المتابعة."
          ),
          href: "/health-plan",
          buttonText: text("Open Health Plan", "فتح خطة الصحة"),
        }
      : {
          label: text("Next step", "الخطوة التالية"),
          title: text(
            "Generate intelligence for your reports",
            "ولّد الذكاء الصحي للتقارير"
          ),
          description: text(
            "You have saved reports. Now open Intelligence Center to generate summaries.",
            "لديك تقارير محفوظة. افتح مركز الذكاء الآن لتوليد الملخصات."
          ),
          href: "/intelligence",
          buttonText: text("Open Intelligence", "فتح مركز الذكاء"),
        };

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"}>
      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Reports Library Command Center", "مركز مكتبة التقارير")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Track your medical reports and intelligence results",
                  "تابع تقاريرك الطبية ونتائج الذكاء"
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "This page shows whether a report is saved, whether it needs health intelligence generation, and whether a saved result can be used for your follow-up plan.",
                  "توضح هذه الصفحة هل التقرير محفوظ، وهل يحتاج توليد ذكاء صحي، وهل توجد نتيجة محفوظة يمكن استخدامها في خطة المتابعة."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/lab-upload" className="primaryBtn">
                  {text("Upload Report", "رفع تقرير")}
                </Link>

                <Link href="/intelligence" className="secondaryBtn">
                  {text("Intelligence Center", "مركز الذكاء")}
                </Link>

                <Link href="/health-plan" className="secondaryBtn">
                  {text("Health Plan", "الخطة الصحية")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">{primaryNextStep.label}</p>
                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {primaryNextStep.title}
                  </h2>
                </div>

                <span className="ohStatusBadge neutral">
                  {stats.total} {text("reports", "تقارير")}
                </span>
              </div>

              <p className="ohCardText">{primaryNextStep.description}</p>

              <div className="ohDivider" />

              <Link href={primaryNextStep.href} className="primaryBtn">
                {primaryNextStep.buttonText}
              </Link>
            </div>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Total Reports", "كل التقارير")}
            </span>
            <span className="ohMetricValue">{stats.total}</span>
            <span className="ohMetricHint">
              {text("Reports saved in your account", "تقارير محفوظة في حسابك")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Saved Intelligence", "ذكاء محفوظ")}
            </span>
            <span className="ohMetricValue">{stats.saved}</span>
            <span className="ohMetricHint">
              {text("Results ready for review", "نتائج جاهزة للمراجعة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Need Generation", "تحتاج توليد")}
            </span>
            <span className="ohMetricValue">{stats.needsGeneration}</span>
            <span className="ohMetricHint">
              {text("Reports that need Generate", "تقارير تحتاج Generate")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Extraction Completed", "استخراج مكتمل")}
            </span>
            <span className="ohMetricValue">{stats.completedExtraction}</span>
            <span className="ohMetricHint">
              {text("Reports ready for analysis", "تقارير جاهزة للتحليل")}
            </span>
          </article>
        </section>

        {loading && (
          <section className="ohCard">
            <p className="ohEyebrow">{text("Loading", "تحميل")}</p>
            <h2 className="ohCardTitle">
              {text("Loading your reports library...", "جاري تحميل مكتبة التقارير...")}
            </h2>
            <p className="ohCardText">
              {text(
                "OrganHeal is preparing your saved medical reports and intelligence status.",
                "يقوم OrganHeal بتحضير التقارير الطبية المحفوظة وحالة الذكاء."
              )}
            </p>
          </section>
        )}

        {!loading && message && (
          <section className="ohCard">
            <p className="ohEyebrow">{text("Notice", "تنبيه")}</p>
            <h2 className="ohCardTitle">
              {text("Could not load reports", "تعذر تحميل التقارير")}
            </h2>
            <p className="ohCardText">{message}</p>
          </section>
        )}

        {!loading && !message && reports.length === 0 && (
          <section className="ohEmptyState">
            <h2>
              {text(
                "Upload a medical report to start health intelligence",
                "ارفع تقريرًا طبيًا لتبدأ رحلة الذكاء الصحي"
              )}
            </h2>

            <p>
              {text(
                "After upload, the report will appear here, then you can move to Intelligence Center to generate a patient-friendly summary and doctor-ready brief.",
                "بعد الرفع، سيظهر التقرير هنا، ثم تستطيع الانتقال إلى مركز الذكاء لتوليد ملخص للمريض وملخص جاهز للطبيب."
              )}
            </p>

            <div className="ohButtonRow" style={{ justifyContent: "center" }}>
              <Link href="/lab-upload" className="primaryBtn">
                {text("Upload Medical Report", "رفع تقرير طبي")}
              </Link>

              <Link href="/dashboard" className="secondaryBtn">
                {text("Dashboard", "لوحة التحكم")}
              </Link>
            </div>
          </section>
        )}

        {!loading && !message && reports.length > 0 && (
          <section className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Saved Reports", "التقارير المحفوظة")}
                </p>

                <h2 className="ohCardTitle">
                  {text(
                    "Every report should lead to a clear next step",
                    "كل تقرير يجب أن يقود إلى خطوة واضحة"
                  )}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Open the original report, continue to Intelligence Center to generate or review results, then use Health Plan for follow-up.",
                    "افتح التقرير الأصلي، أو انتقل إلى مركز الذكاء لتوليد أو مراجعة النتيجة، ثم استخدم الخطة الصحية للمتابعة."
                  )}
                </p>
              </div>

              <span className="ohStatusBadge neutral">
                {filteredReports.length} {text("shown", "ظاهر")}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(200px, 280px)",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <input
                type="text"
                placeholder={text("Search by file name", "ابحث باسم الملف")}
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setVisibleReportsCount(REPORTS_INITIAL_LIMIT);
                }}
              />

              <select
                value={reportFilter}
                onChange={(event) => {
                  setReportFilter(event.target.value as ReportFilter);
                  setVisibleReportsCount(REPORTS_INITIAL_LIMIT);
                }}
              >
                <option value="all">{text("All reports", "كل التقارير")}</option>
                <option value="saved">{text("Saved intelligence", "ذكاء محفوظ")}</option>
                <option value="needs-generation">
                  {text("Needs generation", "تحتاج توليد")}
                </option>
                <option value="completed-extraction">
                  {text("Completed extraction", "استخراج مكتمل")}
                </option>
              </select>
            </div>

            {filteredReports.length === 0 ? (
              <div className="ohEmptyState">
                <h2>{text("No matching reports", "لا توجد تقارير مطابقة")}</h2>
                <p>
                  {text(
                    "Try changing the search term or selected filter.",
                    "جرّب تغيير البحث أو الفلتر المحدد."
                  )}
                </p>
              </div>
            ) : (
              <>
                <div className="ohGrid cols2">
                  {visibleReports.map((report) => {
                    const decision = getReportDecision(report);

                    return (
                      <article className="ohCard" key={report.reportId}>
                        <div className="ohCardHeader">
                          <div>
                            <p className="ohMetricLabel">
                              {getReportTypeLabel(report.reportType)}
                            </p>

                            <h3 className="ohCardTitle">{report.fileName}</h3>
                          </div>

                          <span className={`ohStatusBadge ${decision.tone}`}>
                            {decision.label}
                          </span>
                        </div>

                        <div className="ohGrid cols2" style={{ gap: "12px" }}>
                          <div className="ohMetricCard">
                            <span className="ohMetricLabel">
                              {text("Uploaded", "تاريخ الرفع")}
                            </span>
                            <span className="ohMetricValue" style={{ fontSize: "1.05rem" }}>
                              {formatDate(report.uploadedAt)}
                            </span>
                          </div>

                          <div className="ohMetricCard">
                            <span className="ohMetricLabel">
                              {text("Extraction", "الاستخراج")}
                            </span>
                            <span className="ohMetricValue" style={{ fontSize: "1.05rem" }}>
                              {getExtractionLabel(report.extractionStatus)}
                            </span>
                            <span className={`ohStatusBadge ${getExtractionTone(report.extractionStatus)}`}>
                              {report.extractionStatus || "Pending"}
                            </span>
                          </div>

                          <div className="ohMetricCard">
                            <span className="ohMetricLabel">
                              {text("Intelligence", "حالة الذكاء")}
                            </span>
                            <span className="ohMetricValue" style={{ fontSize: "1.05rem" }}>
                              {report.hasSavedIntelligence
                                ? text("Saved", "محفوظ")
                                : report.aiStatus || text("Pending", "بانتظار")}
                            </span>
                            <span className="ohMetricHint">
                              {report.savedUpdatedAt
                                ? `${text("Updated", "آخر تحديث")}: ${formatDate(report.savedUpdatedAt)}`
                                : text("No saved generation yet", "لا يوجد توليد محفوظ بعد")}
                            </span>
                          </div>

                          <div className="ohMetricCard">
                            <span className="ohMetricLabel">
                              {text("Risk Signal", "إشارة الخطورة")}
                            </span>
                            <span className="ohMetricValue" style={{ fontSize: "1.05rem" }}>
                              {report.riskLevel || text("Pending", "بانتظار")}
                            </span>
                            <span className={`ohStatusBadge ${getRiskTone(report.riskLevel)}`}>
                              {report.riskLevel || text("Neutral", "محايد")}
                            </span>
                          </div>
                        </div>

                        <div className="ohActionPanel">
                          <p className="ohMetricLabel">{decision.title}</p>
                          <p className="ohCardText">{decision.description}</p>
                        </div>

                        {report.summary && (
                          <p className="ohCardText">
                            {report.summary.length > 220
                              ? report.summary.slice(0, 220) + "..."
                              : report.summary}
                          </p>
                        )}

                        {report.nextBestAction && (
                          <div className="ohTrustNotice">
                            <span aria-hidden="true">➡️</span>
                            <div>
                              <strong>{text("Next:", "الخطوة التالية:")}</strong>{" "}
                              {report.nextBestAction}
                            </div>
                          </div>
                        )}

                        <div className="ohButtonRow">
                          <button
                            type="button"
                            className="secondaryBtn"
                            onClick={() => openMedicalReport(report.filePath)}
                            disabled={!report.filePath}
                          >
                            {text("Open Report", "فتح التقرير")}
                          </button>

                          <Link href={decision.href} className="primaryBtn">
                            {decision.buttonText}
                          </Link>

                          {report.hasSavedIntelligence && (
                            <Link href="/health-plan" className="secondaryBtn">
                              {text("Health Plan", "خطة الصحة")}
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {filteredReports.length > REPORTS_INITIAL_LIMIT && (
                  <div
                    className="ohButtonRow"
                    style={{ justifyContent: "center", marginTop: "22px" }}
                  >
                    {canShowMoreReports && (
                      <button
                        type="button"
                        className="secondaryBtn"
                        onClick={() =>
                          setVisibleReportsCount((current) =>
                            Math.min(current + REPORTS_LOAD_STEP, filteredReports.length)
                          )
                        }
                      >
                        {text(
                          `Show More (${Math.min(REPORTS_LOAD_STEP, hiddenReportsCount)})`,
                          `عرض المزيد (${Math.min(REPORTS_LOAD_STEP, hiddenReportsCount)})`
                        )}
                      </button>
                    )}

                    {canShowLessReports && (
                      <button
                        type="button"
                        className="secondaryBtn"
                        onClick={() => setVisibleReportsCount(REPORTS_INITIAL_LIMIT)}
                      >
                        {text("Show Less", "عرض أقل")}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        <section className="ohTrustNotice">
          <span aria-hidden="true">🛡️</span>
          <div>
            <strong>
              {text("Privacy and medical safety reminder", "تذكير الخصوصية والسلامة الطبية")}
            </strong>
            <br />
            {text(
              "Reports Library organizes your uploaded medical documents and intelligence status. It does not replace diagnosis, treatment, emergency care, or a licensed clinician.",
              "مكتبة التقارير تنظم مستنداتك الطبية المرفوعة وحالة الذكاء الصحي. لا تستبدل التشخيص أو العلاج أو الرعاية الطارئة أو الطبيب المختص."
            )}
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Full Path", "المسار الكامل")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "From report upload to follow-up plan",
                  "من رفع التقرير إلى خطة المتابعة"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Upload the report, open Intelligence Center, review summaries, then continue to your follow-up plan.",
                  "ارفع التقرير، افتح مركز الذكاء، راجع الملخصات، ثم انتقل إلى خطة المتابعة."
                )}
              </p>
            </div>
          </div>

          <div className="ohButtonRow">
            <Link href="/lab-upload" className="secondaryBtn">
              {text("Upload", "رفع تقرير")}
            </Link>

            <Link href="/intelligence" className="primaryBtn">
              {text("Intelligence", "الذكاء")}
            </Link>

            <Link href="/health-plan" className="secondaryBtn">
              {text("Health Plan", "الخطة")}
            </Link>

            <Link href="/doctor-portal" className="secondaryBtn">
              {text("Doctor Portal", "بوابة الطبيب")}
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

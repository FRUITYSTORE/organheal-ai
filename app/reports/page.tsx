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

export default function ReportsPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [reports, setReports] = useState<ReportLibraryItem[]>([]);
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
    setLoading(false);
  }

  async function openMedicalReport(filePath: string | null) {
    if (!filePath) {
      alert(
        isArabic
          ? "لا يوجد مسار ملف محفوظ لهذا التقرير."
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
          ? "تعذر فتح التقرير الآن."
          : "Unable to open the report right now."
      );
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  function formatDate(value: string | null) {
    if (!value) return isArabic ? "غير متاح" : "Not available";
    return new Date(value).toLocaleString();
  }

  function getReportTypeLabel(type: string | null) {
    if (!type) return isArabic ? "تقرير طبي" : "Medical report";

    if (type === "lab") return isArabic ? "مختبر" : "Laboratory";
    if (type === "radiology") return isArabic ? "أشعة" : "Radiology";
    if (type === "clinical") return isArabic ? "تقرير سريري" : "Clinical";
    if (type === "prescription") return isArabic ? "وصفة طبية" : "Prescription";

    return type;
  }

  function getExtractionLabel(status: string | null) {
    const cleanStatus = status || "Pending";

    if (isArabic) {
      if (cleanStatus === "Completed") return "الاستخراج مكتمل";
      if (cleanStatus === "Processing") return "جاري الاستخراج";
      if (cleanStatus === "Failed") return "فشل الاستخراج";
      return "بانتظار الاستخراج";
    }

    if (cleanStatus === "Completed") return "Extraction completed";
    if (cleanStatus === "Processing") return "Extraction processing";
    if (cleanStatus === "Failed") return "Extraction failed";
    return "Extraction pending";
  }

  function getReportDecision(report: ReportLibraryItem) {
    if (report.hasSavedIntelligence) {
      return {
        label: isArabic ? "ذكاء محفوظ" : "Saved intelligence",
        title: isArabic
          ? "نتيجة الذكاء الصحي محفوظة"
          : "Health intelligence is saved",
        description: isArabic
          ? "يمكنك فتح مركز الذكاء لمراجعة الملخصات، أو الانتقال إلى خطة المتابعة."
          : "Open Intelligence Center to review summaries, or continue to your follow-up plan.",
        href: "/intelligence",
        buttonText: isArabic ? "افتح النتيجة" : "Open Result",
      };
    }

    if (report.insightId) {
      return {
        label: isArabic ? "جاهز للتوليد" : "Ready to generate",
        title: isArabic
          ? "هذا التقرير يحتاج توليد الذكاء"
          : "This report needs intelligence generation",
        description: isArabic
          ? "افتح مركز الذكاء واضغط Generate لتحويل التقرير إلى ملخصات وخطة متابعة."
          : "Open Intelligence Center and press Generate to turn this report into summaries and follow-up steps.",
        href: "/intelligence",
        buttonText: isArabic ? "ولّد في مركز الذكاء" : "Generate in Intelligence",
      };
    }

    return {
      label: isArabic ? "تم الحفظ" : "Saved",
      title: isArabic
        ? "التقرير محفوظ ويحتاج متابعة"
        : "The report is saved and needs follow-up",
      description: isArabic
        ? "افتح مركز الذكاء أو ارفع تقريرًا آخر إذا لم يظهر بعد."
        : "Open Intelligence Center or upload another report if it does not appear yet.",
      href: "/intelligence",
      buttonText: isArabic ? "افتح مركز الذكاء" : "Open Intelligence",
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

  const primaryNextStep =
    reports.length === 0
      ? {
          label: isArabic ? "ابدأ هنا" : "Start here",
          title: isArabic
            ? "ارفع أول تقرير طبي"
            : "Upload your first medical report",
          description: isArabic
            ? "بعد رفع التقرير، سيظهر هنا ويمكنك المتابعة إلى مركز الذكاء."
            : "After uploading a report, it will appear here and you can continue to Intelligence Center.",
          href: "/lab-upload",
          buttonText: isArabic ? "ارفع تقريرًا" : "Upload Report",
        }
      : stats.saved > 0
      ? {
          label: isArabic ? "الخطوة التالية" : "Next step",
          title: isArabic ? "راجع خطة المتابعة" : "Review your follow-up plan",
          description: isArabic
            ? "لديك نتائج ذكاء محفوظة. استخدمها للانتقال إلى خطة المتابعة."
            : "You have saved intelligence results. Use them to continue into your follow-up plan.",
          href: "/health-plan",
          buttonText: isArabic ? "افتح خطة الصحة" : "Open Health Plan",
        }
      : {
          label: isArabic ? "الخطوة التالية" : "Next step",
          title: isArabic
            ? "ولّد الذكاء الصحي للتقارير"
            : "Generate intelligence for your reports",
          description: isArabic
            ? "لديك تقارير محفوظة، والآن تحتاج إلى فتح مركز الذكاء لتوليد الملخصات."
            : "You have saved reports. Now open Intelligence Center to generate summaries.",
          href: "/intelligence",
          buttonText: isArabic ? "افتح مركز الذكاء" : "Open Intelligence",
        };

  return (
    <main className="reportsConversionPage" dir={isArabic ? "rtl" : "ltr"}>
      <section className="reportsHero">
        <div>
          <p className="launchEyebrow">
            {isArabic ? "مكتبة التقارير" : "Reports Library"}
          </p>

          <h1>
            {isArabic
              ? "تابع تقاريرك الطبية ونتائج الذكاء"
              : "Track your medical reports and intelligence results"}
          </h1>

          <p>
            {isArabic
              ? "هذه الصفحة توضّح هل التقرير محفوظ، هل يحتاج توليد ذكاء صحي، وهل توجد نتيجة محفوظة يمكن استخدامها في خطة المتابعة."
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
          <span>{isArabic ? "كل التقارير" : "Total reports"}</span>
          <strong>{stats.total}</strong>
          <p>{isArabic ? "تقارير محفوظة في حسابك" : "Reports saved in your account"}</p>
        </article>

        <article>
          <span>{isArabic ? "ذكاء محفوظ" : "Saved intelligence"}</span>
          <strong>{stats.saved}</strong>
          <p>{isArabic ? "نتائج جاهزة للمراجعة" : "Results ready for review"}</p>
        </article>

        <article>
          <span>{isArabic ? "تحتاج توليد" : "Need generation"}</span>
          <strong>{stats.needsGeneration}</strong>
          <p>{isArabic ? "تقارير تحتاج Generate" : "Reports that need Generate"}</p>
        </article>

        <article>
          <span>{isArabic ? "استخراج مكتمل" : "Extraction completed"}</span>
          <strong>{stats.completedExtraction}</strong>
          <p>{isArabic ? "تقارير جاهزة للتحليل" : "Reports ready for analysis"}</p>
        </article>
      </section>

      {loading && (
        <section className="reportsPanel">
          <p className="launchEyebrow">{isArabic ? "تحميل" : "Loading"}</p>
          <h2>
            {isArabic
              ? "جاري تحميل مكتبة التقارير..."
              : "Loading your reports library..."}
          </h2>
        </section>
      )}

      {!loading && message && (
        <section className="reportsPanel">
          <p className="launchEyebrow">{isArabic ? "تنبيه" : "Notice"}</p>
          <h2>
            {isArabic ? "تعذر تحميل التقارير" : "Could not load reports"}
          </h2>
          <p>{message}</p>
        </section>
      )}

      {!loading && !message && reports.length === 0 && (
        <section className="reportsEmptyState">
          <p className="launchEyebrow">
            {isArabic ? "لا توجد تقارير بعد" : "No reports yet"}
          </p>

          <h2>
            {isArabic
              ? "ارفع تقريرًا طبيًا لتبدأ رحلة الذكاء الصحي"
              : "Upload a medical report to start health intelligence"}
          </h2>

          <p>
            {isArabic
              ? "بعد الرفع، سيظهر التقرير هنا، ثم تستطيع الانتقال إلى مركز الذكاء لتوليد ملخص للمريض وملخص جاهز للطبيب."
              : "After upload, the report will appear here, then you can move to Intelligence Center to generate a patient-friendly summary and doctor-ready brief."}
          </p>

          <div className="reportsActionRow">
            <Link href="/lab-upload" className="launchPrimary">
              {isArabic ? "ارفع تقريرًا طبيًا" : "Upload Medical Report"}
            </Link>

            <Link href="/dashboard" className="launchSecondary">
              {isArabic ? "لوحة التحكم" : "Dashboard"}
            </Link>
          </div>
        </section>
      )}

      {!loading && !message && reports.length > 0 && (
        <section className="reportsListSection">
          <div className="reportsSectionHeader">
            <p className="launchEyebrow">
              {isArabic ? "التقارير المحفوظة" : "Saved reports"}
            </p>

            <h2>
              {isArabic
                ? "كل تقرير يجب أن يقود إلى خطوة واضحة"
                : "Every report should lead to a clear next step"}
            </h2>

            <p>
              {isArabic
                ? "افتح التقرير الأصلي، أو انتقل إلى مركز الذكاء لتوليد/مراجعة النتيجة، ثم استخدم الخطة الصحية للمتابعة."
                : "Open the original report, continue to Intelligence Center to generate or review results, then use Health Plan for follow-up."}
            </p>
          </div>

          <div className="reportsCardGrid">
            {reports.map((report) => {
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
                      <span>{isArabic ? "تاريخ الرفع" : "Uploaded"}</span>
                      <strong>{formatDate(report.uploadedAt)}</strong>
                    </div>

                    <div>
                      <span>{isArabic ? "الاستخراج" : "Extraction"}</span>
                      <strong>{getExtractionLabel(report.extractionStatus)}</strong>
                    </div>

                    <div>
                      <span>{isArabic ? "حالة الذكاء" : "Intelligence"}</span>
                      <strong>
                        {report.hasSavedIntelligence
                          ? isArabic
                            ? "محفوظ"
                            : "Saved"
                          : report.aiStatus || (isArabic ? "بانتظار" : "Pending")}
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
                      <strong>{isArabic ? "الخطوة التالية:" : "Next:"}</strong>{" "}
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
                      {isArabic ? "فتح التقرير" : "Open Report"}
                    </button>

                    <Link href={decision.href} className="launchPrimary">
                      {decision.buttonText}
                    </Link>

                    {report.hasSavedIntelligence && (
                      <Link href="/health-plan" className="launchSecondary">
                        {isArabic ? "خطة الصحة" : "Health Plan"}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="reportsBottomNav">
        <div>
          <p className="launchEyebrow">
            {isArabic ? "المسار الكامل" : "Full path"}
          </p>
          <h2>
            {isArabic
              ? "من رفع التقرير إلى خطة المتابعة"
              : "From report upload to follow-up plan"}
          </h2>
          <p>
            {isArabic
              ? "ارفع التقرير، افتح مركز الذكاء، راجع الملخصات، ثم انتقل إلى خطة المتابعة."
              : "Upload the report, open Intelligence Center, review summaries, then continue to your follow-up plan."}
          </p>
        </div>

        <div className="reportsBottomLinks">
          <Link href="/lab-upload">{isArabic ? "رفع تقرير" : "Upload"}</Link>
          <Link href="/intelligence">{isArabic ? "الذكاء" : "Intelligence"}</Link>
          <Link href="/health-plan">{isArabic ? "الخطة" : "Health Plan"}</Link>
          <Link href="/doctor-portal">{isArabic ? "بوابة الطبيب" : "Doctor Portal"}</Link>
          <Link href="/dashboard">{isArabic ? "لوحة التحكم" : "Dashboard"}</Link>
        </div>
      </section>
    </main>
  );
}
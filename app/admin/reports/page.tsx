"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";

type Report = {
  id: number;
  file_name: string;
  report_type: string | null;
  created_at: string;

  extraction_status?: string | null;
  extracted_text?: string | null;
  extracted_at?: string | null;

  analysis_status?: string | null;
  ai_summary?: string | null;
};

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const savedLanguage =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return savedLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function getStatusTone(status?: string | null) {
  const normalized = (status || "").toLowerCase();

  if (
    normalized.includes("complete") ||
    normalized.includes("success") ||
    normalized.includes("done") ||
    normalized.includes("extracted")
  ) {
    return "good";
  }

  if (
    normalized.includes("fail") ||
    normalized.includes("error") ||
    normalized.includes("rejected")
  ) {
    return "risk";
  }

  if (
    normalized.includes("process") ||
    normalized.includes("pending") ||
    normalized.includes("extract") ||
    normalized.includes("generat")
  ) {
    return "moderate";
  }

  return "neutral";
}

export default function AdminReportsPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  useEffect(() => {
    loadReports();
  }, []);

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  async function loadReports() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("uploaded_lab_files")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
      setReports([]);
      setLoading(false);
      return;
    }

    setReports((data || []) as Report[]);
    setLoading(false);
  }

  const metrics = useMemo(() => {
    const total = reports.length;

    const extracted = reports.filter((report) => {
      const status = (report.extraction_status || "").toLowerCase();
      return (
        status.includes("complete") ||
        status.includes("success") ||
        status.includes("done") ||
        Boolean(report.extracted_text)
      );
    }).length;

    const pendingExtraction = reports.filter((report) => {
      const status = (report.extraction_status || "").toLowerCase();
      return !report.extracted_text && (!status || status.includes("pending"));
    }).length;

    const aiReady = reports.filter((report) => {
      const status = (report.analysis_status || "").toLowerCase();
      return (
        status.includes("complete") ||
        status.includes("success") ||
        status.includes("done") ||
        Boolean(report.ai_summary)
      );
    }).length;

    return {
      total,
      extracted,
      pendingExtraction,
      aiReady,
    };
  }, [reports]);

  return (
    <main
      className="ohPageShell"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Admin Report Console", "لوحة إدارة التقارير")}
              </p>

              <h1 className="ohTitle">
                {text("Uploaded Reports Monitor", "مراقبة التقارير المرفوعة")}
              </h1>

              <p className="ohLead">
                {text(
                  "Internal console used to monitor uploaded report records, extraction status, and AI analysis readiness.",
                  "لوحة داخلية لمراقبة سجلات التقارير المرفوعة، حالة استخراج النص، وجاهزية تحليل الذكاء الاصطناعي."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <button className="primaryBtn" type="button" onClick={loadReports}>
                  {loading
                    ? text("Refreshing...", "جاري التحديث...")
                    : text("Refresh Reports", "تحديث التقارير")}
                </button>

                <Link href="/reports" className="secondaryBtn">
                  {text("Reports Library", "مكتبة التقارير")}
                </Link>

                <Link href="/dashboard" className="secondaryBtn">
                  {text("Dashboard", "لوحة التحكم")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Console scope", "نطاق الصفحة")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text("Operational visibility", "متابعة تشغيلية")}
                  </h2>
                </div>

                <span className="ohStatusBadge neutral">
                  {text("Internal", "داخلي")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "This page reads from uploaded_lab_files and displays extraction-related fields without changing records.",
                  "هذه الصفحة تقرأ من جدول uploaded_lab_files وتعرض حقول الاستخراج دون تعديل السجلات."
                )}
              </p>

              <div className="ohTrustNotice" style={{ marginTop: "16px" }}>
                <span aria-hidden="true">🛡️</span>
                <div>
                  <strong>
                    {text("Security note", "ملاحظة أمان")}
                  </strong>
                  <br />
                  {text(
                    "A full admin role gate should be added later when the admin permissions schema is finalized.",
                    "يجب إضافة بوابة صلاحيات Admin كاملة لاحقًا عند تثبيت مخطط الصلاحيات."
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Total Reports", "إجمالي التقارير")}
            </span>
            <span className="ohMetricValue">{metrics.total}</span>
            <span className="ohMetricHint">
              {text("Uploaded records", "سجلات مرفوعة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Extracted", "تم الاستخراج")}
            </span>
            <span className="ohMetricValue">{metrics.extracted}</span>
            <span className="ohMetricHint">
              {text("Text available", "النص متوفر")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Pending Extraction", "بانتظار الاستخراج")}
            </span>
            <span className="ohMetricValue">{metrics.pendingExtraction}</span>
            <span className="ohMetricHint">
              {text("Needs processing", "يحتاج معالجة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("AI Ready", "جاهز للذكاء الاصطناعي")}
            </span>
            <span className="ohMetricValue">{metrics.aiReady}</span>
            <span className="ohMetricHint">
              {text("Analysis available", "التحليل متوفر")}
            </span>
          </article>
        </section>

        {errorMessage && (
          <section className="ohTrustNotice">
            <span aria-hidden="true">⚠️</span>
            <div>
              <strong>
                {text("Unable to load reports", "تعذر تحميل التقارير")}
              </strong>
              <br />
              {errorMessage}
            </div>
          </section>
        )}

        {loading ? (
          <section className="ohEmptyState">
            <h2>{text("Loading reports...", "جاري تحميل التقارير...")}</h2>
            <p>
              {text(
                "Please wait while OrganHeal reads uploaded report records.",
                "يرجى الانتظار أثناء قراءة سجلات التقارير المرفوعة."
              )}
            </p>
          </section>
        ) : reports.length === 0 ? (
          <section className="ohEmptyState">
            <h2>{text("No uploaded reports found", "لا توجد تقارير مرفوعة")}</h2>
            <p>
              {text(
                "When reports are uploaded, they will appear in this admin console.",
                "عند رفع التقارير، ستظهر هنا في لوحة الإدارة."
              )}
            </p>

            <Link href="/lab-upload" className="primaryBtn">
              {text("Upload Report", "رفع تقرير")}
            </Link>
          </section>
        ) : (
          <section className="ohStack">
            {reports.map((report) => {
              const extractionTone = getStatusTone(report.extraction_status);
              const aiTone = getStatusTone(report.analysis_status);

              return (
                <article className="ohCard" key={report.id}>
                  <div className="ohCardHeader">
                    <div>
                      <p className="ohMetricLabel">
                        {text("Report ID", "رقم التقرير")} #{report.id}
                      </p>

                      <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                        📄 {report.file_name}
                      </h2>

                      <p className="ohCardText">
                        {text("Uploaded:", "تاريخ الرفع:")}{" "}
                        {new Date(report.created_at).toLocaleString(
                          isArabic ? "ar" : "en"
                        )}
                      </p>
                    </div>

                    <div className="ohButtonRow">
                      <span className={`ohStatusBadge ${extractionTone}`}>
                        {text("Extraction:", "الاستخراج:")}{" "}
                        {report.extraction_status || text("Pending", "بانتظار")}
                      </span>

                      <span className={`ohStatusBadge ${aiTone}`}>
                        {text("AI:", "الذكاء:")}{" "}
                        {report.analysis_status || text("Pending", "بانتظار")}
                      </span>
                    </div>
                  </div>

                  <div className="ohMetricGrid">
                    <div className="ohMetricCard">
                      <span className="ohMetricLabel">
                        {text("Report Type", "نوع التقرير")}
                      </span>
                      <span className="ohMetricHint">
                        {report.report_type || text("Medical Report", "تقرير طبي")}
                      </span>
                    </div>

                    <div className="ohMetricCard">
                      <span className="ohMetricLabel">
                        {text("Extracted At", "وقت الاستخراج")}
                      </span>
                      <span className="ohMetricHint">
                        {report.extracted_at || text("Not extracted", "لم يتم الاستخراج")}
                      </span>
                    </div>

                    <div className="ohMetricCard">
                      <span className="ohMetricLabel">
                        {text("Text Length", "طول النص")}
                      </span>
                      <span className="ohMetricHint">
                        {report.extracted_text
                          ? `${report.extracted_text.length.toLocaleString()} chars`
                          : text("No text", "لا يوجد نص")}
                      </span>
                    </div>
                  </div>

                  <div className="ohDivider" />

                  <div>
                    <p className="ohMetricLabel">
                      {text("Extracted Text", "النص المستخرج")}
                    </p>

                    <div
                      style={{
                        maxHeight: "280px",
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                        padding: "14px",
                        background: "rgba(248, 250, 252, 0.86)",
                        border: "1px solid rgba(148, 163, 184, 0.24)",
                        borderRadius: "16px",
                        marginTop: "10px",
                        lineHeight: 1.7,
                        color: "#334155",
                      }}
                    >
                      {report.extracted_text ||
                        text(
                          "No extracted text available yet.",
                          "لا يوجد نص مستخرج حتى الآن."
                        )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

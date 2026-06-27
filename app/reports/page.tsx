"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type ReportLibraryItem = {
  id: number;
  report_id: number | null;
  report_type: string | null;
  ai_status: string | null;
  risk_level: string | null;
  summary: string | null;
  next_best_action: string | null;
  created_at: string;
  file_name?: string;
  file_path?: string | null;
  uploaded_at?: string;
  extraction_status?: string | null;
};

export default function ReportsPage() {
  const [language, setLanguage] = useState("en");
  const [reports, setReports] = useState<ReportLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("organheal-language") || "en";
    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      setLanguage(localStorage.getItem("organheal-language") || "en");
    }, 300);

    loadReports();

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  async function loadReports() {
    setLoading(true);
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setReports([]);
      setMessage(
        "Please sign in to view your medical reports library."
      );
      setLoading(false);
      return;
    }

    const userId = userData.user.id;

    const { data: insights, error: insightsError } = await supabase
      .from("health_insights")
      .select(
        "id, report_id, report_type, ai_status, risk_level, summary, next_best_action, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (insightsError) {
      setReports([]);
      setMessage("Unable to load reports right now.");
      setLoading(false);
      return;
    }

    const reportIds = (insights || [])
      .map((item) => item.report_id)
      .filter((id): id is number => Boolean(id));

    let uploadedReports: {
      id: number;
      file_name: string;
      file_path: string | null;
      created_at: string;
      extraction_status: string | null;
    }[] = [];

    if (reportIds.length > 0) {
      const { data: reportData } = await supabase
        .from("uploaded_lab_files")
        .select("id, file_name, file_path, created_at, extraction_status")
        .in("id", reportIds);

      uploadedReports = reportData || [];
    }

    const mergedReports: ReportLibraryItem[] = (insights || []).map((item) => {
      const uploadedReport = uploadedReports.find(
        (report) => report.id === item.report_id
      );

      return {
        ...item,
        file_name: uploadedReport?.file_name || "Medical report",
        file_path: uploadedReport?.file_path || null,
        uploaded_at: uploadedReport?.created_at || item.created_at,
        extraction_status: uploadedReport?.extraction_status || "Pending",
      };
    });

    setReports(mergedReports);

    if (mergedReports.length === 0) {
      setMessage("No uploaded medical reports were found yet.");
    }

    setLoading(false);
  }

  function getReportTypeLabel(reportType: string | null) {
    if (!reportType) return isArabic ? "تقرير طبي" : "Medical report";

    const labels: Record<string, { en: string; ar: string }> = {
      lab: { en: "Laboratory Report", ar: "تقرير مختبر" },
      radiology: { en: "Radiology Report", ar: "تقرير أشعة" },
      medical: { en: "Medical Document", ar: "تقرير طبي" },
    };

    return isArabic
      ? labels[reportType]?.ar || "تقرير طبي"
      : labels[reportType]?.en || "Medical report";
  }

  function getStatusLabel(status: string | null | undefined) {
    if (!status) return isArabic ? "قيد الانتظار" : "Pending";

    if (status === "Completed") {
      return isArabic ? "مكتمل" : "Completed";
    }

    if (status === "Failed") {
      return isArabic ? "غير مكتمل" : "Failed";
    }

    return status;
  }

  return (
    <main
      className="homepage"
      style={{
        minHeight: "100vh",
        padding: "48px 20px 70px",
        textAlign: isArabic ? "right" : "left",
      }}
    >
      <section
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "820px",
            margin: "0 auto 34px",
          }}
        >
          <p className="homeBadge">
            {isArabic ? "مكتبة التقارير الطبية" : "Medical Reports Library"}
          </p>

          <h1
            style={{
              fontSize: "clamp(2.2rem, 5vw, 4rem)",
              lineHeight: 1.08,
              marginBottom: "18px",
            }}
          >
            {isArabic
              ? "كل تقاريرك الطبية ونتائج الذكاء الصحي في مكان واحد"
              : "Your medical reports and health intelligence in one place"}
          </h1>

          <p
            style={{
              opacity: 0.82,
              lineHeight: 1.8,
              fontSize: "1.05rem",
              margin: "0 auto",
            }}
          >
            {isArabic
              ? "اعرض التقارير الطبية المرتبطة بحسابك، وتابع حالة الاستخراج ونتائج الذكاء الصحي المرتبطة بكل تقرير."
              : "View medical reports connected to your account, track extraction status, and see the intelligence status for each report."}
          </p>
        </div>

        <section
          style={{
            padding: "26px",
            borderRadius: "24px",
            background: "rgba(15,23,42,0.72)",
            border: "1px solid rgba(148,163,184,0.18)",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "14px",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <p className="sectionLabel">
                {isArabic ? "التقارير المحفوظة" : "Saved Reports"}
              </p>

              <h2 style={{ marginBottom: "6px" }}>
                {isArabic ? "مكتبة تقاريرك" : "Your Reports Library"}
              </h2>

              <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.7 }}>
                {isArabic
                  ? "هذه القائمة تعرض التقارير التي تم إنشاؤها داخل مركز الذكاء الصحي."
                  : "This list shows reports created inside the Health Intelligence Center."}
              </p>
            </div>

            <button
              type="button"
              className="secondaryBtn"
              onClick={loadReports}
              disabled={loading}
            >
              {loading
                ? isArabic
                  ? "جارِ التحديث..."
                  : "Refreshing..."
                : isArabic
                ? "تحديث"
                : "Refresh"}
            </button>
          </div>

          {loading && (
            <p style={{ opacity: 0.8 }}>
              {isArabic ? "جارِ تحميل التقارير..." : "Loading reports..."}
            </p>
          )}

          {!loading && message && reports.length === 0 && (
            <div
              style={{
                padding: "20px",
                borderRadius: "18px",
                background: "rgba(8,13,24,0.68)",
                border: "1px solid rgba(34,211,238,0.14)",
              }}
            >
              <p style={{ marginTop: 0, opacity: 0.82 }}>
                {isArabic
                  ? "لا توجد تقارير محفوظة بعد. ابدأ برفع تقرير طبي أو افتح مركز الذكاء الصحي."
                  : message}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <Link href="/lab-upload" className="primaryBtn">
                  {isArabic ? "ارفع تقريرًا طبيًا" : "Upload Medical Report"}
                </Link>

                <Link href="/intelligence" className="secondaryBtn">
                  {isArabic ? "افتح مركز الذكاء" : "Open Intelligence Center"}
                </Link>
              </div>
            </div>
          )}

          {!loading && reports.length > 0 && (
            <div
              style={{
                display: "grid",
                gap: "14px",
              }}
            >
              {reports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    padding: "18px",
                    borderRadius: "20px",
                    background: "rgba(8,13,24,0.68)",
                    border: "1px solid rgba(34,211,238,0.14)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "14px",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <p className="sectionLabel">
                        {getReportTypeLabel(report.report_type)}
                      </p>

                      <h3 style={{ marginBottom: "8px" }}>
                        {report.file_name || "Medical report"}
                      </h3>

                      <p
                        style={{
                          margin: 0,
                          opacity: 0.76,
                          lineHeight: 1.7,
                        }}
                      >
                        {isArabic ? "تاريخ الرفع: " : "Uploaded: "}
                        {new Date(
                          report.uploaded_at || report.created_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: "8px",
                        minWidth: "180px",
                      }}
                    >
                      <span
                        style={{
                          padding: "7px 10px",
                          borderRadius: "999px",
                          background: "rgba(34,211,238,0.1)",
                          border: "1px solid rgba(34,211,238,0.18)",
                          fontSize: "0.85rem",
                          textAlign: "center",
                        }}
                      >
                        {isArabic ? "الاستخراج: " : "Extraction: "}
                        {getStatusLabel(report.extraction_status)}
                      </span>

                      <span
                        style={{
                          padding: "7px 10px",
                          borderRadius: "999px",
                          background: "rgba(148,163,184,0.1)",
                          border: "1px solid rgba(148,163,184,0.18)",
                          fontSize: "0.85rem",
                          textAlign: "center",
                        }}
                      >
                        {isArabic ? "الذكاء: " : "AI: "}
                        {report.ai_status || "Pending"}
                      </span>
                    </div>
                  </div>

                  {(report.summary || report.next_best_action) && (
                    <div
                      style={{
                        marginTop: "14px",
                        paddingTop: "14px",
                        borderTop: "1px solid rgba(148,163,184,0.14)",
                      }}
                    >
                      {report.summary && (
                        <p
                          style={{
                            margin: "0 0 8px",
                            opacity: 0.84,
                            lineHeight: 1.7,
                          }}
                        >
                          {report.summary}
                        </p>
                      )}

                      {report.next_best_action && (
                        <p
                          style={{
                            margin: 0,
                            opacity: 0.78,
                            lineHeight: 1.7,
                          }}
                        >
                          <strong>
                            {isArabic ? "الخطوة التالية: " : "Next step: "}
                          </strong>
                          {report.next_best_action}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          style={{
            padding: "22px",
            borderRadius: "22px",
            background: "rgba(8,13,24,0.74)",
            border: "1px solid rgba(34,211,238,0.16)",
          }}
        >
          <p className="sectionLabel">
            {isArabic ? "السلامة الطبية" : "Medical Safety"}
          </p>

          <p
            style={{
              opacity: 0.82,
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            {isArabic
              ? "OrganHeal AI يقدم معلومات صحية تعليمية وتنظيمية فقط. لا يقدم تشخيصًا أو علاجًا أو نصيحة طبية طارئة، ولا يستبدل الطبيب أو الرعاية الطبية المرخصة."
              : "OrganHeal AI provides educational and organizational health intelligence only. It does not diagnose, treat, provide emergency advice, or replace licensed medical care."}
          </p>
        </section>

        <div
          style={{
            marginTop: "28px",
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Link href="/" className="secondaryBtn">
            {isArabic ? "العودة للرئيسية" : "Back to Home"}
          </Link>

          <Link href="/lab-upload" className="primaryBtn">
            {isArabic ? "ارفع تقريرًا طبيًا" : "Upload Medical Report"}
          </Link>

          <Link href="/intelligence" className="secondaryBtn">
            {isArabic ? "مركز الذكاء" : "Intelligence Center"}
          </Link>
        </div>
      </section>
    </main>
  );
}
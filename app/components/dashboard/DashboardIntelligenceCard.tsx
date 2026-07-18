import Link from "next/link";
import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

type DashboardIntelligenceCardProps = {
  intelligence: HealthIntelligenceResult;
  actionSummary: string;
  isArabic: boolean;
};

function severityLabel(severity: string, isArabic: boolean) {
  if (severity === "critical") return isArabic ? "حرج" : "Critical";
  if (severity === "warning") return isArabic ? "تنبيه" : "Warning";
  return isArabic ? "معلومة" : "Information";
}

function severityColor(severity: string) {
  if (severity === "critical") return "#ef4444";
  if (severity === "warning") return "#f59e0b";
  return "#0891b2";
}

export default function DashboardIntelligenceCard({
  intelligence,
  actionSummary,
  isArabic,
}: DashboardIntelligenceCardProps) {
  const topFindings = intelligence.findings.slice(0, 3);
  
  return (
    <section
  className="dashboardIntelligenceCard"
  style={{
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.94)",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: "22px",
    boxShadow:
  "0 12px 32px rgba(15, 23, 42, 0.05)",
    padding: "20px",
    marginBottom: "22px",
  }}
>
      <div
  style={{
    marginBottom: "24px",
  }}
>
  <span
    style={{
      color: "#0891b2",
      fontWeight: 900,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
    }}
  >
    {isArabic
      ? "تفاصيل الذكاء الصحي"
      : "Health Intelligence Details"}
  </span>

  <h2
    style={{
      margin: "10px 0 6px",
      color: "#0f172a",
    }}
  >
    {isArabic
      ? "شرح القرار الصحي"
      : "Understanding the Decision"}
  </h2>

  <p
    style={{
      color: "#64748b",
      margin: 0,
      lineHeight: 1.7,
    }}
  >
    {isArabic
      ? "يعرض هذا القسم سبب القرار الصحي الحالي والأدلة التي بُني عليها."
      : "This section explains why OrganHeal reached the current health decision and the evidence behind it."}
  </p>
</div>

      <div style={{ padding: "18px 0 0" }}>
        <span style={{ color: "#0891b2", fontWeight: 900 }}>
          {isArabic ? "أهم المؤشرات الصحية" : "Key Health Signals"}
        </span>

        <div style={{ marginTop: "16px" }}>
          {topFindings.map((finding, index) => (
            <div
              key={finding.id}
              style={{
                display: "grid",
                gridTemplateColumns: "34px 1fr",
                gap: "14px",
                position: "relative",
                paddingBottom:
  index === topFindings.length - 1
    ? 0
    : "14px",
              }}
            >
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    display: "block",
                    width: "14px",
                    height: "14px",
                    borderRadius: "999px",
                    background: severityColor(finding.severity),
                    marginTop: "7px",
                    boxShadow: "0 0 0 7px rgba(15, 118, 110, 0.08)",
                  }}
                />

                {index !== topFindings.length - 1 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "28px",
                      left: "6px",
                      width: "2px",
                      height: "calc(100% - 8px)",
                      background: "rgba(148, 163, 184, 0.35)",
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: "rgba(248, 250, 252, 0.75)",
                  borderRadius: "20px",
                  padding: "15px 16px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: severityColor(finding.severity),
                    fontWeight: 900,
                    fontSize: "0.82rem",
                  }}
                >
                  {severityLabel(finding.severity, isArabic)}
                </p>

                <p style={{ margin: "6px 0 0", fontWeight: 900, color: "#0f172a" }}>
                  {finding.title}
                </p>

                <p style={{ margin: "6px 0 0", color: "#475569" }}>
                  {finding.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
  style={{
    marginTop: "24px",
paddingTop: "20px",
    borderTop:
      "1px solid rgba(148,163,184,0.18)",
  }}
>
        <span style={{ color: "#0f766e", fontWeight: 900 }}>
          {isArabic ? "خطوات اليوم" : "Today’s Actions"}
        </span>

        <p style={{ margin: "8px 0 16px", color: "#475569" }}>
          {actionSummary}
        </p>

       <div className="dashboardTodayActions">
  <Link
    href="/health-plan"
    className="dashboardTodayAction dashboardTodayActionPrimary"
  >
    <span>
      {isArabic
        ? "مراجعة الخطة الصحية"
        : "Review Health Plan"}
    </span>

    <small>
      {isArabic
        ? "الإجراء الأساسي"
        : "Primary action"}
    </small>
  </Link>

  <Link
    href="/reports"
    className="dashboardTodayAction dashboardTodayActionSecondary"
  >
    <span>
      {isArabic
        ? "فتح مكتبة التقارير"
        : "Open Reports"}
    </span>

    <small>
      {isArabic
        ? "مراجعة الأدلة"
        : "Review evidence"}
    </small>
  </Link>

  <div
    className="dashboardTodayAction dashboardTodayActionDisabled"
    aria-disabled="true"
  >
    <span>
      {isArabic
        ? "ملخص الطبيب"
        : "Doctor Brief"}
    </span>

    <small>
      {isArabic
        ? "قريبًا"
        : "Coming soon"}
    </small>
  </div>
</div>
      </div>
    </section>
  );
}
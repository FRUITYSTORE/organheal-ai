import Link from "next/link";
import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

type DashboardIntelligenceCardProps = {
  intelligence: HealthIntelligenceResult;
  isArabic: boolean;
};

function riskLabel(risk: string, isArabic: boolean) {
  if (risk === "high") return isArabic ? "مرتفع" : "HIGH RISK";
  if (risk === "moderate") return isArabic ? "متوسط" : "MODERATE RISK";
  if (risk === "low") return isArabic ? "منخفض" : "LOW RISK";
  return isArabic ? "غير معروف" : "UNKNOWN";
}

function riskHeadline(risk: string, organ: string | null, isArabic: boolean) {
  const target = organ || (isArabic ? "الصحة العامة" : "Your health");

  if (risk === "high") return isArabic ? `${target} تحتاج متابعة قريبة` : `${target} requires close follow-up`;
  if (risk === "moderate") return isArabic ? `${target} تحتاج متابعة منتظمة` : `${target} needs steady follow-up`;
  if (risk === "low") return isArabic ? "الوضع الصحي مستقر حاليًا" : "Your current health status looks stable";

  return isArabic ? "نحتاج بيانات أكثر" : "More data is needed";
}

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
function healthLevelLabel(
  level: string,
  isArabic: boolean
) {
  switch (level) {
    case "critical":
      return isArabic ? "حرج" : "CRITICAL";

    case "high-concern":
      return isArabic ? "يحتاج متابعة" : "HIGH CONCERN";

    case "moderate":
      return isArabic ? "متوسط" : "MODERATE";

    case "stable":
      return isArabic ? "مستقر" : "STABLE";

    case "strong":
      return isArabic ? "قوي" : "STRONG";

    default:
      return level;
  }
}
export default function DashboardIntelligenceCard({
  intelligence,
  isArabic,
}: DashboardIntelligenceCardProps) {
  const topFindings = intelligence.findings.slice(0, 3);
const risk = intelligence.risk.data.overallRisk;
const priorityOrgan = intelligence.priority.data.priorityOrgan;
const priorityScore = intelligence.priority.data.priorityScore;
const healthScore = intelligence.healthScore.data.score;
const healthLevel = intelligence.healthScore.data.level;
  return (
    <section
  className="dashboardIntelligenceCard"
  style={{
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.94)",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: "28px",
    boxShadow: "0 24px 65px rgba(15, 23, 42, 0.08)",
    padding: "24px",
    marginBottom: "22px",
  }}
>
      <div
        style={{
          margin: "-24px -24px 0",
          padding: "34px",
          borderRadius: "28px 28px 0 0",
          background: "linear-gradient(135deg, #020617 0%, #0f172a 52%, #0f766e 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "18px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span style={{ color: "#67e8f9", fontWeight: 950 }}>
              {isArabic ? "الذكاء الصحي" : "Health Intelligence"}
            </span>

            <h2
              style={{
                color: "#ffffff",
                margin: "12px 0 10px",
                letterSpacing: "0.04em",
                fontSize: "clamp(2.8rem, 5vw, 4.3rem)",
                lineHeight: 0.95,
                textShadow: "0 0 26px rgba(103, 232, 249, 0.22)",
              }}
            >
              {riskLabel(risk, isArabic)}
            </h2>

            <p
              style={{
                color: "rgba(255,255,255,0.92)",
                maxWidth: "760px",
                margin: 0,
                fontSize: "1.08rem",
                fontWeight: 700,
              }}
            >
              {riskHeadline(risk, priorityOrgan, isArabic)}
            </p>
          </div>

          <div
            style={{
              border: "1px solid rgba(103, 232, 249, 0.28)",
              background: "rgba(2, 6, 23, 0.34)",
              borderRadius: "999px",
              padding: "10px 16px",
              color: "#ffffff",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            {isArabic ? "آخر تحديث: الآن" : "Last updated: now"}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "26px",
            marginTop: "34px",
          }}
        >
          {[
            {
              label: isArabic ? "الثقة" : "Confidence",
              value: `${intelligence.risk.confidence}%`,
              detail: isArabic ? "جودة التحليل الحالي" : "Current analysis quality",
            },
            {
              label: isArabic ? "الاهتمام الأول" : "Primary Concern",
              value: priorityOrgan || "—",
              detail:
                priorityScore === null
                  ? isArabic
                    ? "بانتظار التقييم"
                    : "Assessment pending"
                  : `${priorityScore}/100`,
            },
            {
  label: isArabic ? "نتيجة الذكاء الصحي" : "Health Score",
  value: `${healthScore}/100`,
  detail: healthLevelLabel(healthLevel, isArabic),
},
          ].map((item) => (
            <div key={item.label}>
              <span style={{ color: "#67e8f9", fontWeight: 950 }}>{item.label}</span>

              <strong
                style={{
                  display: "block",
                  marginTop: "10px",
                  fontSize: "2rem",
                  color: "#ffffff",
                  lineHeight: 1.1,
                }}
              >
                {item.value}
              </strong>

              <p
                style={{
                  color: "rgba(255,255,255,0.86)",
                  margin: "8px 0 0",
                  fontSize: "1rem",
                  fontWeight: 650,
                  lineHeight: 1.6,
                }}
              >
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "26px 0 0" }}>
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
                paddingBottom: index === topFindings.length - 1 ? 0 : "20px",
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
                  padding: "18px",
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
          padding: "20px",
          borderRadius: "22px",
          background: "rgba(240, 253, 250, 0.9)",
          border: "1px solid rgba(20, 184, 166, 0.22)",
        }}
      >
        <span style={{ color: "#0f766e", fontWeight: 900 }}>
          {isArabic ? "خطوات اليوم" : "Today’s Actions"}
        </span>

        <p style={{ margin: "8px 0 16px", color: "#475569" }}>
          {intelligence.risk.data.recommendation}
        </p>

        <div className="dashboardActionRow">
          <Link href="/health-plan" className="dashboardPrimaryAction">
            {isArabic ? "مراجعة الخطة الصحية" : "Review Health Plan"}
          </Link>

          <Link href="/reports" className="dashboardSecondaryAction">
            {isArabic ? "فتح مكتبة التقارير" : "Open Reports"}
          </Link>

          <span
            className="dashboardSecondaryAction"
            style={{
              opacity: 0.55,
              cursor: "default",
              pointerEvents: "none",
            }}
          >
            {isArabic ? "ملخص الطبيب قريبًا" : "Doctor Brief · Coming Soon"}
          </span>
        </div>
      </div>
    </section>
  );
}
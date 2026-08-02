type ExecutiveSummaryCardProps = {
  summary: {
    currentScore: number;
    trend: string;
    forecastScore: number;
    confidenceLevel: string;
    confidenceScore: number;
    prioritySystem: string;
    nextBestAction: string;
  };
  isArabic: boolean;
};

function getScoreTone(score: number) {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";

  return "risk";
}

function getHealthState(
  score: number,
  isArabic: boolean
) {
  if (score >= 80) {
    return {
      label: isArabic
        ? "وضع صحي عام قوي"
        : "Strong overall position",
      description: isArabic
        ? "تبدو مؤشراتك الصحية الحالية قوية بشكل عام. استمر في متابعة الأولوية المحددة في هذا التحليل."
        : "Your current health signals appear generally strong. Continue monitoring the priority highlighted in this analysis.",
    };
  }

  if (score >= 60) {
    return {
      label: isArabic
        ? "وضع مستقر مع مجالات للتحسين"
        : "Stable with areas to improve",
      description: isArabic
        ? "تبدو صورتك الصحية العامة مستقرة نسبيًا، مع وجود مؤشرات محددة تستحق المتابعة المركزة."
        : "Your overall picture appears reasonably stable, with specific signals that deserve focused follow-up.",
    };
  }

  return {
    label: isArabic
      ? "يحتاج إلى اهتمام مركز"
      : "Needs focused attention",
    description: isArabic
      ? "حدد هذا التحليل مؤشرات صحية تحتاج إلى مراجعة دقيقة ومتابعة الخطوة التالية الموصى بها."
      : "This analysis identified health signals that should be reviewed carefully and followed with the recommended next step.",
  };
}

export default function ExecutiveSummaryCard({
  summary,
  isArabic,
}: ExecutiveSummaryCardProps) {
  const scoreTone = getScoreTone(summary.currentScore);
  const forecastTone = getScoreTone(summary.forecastScore);
  const confidenceTone = getScoreTone(summary.confidenceScore);
  const healthState = getHealthState(
    summary.currentScore,
    isArabic
  );

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  return (
    <section
      className="ohCard"
      aria-labelledby="current-health-summary-title"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
      style={{
        overflow: "hidden",
        padding: 0,
      }}
    >
      <div
        style={{
          padding: "28px",
          background:
            "linear-gradient(135deg, rgba(10, 77, 104, 0.08), rgba(36, 160, 148, 0.04))",
          borderBottom: "1px solid rgba(15, 78, 95, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 520px" }}>
            <p className="ohMetricLabel">
              {text(
                "Personal health intelligence",
                "الذكاء الصحي الشخصي"
              )}
            </p>

            <h2
              id="current-health-summary-title"
              className="ohCardTitle"
              style={{
                marginTop: "8px",
                marginBottom: "12px",
                fontSize: "clamp(1.55rem, 3vw, 2.2rem)",
              }}
            >
              {text(
                "Your Health Today",
                "صحتك اليوم"
              )}
            </h2>

            <strong
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "1.08rem",
                lineHeight: 1.5,
              }}
            >
              {healthState.label}
            </strong>

            <p
              style={{
                maxWidth: "760px",
                margin: 0,
                lineHeight: 1.75,
                color: "var(--oh-text-muted, #52656d)",
              }}
            >
              {healthState.description}
            </p>
          </div>

          <div
            style={{
              minWidth: "132px",
              padding: "18px 20px",
              borderRadius: "18px",
              background: "rgba(255, 255, 255, 0.86)",
              border: "1px solid rgba(15, 78, 95, 0.12)",
              textAlign: "center",
            }}
          >
            <span
              className="ohMetricLabel"
              style={{
                display: "block",
                marginBottom: "6px",
              }}
            >
              {text(
                "Current score",
                "الدرجة الحالية"
              )}
            </span>

            <span
              className={`ohStatusBadge ${scoreTone}`}
              style={{
                display: "inline-flex",
                justifyContent: "center",
                minWidth: "82px",
                fontSize: "1rem",
              }}
            >
              {summary.currentScore}/100
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: "28px" }}>
        <div
          className="ohMetricGrid"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text(
                "Highest priority",
                "الأولوية الأعلى"
              )}
            </span>

            <strong
              style={{
                display: "block",
                marginTop: "10px",
                lineHeight: 1.5,
              }}
            >
              {summary.prioritySystem}
            </strong>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text(
                "Health trend",
                "الاتجاه الصحي"
              )}
            </span>

            <strong
              style={{
                display: "block",
                marginTop: "10px",
                lineHeight: 1.5,
              }}
            >
              {summary.trend}
            </strong>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text(
                "90-day outlook",
                "توقعات 90 يومًا"
              )}
            </span>

            <span
              className={`ohStatusBadge ${forecastTone}`}
              style={{
                display: "inline-flex",
                marginTop: "10px",
              }}
            >
              {summary.forecastScore}/100
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text(
                "Analysis confidence",
                "ثقة التحليل"
              )}
            </span>

            <span
              className={`ohStatusBadge ${confidenceTone}`}
              style={{
                display: "inline-flex",
                marginTop: "10px",
              }}
            >
              {summary.confidenceLevel}
            </span>

            <span
              className="ohMetricHint"
              style={{
                display: "block",
                marginTop: "8px",
              }}
            >
              {isArabic
                ? `درجة الثقة ${summary.confidenceScore}/100`
                : `${summary.confidenceScore}/100 confidence`}
            </span>
          </article>
        </div>

        <div className="ohDivider" />

        <div
          className="ohTrustNotice"
          style={{
            alignItems: "flex-start",
            padding: "20px",
          }}
        >
          <span
            aria-hidden="true"
            style={{ fontSize: "1.25rem" }}
          >
            🎯
          </span>

          <div>
            <strong>
              {text(
                "Most important next step",
                "أهم خطوة تالية"
              )}
            </strong>

            <p
              style={{
                margin: "7px 0 0",
                lineHeight: 1.7,
              }}
            >
              {summary.nextBestAction}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
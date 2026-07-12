import {
  TrendDirection,
  TrendQuality,
  TrendStability,
} from "@/lib/health-intelligence/engines/trend.engine";
import { TrendSummaryData } from "@/lib/health-intelligence/engines/trend-summary.engine";

type HealthDirectionCardProps = {
  summary: TrendSummaryData;
  confidence?: number;
  isArabic?: boolean;
};

const directionIcon: Record<TrendDirection, string> = {
  improving: "↗",
  worsening: "↘",
  stable: "→",
  "insufficient-data": "•",
};

function getDirectionLabel(
  direction: TrendDirection,
  isArabic: boolean
) {
  switch (direction) {
    case "improving":
      return isArabic ? "يتحسن" : "Improving";
    case "worsening":
      return isArabic ? "يتراجع" : "Worsening";
    case "stable":
      return isArabic ? "مستقر" : "Stable";
    default:
      return isArabic ? "بيانات غير كافية" : "Insufficient data";
  }
}

function getQualityLabel(
  quality: TrendQuality,
  isArabic: boolean
) {
  const labels: Record<TrendQuality, [string, string]> = {
    "strong-improvement": ["Strong improvement", "تحسن قوي"],
    "moderate-improvement": ["Moderate improvement", "تحسن متوسط"],
    "weak-improvement": ["Early improvement", "تحسن أولي"],
    "strong-decline": ["Strong decline", "تراجع قوي"],
    "moderate-decline": ["Moderate decline", "تراجع متوسط"],
    "weak-decline": ["Mild decline", "تراجع بسيط"],
    plateau: ["Plateau", "ثبات دون تغير"],
    stable: ["Stable", "مستقر"],
    "insufficient-data": ["Not available", "غير متاح"],
  };

  return isArabic
    ? labels[quality][1]
    : labels[quality][0];
}

function getStabilityLabel(
  stability: TrendStability,
  isArabic: boolean
) {
  switch (stability) {
    case "consistent":
      return isArabic ? "اتجاه منتظم" : "Consistent";
    case "variable":
      return isArabic ? "اتجاه متغير" : "Variable";
    case "unstable":
      return isArabic ? "اتجاه متذبذب" : "Unstable";
    default:
      return isArabic ? "غير متاح" : "Not available";
  }
}

function getArabicHeadline(summary: TrendSummaryData) {
  if (summary.direction === "insufficient-data") {
    return "نحتاج إلى سجل صحي أكبر لحساب اتجاه صحتك";
  }

  if (summary.plateau || summary.quality === "plateau") {
    return "وصل اتجاه صحتك المسجل إلى مرحلة ثبات";
  }

  switch (summary.quality) {
    case "strong-improvement":
      return "اتجاه صحتك المسجل يتحسن بشكل قوي";
    case "moderate-improvement":
      return "اتجاه صحتك المسجل يتحسن";
    case "weak-improvement":
      return "اتجاه صحتك يظهر تحسنًا أوليًا";
    case "strong-decline":
      return "اتجاه صحتك المسجل يحتاج إلى اهتمام قريب";
    case "moderate-decline":
      return "اتجاه صحتك يحتاج إلى متابعة أقرب";
    case "weak-decline":
      return "اتجاه صحتك يظهر تراجعًا بسيطًا";
    default:
      return "اتجاه صحتك المسجل مستقر";
  }
}

function getArabicPeriodLabel(periodDays: number | null) {
  if (periodDays === null) return "لا توجد بيانات تاريخية كافية";
  if (periodDays === 0) return "مقارنة حديثة";
  if (periodDays === 1) return "خلال اليوم الأخير";

  return `خلال آخر ${periodDays} يومًا`;
}

export default function HealthDirectionCard({
  summary,
  confidence,
  isArabic = false,
}: HealthDirectionCardProps) {
  const headline = isArabic
    ? getArabicHeadline(summary)
    : summary.headline;

  const periodLabel = isArabic
    ? getArabicPeriodLabel(summary.periodDays)
    : summary.periodLabel;

  return (
    <section className="healthDirectionCard">
      <div className="healthDirectionHeader">
        <div>
          <span className="healthDirectionKicker">
            {isArabic ? "اتجاه الصحة" : "Health Direction"}
          </span>

          <h2 className="healthDirectionTitle">
            {headline}
          </h2>

          <p className="healthDirectionDescription">
            {summary.summary}
          </p>
        </div>

        <div
          className={`healthDirectionStatus ${summary.direction}`}
        >
          <span aria-hidden="true">
            {directionIcon[summary.direction]}
          </span>

          <strong>
            {getDirectionLabel(summary.direction, isArabic)}
          </strong>
        </div>
      </div>

      <div className="healthDirectionMetrics">
        <article>
          <span>
            {isArabic ? "التغير الإجمالي" : "Total change"}
          </span>

          <strong>{summary.totalChangeLabel}</strong>

          <small>{periodLabel}</small>
        </article>

        <article>
          <span>
            {isArabic ? "سرعة التغير" : "Velocity"}
          </span>

          <strong>
            {summary.direction === "insufficient-data"
              ? "—"
              : summary.velocityPerDay}
          </strong>

          <small>
            {isArabic ? "نقطة يوميًا" : "points per day"}
          </small>
        </article>

        <article>
          <span>
            {isArabic ? "جودة الاتجاه" : "Trend quality"}
          </span>

          <strong>
            {getQualityLabel(summary.quality, isArabic)}
          </strong>

          <small>
            {summary.plateau
              ? isArabic
                ? "تم اكتشاف حالة ثبات"
                : "Plateau detected"
              : getStabilityLabel(summary.stability, isArabic)}
          </small>
        </article>

        <article>
          <span>
            {isArabic ? "ثقة التحليل" : "Confidence"}
          </span>

          <strong>
            {typeof confidence === "number"
              ? `${confidence}%`
              : "—"}
          </strong>

          <small>
            {isArabic
              ? "تعتمد على عدد القياسات والفترة"
              : "Based on history and consistency"}
          </small>
        </article>
      </div>

      {summary.organSignals.length > 0 && (
        <div className="healthDirectionSignals">
          <div className="healthDirectionSignalsHeader">
            <strong>
              {isArabic
                ? "اتجاهات المناطق الصحية"
                : "Health area trends"}
            </strong>

            <span>
              {summary.improvingCount}{" "}
              {isArabic ? "تتحسن" : "improving"} ·{" "}
              {summary.worseningCount}{" "}
              {isArabic ? "تحتاج متابعة" : "need follow-up"} ·{" "}
              {summary.stableCount}{" "}
              {isArabic ? "مستقرة" : "stable"}
            </span>
          </div>

          <div className="healthDirectionSignalList">
            {summary.organSignals.map((signal) => (
              <article
                key={signal.organ}
                className={`healthDirectionSignal ${signal.direction}`}
              >
                <div>
                  <strong>{signal.organ}</strong>

                  <span>
                    {getQualityLabel(signal.quality, isArabic)}
                  </span>
                </div>

                <div className="healthDirectionSignalValue">
                  <strong>
                    {directionIcon[signal.direction]}{" "}
                    {signal.totalChange > 0
                      ? `+${signal.totalChange}`
                      : signal.totalChange}
                  </strong>

                  <span>
                    {signal.latestScore}/100
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
import type { CSSProperties } from "react";
import type { PassportModuleResult } from "@/lib/modules/passport";

type HistoryOverviewCardProps = {
  overallScore: number;
  progressDataAvailable: boolean;
  passport: PassportModuleResult | null;
  assessmentCount: number;
  checkInCount: number;
  reportCount: number;
  analysisCount: number;
  isArabic: boolean;
};

function getScoreStatus(
  score: number,
  isArabic: boolean
) {
  if (score >= 80) {
    return isArabic ? "قوي" : "Strong";
  }

  if (score >= 60) {
    return isArabic ? "مستقر" : "Stable";
  }

  if (score >= 40) {
    return isArabic
      ? "يحتاج انتباه"
      : "Needs Attention";
  }

  return isArabic
    ? "يحتاج تعافي"
    : "Recovery Needed";
}

function getTone(score: number) {
  if (score >= 80) return "good";
  if (score >= 60) return "moderate";

  return "risk";
}

export default function HistoryOverviewCard({
  overallScore,
  progressDataAvailable,
  passport,
  assessmentCount,
  checkInCount,
  reportCount,
  analysisCount,
  isArabic,
}: HistoryOverviewCardProps) {
  const text = (
    english: string,
    arabic: string
  ) => (isArabic ? arabic : english);

  const scoreRingStyle = {
    "--score": Math.max(
      0,
      Math.min(100, overallScore)
    ),
  } as CSSProperties;

  const hasOfficialProgress =
    passport !== null &&
    passport.status === "ready";

  return (
    <section className="ohStack">
      <article className="ohCard">
        <div className="ohCardHeader">
          <div>
            <p className="ohMetricLabel">
              {text(
                "Overall Progress Score",
                "مؤشر التقدم العام"
              )}
            </p>

            <h2
              className="ohCardTitle"
              style={{ marginTop: "8px" }}
            >
              {progressDataAvailable
                ? getScoreStatus(
                    overallScore,
                    isArabic
                  )
                : text(
                    "No Data Yet",
                    "لا توجد بيانات بعد"
                  )}
            </h2>
          </div>

          <span
            className={`ohStatusBadge ${
              progressDataAvailable
                ? getTone(overallScore)
                : "neutral"
            }`}
          >
            {progressDataAvailable
              ? `${overallScore}/100`
              : text(
                  "Pending",
                  "بانتظار"
                )}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            placeItems: "center",
            margin: "18px 0",
          }}
        >
          <div
            className="ohScoreRing"
            style={scoreRingStyle}
          >
            <div>
              <strong>
                {progressDataAvailable
                  ? overallScore
                  : 0}
              </strong>

              <span>
                {text(
                  "progress",
                  "تقدم"
                )}
              </span>
            </div>
          </div>
        </div>

        <p className="ohCardText">
          {hasOfficialProgress
            ? text(
                `This official health score is based on ${passport.data.availableSourceCount} connected health data categories with ${passport.data.dataCompleteness}% data completeness.`,
                `تعتمد النتيجة الصحية الرسمية على ${passport.data.availableSourceCount} فئات بيانات صحية مترابطة مع اكتمال بيانات بنسبة ${passport.data.dataCompleteness}%.`
              )
            : text(
                "This temporary score averages saved assessments and wellness check-ins until the official Health Passport is ready.",
                "يحسب هذا المؤشر المؤقت متوسط التقييمات وCheck-Ins إلى أن يصبح جواز الصحة الرسمي جاهزًا."
              )}
        </p>
      </article>

      <section className="ohMetricGrid">
        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Assessments",
              "التقييمات"
            )}
          </span>

          <span className="ohMetricValue">
            {assessmentCount}
          </span>

          <span className="ohMetricHint">
            {text(
              hasOfficialProgress
                ? "Connected to your official Health Passport"
                : "Saved assessment records",
              hasOfficialProgress
                ? "مرتبطة بجواز الصحة الرسمي"
                : "سجلات تقييم محفوظة"
            )}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            Check-Ins
          </span>

          <span className="ohMetricValue">
            {checkInCount}
          </span>

          <span className="ohMetricHint">
            {text(
              hasOfficialProgress
                ? "Included in your health timeline"
                : "Wellness updates saved",
              hasOfficialProgress
                ? "مدرجة في المسار الصحي"
                : "تحديثات عافية محفوظة"
            )}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Reports",
              "التقارير"
            )}
          </span>

          <span className="ohMetricValue">
            {reportCount}
          </span>

          <span className="ohMetricHint">
            {text(
              "Connected medical reports",
              "تقارير طبية مترابطة"
            )}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Saved Analysis",
              "التحليل الصحي المحفوظ"
            )}
          </span>

          <span className="ohMetricValue">
            {analysisCount}
          </span>

          <span className="ohMetricHint">
            {text(
              hasOfficialProgress
                ? "Connected intelligence results"
                : "Connected to your reports",
              hasOfficialProgress
                ? "نتائج ذكاء صحي مترابطة"
                : "مرتبطة بتقاريرك"
            )}
          </span>
        </article>
      </section>
    </section>
  );
}
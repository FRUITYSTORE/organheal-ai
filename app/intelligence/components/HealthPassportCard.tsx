import type { HealthPassportData } from "@/lib/health-intelligence/engines/health-passport.engine";

type HealthPassportCardProps = {
  passport: HealthPassportData;
  confidence: number;
  isArabic?: boolean;
};

function getScoreTone(score: number) {
  if (score >= 75) return "good";
  if (score >= 50) return "moderate";
  return "risk";
}

function localizeOrgan(
  value: string | null,
  isArabic: boolean
) {
  if (!value) {
    return isArabic ? "غير متاح" : "N/A";
  }

  if (!isArabic) {
    return value;
  }

  const organNames: Record<string, string> = {
    Heart: "القلب",
    Kidney: "الكلى",
    Liver: "الكبد",
    Lung: "الرئة",
    Brain: "الدماغ",
    Metabolic: "الصحة الأيضية",
  };

  return organNames[value] ?? value;
}

function localizeHealthLevel(
  value: HealthPassportData["healthLevel"],
  isArabic: boolean
) {
  if (!isArabic) {
    return value
      .split("-")
      .map(
        (part) =>
          part.charAt(0).toUpperCase() +
          part.slice(1)
      )
      .join(" ");
  }

  const labels: Record<
    HealthPassportData["healthLevel"],
    string
  > = {
    critical: "حرج",
    "high-concern": "يحتاج متابعة مكثفة",
    moderate: "متوسط",
    stable: "مستقر",
    strong: "قوي",
  };

  return labels[value];
}

function localizeReadiness(
  value: HealthPassportData["readiness"],
  isArabic: boolean
) {
  if (!isArabic) {
    switch (value) {
      case "ready":
        return "Ready";
      case "building":
        return "Building";
      default:
        return "More data needed";
    }
  }

  switch (value) {
    case "ready":
      return "جاهز";
    case "building":
      return "قيد البناء";
    default:
      return "يحتاج بيانات إضافية";
  }
}

function getArabicHealthAgeStatus(value: string) {
  const labels: Record<string, string> = {
    "Younger Health Profile": "ملف صحي أصغر عمرًا",
    "Balanced Health Age": "عمر صحي متوازن",
    "Elevated Health Age": "عمر صحي مرتفع",
    "High Health Age": "عمر صحي مرتفع بشكل ملحوظ",
  };

  return labels[value] ?? value;
}

export default function HealthPassportCard({
  passport,
  confidence,
  isArabic = false,
}: HealthPassportCardProps) {
  const overallTone = getScoreTone(
    passport.overallScore
  );

  const potentialTone = getScoreTone(
    passport.potentialScore
  );

  const text = (english: string, arabic: string) =>
    isArabic ? arabic : english;

  return (
    <section
      className="ohCard"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">
            {text(
              "Health Passport",
              "جواز الصحة"
            )}
          </p>

          <h2
            className="ohCardTitle"
            style={{ marginTop: "8px" }}
          >
            {isArabic
              ? "ملفك الصحي الموحّد"
              : passport.profile}
          </h2>
        </div>

        <span
          className={`ohStatusBadge ${overallTone}`}
        >
          {passport.overallScore}/100
        </span>
      </div>

      <p className="ohCardText">
        {isArabic
          ? `جوازك الصحي ${
              passport.readiness === "ready"
                ? "جاهز"
                : "قيد البناء"
            } ويجمع أهم درجاتك الصحية، منطقة الأولوية، مصادر البيانات، وفرصة التحسن المتوقعة.`
          : passport.summary}
      </p>

      <div
        className="ohMetricGrid"
        style={{ marginTop: "18px" }}
      >
        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Overall Score",
              "النتيجة العامة"
            )}
          </span>

          <span className="ohMetricValue">
            {passport.overallScore}
          </span>

          <span className="ohMetricHint">
            {text(
              "Out of 100",
              "من 100"
            )}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Health Level",
              "المستوى الصحي"
            )}
          </span>

          <span className="ohMetricHint">
            {localizeHealthLevel(
              passport.healthLevel,
              isArabic
            )}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Health Age",
              "العمر الصحي"
            )}
          </span>

          <span className="ohMetricHint">
            {isArabic
              ? getArabicHealthAgeStatus(
                  passport.healthAgeStatus
                )
              : passport.healthAgeStatus}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Priority Area",
              "منطقة الأولوية"
            )}
          </span>

          <span className="ohMetricHint">
            {localizeOrgan(
              passport.priorityArea,
              isArabic
            )}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Potential Score",
              "النتيجة المحتملة"
            )}
          </span>

          <span
            className={`ohStatusBadge ${potentialTone}`}
          >
            {passport.potentialScore}/100
          </span>

          <span className="ohMetricHint">
            {text(
              `Potential gain: +${passport.potentialGain}`,
              `فرصة التحسن: +${passport.potentialGain}`
            )}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Data Readiness",
              "جاهزية البيانات"
            )}
          </span>

          <span className="ohMetricValue">
            {passport.dataCompleteness}%
          </span>

          <span className="ohMetricHint">
            {localizeReadiness(
              passport.readiness,
              isArabic
            )}
          </span>
        </article>
      </div>

      <div className="ohDivider" />

      <div className="ohGrid cols3">
        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Connected Sources",
              "المصادر المتصلة"
            )}
          </span>

          <span className="ohMetricValue">
            {passport.availableSourceCount}
          </span>

          <span className="ohMetricHint">
            {text(
              "Health data categories",
              "فئات بيانات صحية"
            )}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Data Points",
              "نقاط البيانات"
            )}
          </span>

          <span className="ohMetricValue">
            {passport.totalDataPoints}
          </span>

          <span className="ohMetricHint">
            {text(
              "Reviewed in this passport",
              "تمت مراجعتها في الجواز"
            )}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Confidence",
              "مستوى الثقة"
            )}
          </span>

          <span className="ohMetricValue">
            {confidence}%
          </span>

          <span className="ohMetricHint">
            {text(
              "Based on data completeness",
              "استنادًا إلى اكتمال البيانات"
            )}
          </span>
        </article>
      </div>

      <div className="ohDivider" />

      <div className="ohTimeline">
        {passport.sources.map((source) => (
          <div
            key={source.id}
            className="ohTimelineItem"
          >
            <span className="ohTimelineDot" />

            <div>
              <p className="ohTimelineTitle">
                {source.label}
              </p>

              <p className="ohTimelineMeta">
                {source.available
                  ? text(
                      `${source.count} connected data point${
                        source.count === 1 ? "" : "s"
                      }.`,
                      `${source.count} من نقاط البيانات متصلة.`
                    )
                  : text(
                      "No data connected yet.",
                      "لا توجد بيانات متصلة بعد."
                    )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
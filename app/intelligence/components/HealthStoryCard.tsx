type HealthStoryCardProps = {
  story: string;
  isArabic: boolean;
};

function splitStoryIntoStatements(story: string) {
  return story
    .replace(/\r/g, "")
    .split(/(?<=[.!?؟])\s+|\n+/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function isRepeatedSummaryStatement(
  statement: string
) {
  const normalizedStatement =
    statement.toLowerCase();

  const repeatedPatterns = [
    "primary health focus",
    "primary focus area",
    "90-day forecast",
    "forecast confidence",
    "recommended next step",
    "next step is",
    "continue tracking your health data",
    "personalized action plan",
    "الأولوية الصحية",
    "منطقة الأولوية",
    "توقعات 90 يوم",
    "ثقة التوقع",
    "الخطوة التالية الموصى بها",
    "الخطوة التالية هي",
    "استمر في متابعة بياناتك الصحية",
    "خطة العمل الشخصية",
  ];

  return repeatedPatterns.some((pattern) =>
    normalizedStatement.includes(pattern)
  );
}

function getReasoningStatements(
  story: string
) {
  const statements =
    splitStoryIntoStatements(story);

  const reasoningStatements =
    statements.filter(
      (statement) =>
        !isRepeatedSummaryStatement(statement)
    );

  if (reasoningStatements.length > 0) {
    return reasoningStatements.slice(0, 3);
  }

  return statements.slice(0, 2);
}

function getStatementLabel(
  statement: string,
  index: number,
  isArabic: boolean
) {
  const content = statement.toLowerCase();

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  if (
    content.includes("confidence") ||
    content.includes("evidence") ||
    content.includes("supported") ||
    content.includes("ثقة") ||
    content.includes("دليل") ||
    content.includes("أدلة") ||
    content.includes("مدعوم")
  ) {
    return text(
      "Supporting evidence",
      "الأدلة الداعمة"
    );
  }

  if (
    content.includes("marker") ||
    content.includes("lab") ||
    content.includes("signal") ||
    content.includes("result") ||
    content.includes("مؤشر") ||
    content.includes("مختبر") ||
    content.includes("تحليل") ||
    content.includes("إشارة") ||
    content.includes("نتيجة")
  ) {
    return text(
      "Health signals",
      "المؤشرات الصحية"
    );
  }

  if (
    content.includes("risk") ||
    content.includes("likelihood") ||
    content.includes("probability") ||
    content.includes("خطر") ||
    content.includes("مخاطر") ||
    content.includes("احتمال")
  ) {
    return text(
      "Risk direction",
      "اتجاه المخاطر"
    );
  }

  if (
    content.includes("trend") ||
    content.includes("momentum") ||
    content.includes("over time") ||
    content.includes("longitudinal") ||
    content.includes("اتجاه") ||
    content.includes("تغير") ||
    content.includes("مع مرور الوقت") ||
    content.includes("طويل المدى")
  ) {
    return text(
      "Health trend",
      "الاتجاه الصحي"
    );
  }

  if (
    content.includes("forecast") ||
    content.includes("future") ||
    content.includes("next") ||
    content.includes("توقع") ||
    content.includes("مستقبل") ||
    content.includes("التالي")
  ) {
    return text(
      "Future outlook",
      "التوقعات المستقبلية"
    );
  }

  if (
    content.includes("because") ||
    content.includes("therefore") ||
    content.includes("based on") ||
    content.includes("لأن") ||
    content.includes("لذلك") ||
    content.includes("بناءً على")
  ) {
    return text(
      "Clinical context",
      "السياق السريري"
    );
  }

  return index === 0
    ? text(
        "Key observation",
        "الملاحظة الرئيسية"
      )
    : text(
        "Additional context",
        "سياق إضافي"
      );
}

export default function HealthStoryCard({
  story,
  isArabic,
}: HealthStoryCardProps) {
  const reasoningStatements =
    getReasoningStatements(story);

  if (reasoningStatements.length === 0) {
    return null;
  }

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  return (
    <section
      className="ohCard"
      aria-labelledby="health-reasoning-title"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">
            {text(
              "OrganHeal AI interpretation",
              "تفسير OrganHeal AI"
            )}
          </p>

          <h2
            id="health-reasoning-title"
            className="ohCardTitle"
            style={{ marginTop: "8px" }}
          >
            {text(
              "Why OrganHeal reached this view",
              "لماذا وصل OrganHeal إلى هذا التفسير"
            )}
          </h2>
        </div>

        <span className="ohStatusBadge info">
          {text("Reasoning", "الاستدلال")}
        </span>
      </div>

      <p
        style={{
          maxWidth: "820px",
          margin: "12px 0 0",
          lineHeight: 1.75,
          color:
            "var(--oh-text-muted, #52656d)",
        }}
      >
        {text(
          "This explanation highlights the health signals and patterns that influenced the summary above, without repeating your priority, forecast, or recommended action.",
          "يوضح هذا القسم المؤشرات والأنماط الصحية التي أثرت في الملخص أعلاه، دون تكرار الأولوية أو التوقعات أو الخطوة الموصى بها."
        )}
      </p>

      <div className="ohDivider" />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "14px",
        }}
      >
        {reasoningStatements.map(
          (statement, index) => (
            <article
              key={`${statement}-${index}`}
              className="ohMetricCard"
              style={{
                minHeight: "150px",
                padding: "20px",
              }}
            >
              <span className="ohMetricLabel">
                {getStatementLabel(
                  statement,
                  index,
                  isArabic
                )}
              </span>

              <p
                style={{
                  margin: "12px 0 0",
                  lineHeight: 1.75,
                  color:
                    "var(--oh-text, #17313a)",
                }}
              >
                {statement}
              </p>
            </article>
          )
        )}
      </div>

      <div
        className="ohTrustNotice"
        style={{
          marginTop: "18px",
          alignItems: "flex-start",
        }}
      >
        <span aria-hidden="true">🔎</span>

        <div>
          <strong>
            {text(
              "How to read this explanation",
              "كيف تقرأ هذا التفسير"
            )}
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              lineHeight: 1.7,
            }}
          >
            {text(
              "These statements explain the reasoning behind the current interpretation. They are educational insights and should be reviewed alongside your original report and professional medical advice.",
              "توضح هذه العبارات الاستدلال وراء التفسير الحالي. وهي معلومات تثقيفية يجب مراجعتها إلى جانب التقرير الأصلي والمشورة الطبية المتخصصة."
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
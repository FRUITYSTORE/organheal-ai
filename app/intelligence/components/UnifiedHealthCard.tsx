type UnifiedHealthCardProps = {
  unifiedHealth: unknown;
  isArabic: boolean;
};

type UnifiedHealthSignal = {
  id?: string | number;
  title?: string;
  name?: string;
  category?: string;
  organ?: string;
  system?: string;
  status?: string;
  riskLevel?: string;
  priority?: string;
  insight?: string;
  summary?: string;
  description?: string;
  interpretation?: string;
  recommendation?: string;
  action?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(value: unknown): string {
  if (typeof value === "string") return value.trim();

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function normalizeUnifiedHealthSignals(
  unifiedHealth: unknown
): UnifiedHealthSignal[] {
  if (Array.isArray(unifiedHealth)) {
    return unifiedHealth.filter(isRecord).map((item, index) => ({
      id: getText(item.id) || index,
      title: getText(item.title),
      name: getText(item.name),
      category: getText(item.category),
      organ: getText(item.organ),
      system: getText(item.system),
      status: getText(item.status),
      riskLevel: getText(item.riskLevel),
      priority: getText(item.priority),
      insight: getText(item.insight),
      summary: getText(item.summary),
      description: getText(item.description),
      interpretation: getText(item.interpretation),
      recommendation: getText(item.recommendation),
      action: getText(item.action),
    }));
  }

  if (!isRecord(unifiedHealth)) return [];

  const possibleItems =
    unifiedHealth.signals ||
    unifiedHealth.items ||
    unifiedHealth.insights ||
    unifiedHealth.healthSignals ||
    unifiedHealth.unifiedSignals ||
    unifiedHealth.priorities ||
    unifiedHealth.patterns ||
    unifiedHealth.recommendations ||
    unifiedHealth.actionItems;

  if (!Array.isArray(possibleItems)) return [];

  return possibleItems.filter(isRecord).map((item, index) => ({
    id: getText(item.id) || index,
    title: getText(item.title),
    name: getText(item.name),
    category: getText(item.category),
    organ: getText(item.organ),
    system: getText(item.system),
    status: getText(item.status),
    riskLevel: getText(item.riskLevel),
    priority: getText(item.priority),
    insight: getText(item.insight),
    summary: getText(item.summary),
    description: getText(item.description),
    interpretation: getText(item.interpretation),
    recommendation: getText(item.recommendation),
    action: getText(item.action),
  }));
}

function normalizeSeverity(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (normalized === "high") return "High";

  if (normalized === "moderate" || normalized === "medium") {
    return "Moderate";
  }

  if (normalized === "low") return "Low";

  return value.trim();
}

function getSeverityClass(value: string) {
  const severity = normalizeSeverity(value);

  if (severity === "High") {
    return "high";
  }

  if (severity === "Moderate") {
    return "moderate";
  }

  if (severity === "Low") {
    return "low";
  }

  return "neutral";
}

export default function UnifiedHealthCard({
  unifiedHealth,
  isArabic,
}: UnifiedHealthCardProps) {
  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }
  const signals = normalizeUnifiedHealthSignals(unifiedHealth).slice(0, 3);

  if (signals.length === 0) {
    return null;
  }

  return (
    <section
  className="unifiedHealthPriorities"
  dir={isArabic ? "rtl" : "ltr"}
  lang={isArabic ? "ar" : "en"}
>
      <style>{`
        .unifiedHealthPriorities,
        .unifiedHealthPriorities * {
          box-sizing: border-box;
        }

        .unifiedHealthPriorities {
          padding: 24px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          background: #ffffff;
        }

        .unifiedHealthHeader {
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .unifiedHealthEyebrow {
          margin: 0;
          color: #0f766e;
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .unifiedHealthTitle {
          margin: 7px 0 0;
          color: #0f172a;
          font-size: clamp(1.35rem, 2vw, 1.75rem);
          font-weight: 950;
          line-height: 1.2;
          letter-spacing: -0.025em;
        }

        .unifiedHealthLead {
          max-width: 760px;
          margin: 9px 0 0;
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 650;
          line-height: 1.65;
        }

        .unifiedPriorityGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 20px;
        }

        .unifiedPriorityCard {
          display: flex;
          min-width: 0;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 20px;
          background:
            linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.045);
        }

        .unifiedPriorityHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 17px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        }

        .unifiedPriorityIdentity {
          display: flex;
          min-width: 0;
          gap: 11px;
          align-items: flex-start;
        }

        .unifiedPriorityNumber {
          display: grid;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          place-items: center;
          border-radius: 11px;
          background: #0f172a;
          color: #ffffff;
          font-size: 0.76rem;
          font-weight: 950;
        }

        .unifiedPriorityLabel {
          margin: 0;
          color: #64748b;
          font-size: 0.64rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .unifiedPriorityTitle {
          margin: 5px 0 0;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 950;
          line-height: 1.3;
        }

        .unifiedPrioritySeverity {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          min-height: 26px;
          padding: 0 9px;
          border: 1px solid;
          border-radius: 999px;
          font-size: 0.67rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .unifiedPrioritySeverity.high {
          border-color: rgba(220, 38, 38, 0.18);
          background: #fef2f2;
          color: #b91c1c;
        }

        .unifiedPrioritySeverity.moderate {
          border-color: rgba(217, 119, 6, 0.18);
          background: #fffbeb;
          color: #b45309;
        }

        .unifiedPrioritySeverity.low {
          border-color: rgba(5, 150, 105, 0.18);
          background: #ecfdf5;
          color: #047857;
        }

        .unifiedPrioritySeverity.neutral {
          border-color: rgba(37, 99, 235, 0.16);
          background: #eff6ff;
          color: #1d4ed8;
        }

        .unifiedPriorityBody {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 15px;
          padding: 17px;
        }

        .unifiedPrioritySectionLabel {
          margin: 0;
          color: #64748b;
          font-size: 0.66rem;
          font-weight: 900;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .unifiedPriorityExplanation {
          margin: 6px 0 0;
          color: #475569;
          font-size: 0.84rem;
          line-height: 1.65;
        }

        .unifiedPriorityRecommendation {
          margin-top: auto;
          padding: 13px;
          border: 1px solid rgba(15, 118, 110, 0.13);
          border-radius: 14px;
          background: #f0fdfa;
        }

        .unifiedPriorityRecommendation .unifiedPrioritySectionLabel {
          color: #0f766e;
        }

        .unifiedPriorityRecommendation p:last-child {
          margin: 6px 0 0;
          color: #334155;
          font-size: 0.8rem;
          line-height: 1.6;
        }

        .unifiedHealthDisclaimer {
          margin: 18px 0 0;
          color: #64748b;
          font-size: 0.72rem;
          line-height: 1.55;
        }

        @media (max-width: 980px) {
          .unifiedPriorityGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .unifiedHealthPriorities {
            padding: 18px;
            border-radius: 20px;
          }

          .unifiedPriorityHeader {
            flex-direction: column;
          }
        }
      `}</style>

      <header className="unifiedHealthHeader">
        <p className="unifiedHealthEyebrow">
  {text(
    "Unified Health Intelligence",
    "الذكاء الصحي الموحد"
  )}
</p>

<h2 className="unifiedHealthTitle">
  {text(
    "Your highest health priorities",
    "أهم أولوياتك الصحية"
  )}
</h2>

<p className="unifiedHealthLead">
  {text(
    "These priorities combine the available report findings and health information to highlight where your attention is most valuable.",
    "تجمع هذه الأولويات بين نتائج التقرير والمعلومات الصحية المتاحة لإبراز الجوانب التي تستحق أكبر قدر من الاهتمام."
  )}
</p>
      </header>

      <div className="unifiedPriorityGrid">
        {signals.map((item, index) => {
          const title =
            item.title ||
            item.name ||
            item.organ ||
            item.system ||
            item.category ||
            `Health Priority ${index + 1}`;

          const explanation =
            item.insight ||
            item.interpretation ||
            item.summary ||
            item.description;

          const recommendedFocus =
            item.recommendation || item.action;

          const severity =
            normalizeSeverity(
              item.riskLevel ||
                item.status ||
                item.priority ||
                ""
            ) || "Priority";

          return (
            <article
              className="unifiedPriorityCard"
              key={item.id ?? `${title}-${index}`}
            >
              <div className="unifiedPriorityHeader">
                <div className="unifiedPriorityIdentity">
                  <span
                    className="unifiedPriorityNumber"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>

                  <div>
                    <p className="unifiedPriorityLabel">
                      {text(
  `Priority ${index + 1}`,
  `الأولوية ${index + 1}`
)}
                    </p>

                    <h3 className="unifiedPriorityTitle">
                      {title}
                    </h3>
                  </div>
                </div>

                <span
                  className={`unifiedPrioritySeverity ${getSeverityClass(
                    severity
                  )}`}
                >
                  severity === "Priority"
  ? text(
      "Priority area",
      "منطقة أولوية"
    )
  : text(
      `${severity} priority`,
      `أولوية ${severity}`
    )
                </span>
              </div>

              <div className="unifiedPriorityBody">
                {explanation && (
                  <div>
                    <p className="unifiedPrioritySectionLabel">
                      {text(
  "Why this matters",
  "لماذا هذا مهم"
)}
                    </p>

                    <p className="unifiedPriorityExplanation">
                      {explanation}
                    </p>
                  </div>
                )}

                {recommendedFocus && (
                  <div className="unifiedPriorityRecommendation">
                    <p className="unifiedPrioritySectionLabel">
                      {text(
  "Recommended focus",
  "التركيز الموصى به"
)}
                    </p>

                    <p>{recommendedFocus}</p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="unifiedHealthDisclaimer">
        {text(
  "These priorities are educational interpretations of the available information and should be reviewed alongside the original report and professional medical advice.",
  "تمثل هذه الأولويات تفسيرًا تثقيفيًا للمعلومات المتاحة، ويجب مراجعتها مع التقرير الأصلي والمشورة الطبية المتخصصة."
)}
        information and should be reviewed alongside the original report and
        professional medical advice.
      </p>
    </section>
  );
}
type ActionPlanCardProps = {
  actionPlan: {
    thisWeek: string[];
    thisMonth: string[];
    next90Days: string[];
  };
  isArabic: boolean;
};

function PlanSection({
  title,
  badge,
  items,
  number,
  isArabic,
}: {
  title: string;
  badge: string;
  items: string[];
  number: string;
  isArabic: boolean;
}) {
  const actionCount = isArabic
    ? `${items.length} ${
        items.length === 1 ? "إجراء" : "إجراءات"
      }`
    : `${items.length} ${
        items.length === 1 ? "action" : "actions"
      }`;

  return (
    <details className="actionPreviewCard">
      <summary className="actionPreviewSummary">
        <div className="actionPreviewIdentity">
          <span
            className="actionPreviewNumber"
            aria-hidden="true"
          >
            {number}
          </span>

          <div>
            <span className="actionPreviewBadge">
              {badge}
            </span>

            <h3 className="actionPreviewTitle">
              {title}
            </h3>

            <span className="actionPreviewCount">
              {actionCount}
            </span>
          </div>
        </div>

        <span
          className="actionPreviewChevron"
          aria-hidden="true"
        >
          ↓
        </span>
      </summary>

      <div className="actionPreviewBody">
        {items.length > 0 ? (
          <div className="actionPreviewList">
            {items.map((item, index) => (
              <div
                className="actionPreviewItem"
                key={`${title}-${index}`}
              >
                <span
                  className="actionPreviewDot"
                  aria-hidden="true"
                />

                <p>{item}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="actionPreviewEmpty">
            {isArabic
              ? "لا توجد إجراءات محددة متاحة لهذه الفترة."
              : "No specific actions are available for this period."}
          </p>
        )}
      </div>
    </details>
  );
}

export default function ActionPlanCard({
  actionPlan,
  isArabic,
}: ActionPlanCardProps) {
  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  return (
    <section
      className="actionPlanPreview"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .actionPlanPreview,
        .actionPlanPreview * {
          box-sizing: border-box;
        }

        .actionPlanPreview {
          padding: 24px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          background: #ffffff;
        }

        .actionPreviewHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .actionPreviewEyebrow {
          margin: 0;
          color: #2563eb;
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .actionPreviewHeading {
          margin: 7px 0 0;
          color: #0f172a;
          font-size: clamp(1.3rem, 2vw, 1.7rem);
          font-weight: 950;
          line-height: 1.25;
          letter-spacing: -0.025em;
        }

        .actionPreviewDescription {
          max-width: 760px;
          margin: 9px 0 0;
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.65;
        }

        .actionPreviewStatus {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          min-height: 30px;
          padding: 0 11px;
          border: 1px solid rgba(37, 99, 235, 0.18);
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 0.7rem;
          font-weight: 900;
        }

        .actionPreviewGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 20px;
        }

        .actionPreviewCard {
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 18px;
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #f8fafc 100%
          );
        }

        .actionPreviewCard[open] {
          border-color: rgba(37, 99, 235, 0.25);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
        }

        .actionPreviewSummary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          min-height: 100px;
          padding: 16px;
          cursor: pointer;
          list-style: none;
        }

        .actionPreviewSummary::-webkit-details-marker {
          display: none;
        }

        .actionPreviewSummary:hover {
          background: rgba(239, 246, 255, 0.55);
        }

        .actionPreviewIdentity {
          display: flex;
          min-width: 0;
          align-items: flex-start;
          gap: 12px;
        }

        .actionPreviewNumber {
          display: grid;
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          place-items: center;
          border-radius: 12px;
          background: #0f172a;
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 950;
        }

        .actionPreviewBadge {
          color: #64748b;
          font-size: 0.64rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .actionPreviewTitle {
          margin: 5px 0 0;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 950;
          line-height: 1.3;
        }

        .actionPreviewCount {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 0.72rem;
          font-weight: 750;
        }

        .actionPreviewChevron {
          display: grid;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          place-items: center;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 0.9rem;
          font-weight: 950;
          transition: transform 180ms ease;
        }

        .actionPreviewCard[open]
          .actionPreviewChevron {
          transform: rotate(180deg);
          background: #eff6ff;
          color: #1d4ed8;
        }

        .actionPreviewBody {
          padding: 15px 16px 17px;
          border-top: 1px solid rgba(15, 23, 42, 0.07);
        }

        .actionPreviewList {
          display: grid;
          gap: 11px;
        }

        .actionPreviewItem {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 9px;
          align-items: flex-start;
        }

        .actionPreviewDot {
          width: 7px;
          height: 7px;
          margin-top: 8px;
          border-radius: 999px;
          background: #2563eb;
        }

        .actionPreviewItem p,
        .actionPreviewEmpty {
          margin: 0;
          color: #475569;
          font-size: 0.83rem;
          line-height: 1.65;
        }

        @media (max-width: 900px) {
          .actionPreviewGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .actionPlanPreview {
            padding: 18px;
          }

          .actionPreviewHeader {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="actionPreviewHeader">
        <div>
          <p className="actionPreviewEyebrow">
            {text(
              "Personal Action Plan",
              "خطة العمل الشخصية"
            )}
          </p>

          <h2 className="actionPreviewHeading">
            {text(
              "Your next actions at a glance",
              "خطواتك التالية بنظرة سريعة"
            )}
          </h2>

          <p className="actionPreviewDescription">
            {text(
              "Review your immediate, monthly, and longer-term direction. Open a period when you need the full action list.",
              "راجع خطواتك الفورية والشهرية وطويلة المدى. افتح أي فترة لعرض قائمة الإجراءات كاملة."
            )}
          </p>
        </div>

        <span className="actionPreviewStatus">
          {text(
            "Actionable",
            "قابلة للتنفيذ"
          )}
        </span>
      </div>

      <div className="actionPreviewGrid">
        <PlanSection
          number="01"
          title={text(
            "This Week",
            "هذا الأسبوع"
          )}
          badge={text(
            "Immediate focus",
            "التركيز الفوري"
          )}
          items={actionPlan.thisWeek}
          isArabic={isArabic}
        />

        <PlanSection
          number="02"
          title={text(
            "This Month",
            "هذا الشهر"
          )}
          badge={text(
            "Build consistency",
            "بناء الاستمرارية"
          )}
          items={actionPlan.thisMonth}
          isArabic={isArabic}
        />

        <PlanSection
          number="03"
          title={text(
            "Next 90 Days",
            "الـ90 يومًا القادمة"
          )}
          badge={text(
            "Longer direction",
            "الاتجاه طويل المدى"
          )}
          items={actionPlan.next90Days}
          isArabic={isArabic}
        />
      </div>
    </section>
  );
}
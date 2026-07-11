"use client";

import { useState } from "react";

type HealthScoreContributor = {
  id:
    | "assessment"
    | "checkin"
    | "reports"
    | "analysis"
    | "history"
    | "findings";
  label: string;
  score: number;
  weight: number;
  weightedScore: number;
  available: boolean;
  explanation: string;
};

type HealthScoreBreakdownProps = {
  isArabic: boolean;
  score: number;
  confidence: number;
  dataCompleteness: number;
  summary: string;
  contributors: HealthScoreContributor[];
};

const arabicLabels: Record<HealthScoreContributor["id"], string> = {
  assessment: "التقييم الصحي",
  checkin: "آخر Check-In",
  reports: "التقارير الطبية",
  analysis: "تحليل التقارير",
  history: "التاريخ الصحي",
  findings: "المؤشرات السريرية",
};

export default function HealthScoreBreakdown({
  isArabic,
  score,
  confidence,
  dataCompleteness,
  summary,
  contributors,
}: HealthScoreBreakdownProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <section className="hpPanel">
      <div className="hpPanelHeader">
        <div className="hpPanelKicker">
          {isArabic ? "تفسير النتيجة" : "Score transparency"}
        </div>

        <h2 className="hpPanelTitle">
          {isArabic
            ? "كيف تم حساب نتيجة الذكاء الصحي؟"
            : "How was your Health Intelligence Score calculated?"}
        </h2>

        <p className="hpPanelText">{summary}</p>
      </div>

      <div className="hpScoreOverview">
        <div className="hpScorePrimary">
          <span>
            {isArabic
              ? "الذكاء الصحي العام"
              : "Overall Health Intelligence"}
          </span>

          <strong>
            {score}
            <small>/100</small>
          </strong>
        </div>

        <div className="hpScoreMeta">
          <div>
            <span>{isArabic ? "مستوى الثقة" : "Confidence"}</span>
            <strong>{confidence}%</strong>
          </div>

          <div>
            <span>{isArabic ? "اكتمال البيانات" : "Data completeness"}</span>
            <strong>{dataCompleteness}%</strong>
          </div>
        </div>
      </div>

      <div className="hpScoreDetailsAction">
        <button
          type="button"
          className="hpSecondary"
          onClick={() => setShowDetails((current) => !current)}
          aria-expanded={showDetails}
        >
          {showDetails
            ? isArabic
              ? "إخفاء تفاصيل النتيجة"
              : "Hide score details"
            : isArabic
              ? "عرض تفاصيل النتيجة"
              : "Show score details"}
        </button>
      </div>

      {showDetails && (
        <div className="hpContributorList">
          {contributors.map((contributor) => {
            const displayedScore = contributor.available
              ? Math.min(Math.max(contributor.score, 0), 100)
              : 0;

            return (
              <article
                className={`hpContributorRow ${
                  contributor.available ? "available" : "missing"
                }`}
                key={contributor.id}
              >
                <div className="hpContributorRowHeader">
                  <div>
                    <span className="hpContributorRowLabel">
                      {isArabic
                        ? arabicLabels[contributor.id]
                        : contributor.label}
                    </span>

                    <p className="hpContributorRowText">
                      {contributor.explanation}
                    </p>
                  </div>

                  <div className="hpContributorRowValue">
                    <strong>
                      {contributor.available
                        ? contributor.score
                        : isArabic
                          ? "—"
                          : "—"}
                    </strong>

                    <span>
                      {contributor.weight}%{" "}
                      {isArabic ? "وزن" : "weight"}
                    </span>
                  </div>
                </div>

                <div className="hpContributorBar">
                  <span style={{ width: `${displayedScore}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
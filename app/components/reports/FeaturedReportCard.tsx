import Link from "next/link";

type FeaturedReportCardProps = {
  fileName: string;
  hasSavedAnalysis: boolean;
  uploadedAt: string | null;
  extractionStatus: string;
  riskLevel: string;
  summary?: string;
  filePath?: string | null;
  analysisHref: string;
  statusTone: (status: string) => string;
  formatDate: (date: string | null) => string;
  onOpenFile: () => void;
  labels: {
    latestAnalysisFocus: string;
    currentReportFocus: string;
    savedDescription: string;
    needsAnalysisDescription: string;
    uploaded: string;
    extraction: string;
    analysis: string;
    saved: string;
    needsAnalysis: string;
    risk: string;
    viewAnalysis: string;
    analyzeReport: string;
    openFile: string;
    healthPlan: string;
    sideLabel: string;
    sideTitle: string;
    sideText: string;
  };
};

export default function FeaturedReportCard({
  fileName,
  hasSavedAnalysis,
  uploadedAt,
  extractionStatus,
  riskLevel,
  summary,
  filePath,
  analysisHref,
  statusTone,
  formatDate,
  onOpenFile,
  labels,
}: FeaturedReportCardProps) {
  return (
    <section className="ohCard featuredReportCard">
      <div className="featuredReportGrid">
        <div>
          <p className="ohMetricLabel">
            {hasSavedAnalysis ? labels.latestAnalysisFocus : labels.currentReportFocus}
          </p>

          <h2 className="ohCardTitle" style={{ fontSize: "1.65rem" }}>
            {fileName}
          </h2>

          <p className="ohCardText">
            {hasSavedAnalysis ? labels.savedDescription : labels.needsAnalysisDescription}
          </p>

          <div className="reportStatusLine">
            <span className="reportStatusPill neutral">
              {labels.uploaded}: {formatDate(uploadedAt)}
            </span>

            <span className={`reportStatusPill ${statusTone(extractionStatus)}`}>
              {labels.extraction}: {extractionStatus}
            </span>

            <span className={`reportStatusPill ${hasSavedAnalysis ? "good" : "moderate"}`}>
              {labels.analysis}: {hasSavedAnalysis ? labels.saved : labels.needsAnalysis}
            </span>

            <span className={`reportStatusPill ${statusTone(riskLevel)}`}>
              {labels.risk}: {riskLevel}
            </span>
          </div>

          {summary ? (
            <p className="ohCardText" style={{ marginTop: "16px" }}>
              {summary.length > 220 ? summary.slice(0, 220) + "..." : summary}
            </p>
          ) : null}

          <div className="ohButtonRow" style={{ marginTop: "20px" }}>
            <Link href={analysisHref} className="reportPrimaryAction">
              {hasSavedAnalysis ? labels.viewAnalysis : labels.analyzeReport}
            </Link>

            <button
              type="button"
              className="reportSecondaryAction"
              onClick={onOpenFile}
              disabled={!filePath}
            >
              {labels.openFile}
            </button>

            {hasSavedAnalysis ? (
              <Link href="/health-plan" className="reportSecondaryAction">
                {labels.healthPlan}
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="featuredStatusPanel">
          <p className="ohMetricLabel">{labels.sideLabel}</p>
          <h3 className="ohCardTitle">{labels.sideTitle}</h3>
          <p className="ohCardText">{labels.sideText}</p>
        </aside>
      </div>
    </section>
  );
}
import Link from "next/link";

type CompactReportRowProps = {
  reportId: string | number;
  fileName: string;
  reportType: string;
  uploadedAt: string | null;
  extractionStatus: string;
  hasSavedAnalysis: boolean;
  filePath?: string | null;
  analysisHref: string;
  statusTone: (status: string) => string;
  formatDate: (date: string | null) => string;
  onOpenFile: () => void;
  labels: {
    savedAnalysis: string;
    needsAnalysis: string;
    view: string;
    analyze: string;
    file: string;
  };
};

export default function CompactReportRow({
  reportId,
  fileName,
  reportType,
  uploadedAt,
  extractionStatus,
  hasSavedAnalysis,
  filePath,
  analysisHref,
  statusTone,
  formatDate,
  onOpenFile,
  labels,
}: CompactReportRowProps) {
  return (
    <article
      className={`compactReportRow ${hasSavedAnalysis ? "saved" : "pending"}`}
      key={reportId}
    >
      <div className="compactReportName">
        <strong>{fileName}</strong>
        <span>{reportType}</span>
      </div>

      <div className="reportStatusLine" style={{ marginTop: 0 }}>
        <span className={`reportStatusPill ${hasSavedAnalysis ? "good" : "moderate"}`}>
          {hasSavedAnalysis ? labels.savedAnalysis : labels.needsAnalysis}
        </span>

        <span className={`reportStatusPill ${statusTone(extractionStatus)}`}>
          {extractionStatus}
        </span>
      </div>

      <span className="ohCardText">{formatDate(uploadedAt)}</span>

      <div className="compactActionRow">
        <Link href={analysisHref} className="compactAction primary">
          {hasSavedAnalysis ? labels.view : labels.analyze}
        </Link>

        <button
          type="button"
          className="compactAction secondary"
          onClick={onOpenFile}
          disabled={!filePath}
        >
          {labels.file}
        </button>
      </div>
    </article>
  );
}
import type { ReactNode } from "react";

type MedicalReportCardProps = {
  fileName: string;
  reportTypeLabel: string;
  uploadedAtText: string;
  extractionStatus: string;
  isGenerated: boolean;
  isExpanded: boolean;
  canOpen: boolean;
  onOpen: () => void;
  onGenerate: () => void;
  onViewGenerated: () => void;
  onHideGenerated: () => void;
  children?: ReactNode;
};

export default function MedicalReportCard({
  fileName,
  reportTypeLabel,
  uploadedAtText,
  extractionStatus,
    isGenerated,
  isExpanded,
  canOpen,
  onOpen,
  onGenerate,
  onViewGenerated,
  onHideGenerated,
  children,
}: MedicalReportCardProps) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "16px",
        background: "rgba(15,23,42,0.75)",
        border: "1px solid rgba(34,211,238,0.18)",
        textAlign: "left",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <div>
          <h3 style={{ marginBottom: "6px" }}>📄 {fileName}</h3>

          <p style={{ margin: 0 }}>
            {reportTypeLabel} • {uploadedAtText}
          </p>

          <p style={{ marginTop: "6px" }}>
            Extraction: {extractionStatus}
          </p>

          <p style={{ marginTop: "8px", fontWeight: 800 }}>
            {isGenerated ? "Intelligence Generated" : "Ready for Interpretation"}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {canOpen && (
            <button className="secondaryBtn" onClick={onOpen}>
              Open
            </button>
          )}

                              <button
            className="primaryBtn"
            onClick={
              isGenerated
                ? isExpanded
                  ? onHideGenerated
                  : onViewGenerated
                : onGenerate
            }
          >
            {isGenerated
              ? isExpanded
                ? "Hide Result"
                : "View Result"
              : "Generate"}
          </button>
        </div>
      </div>

      {isGenerated && children && (
        <div style={{ marginTop: "16px" }}>{children}</div>
      )}
    </div>
  );
}
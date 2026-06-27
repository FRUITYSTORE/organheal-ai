import type { ReactNode } from "react";

type MedicalReportListProps = {
  hasReports: boolean;
  children: ReactNode;
};

export default function MedicalReportList({
  hasReports,
  children,
}: MedicalReportListProps) {
  return (
    <div className="resultBox">
      <p className="sectionLabel">📄 MEDICAL REPORT INTELLIGENCE</p>
      <h2>Reports Ready for Medical Intelligence</h2>

      {!hasReports ? (
        <p>No uploaded reports are ready for intelligence yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "12px",
            marginTop: "18px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
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
      <p className="sectionLabel">📄 MEDICAL REPORT LIBRARY</p>
      <h2>Your Medical Reports</h2>

      <p
        style={{
          marginTop: "8px",
          marginBottom: "18px",
          opacity: 0.82,
          lineHeight: 1.6,
        }}
      >
        View your uploaded reports, open saved intelligence results, and
        download patient-friendly or doctor-ready PDF summaries.
      </p>

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
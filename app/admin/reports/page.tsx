"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Report = {
  id: number;
  file_name: string;
  report_type: string | null;
  created_at: string;

  extraction_status?: string | null;
  extracted_text?: string | null;
  extracted_at?: string | null;

  analysis_status?: string | null;
  ai_summary?: string | null;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    const { data, error } = await supabase
      .from("uploaded_lab_files")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setReports(data || []);
    setLoading(false);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">ADMIN REPORT CONSOLE</p>
          <h1>Uploaded Reports</h1>
          <p>
            Internal console used to monitor extraction and intelligence
            generation.
          </p>
        </div>

        {loading ? (
          <div className="resultBox">
            <p>Loading reports...</p>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="resultBox"
              style={{ marginBottom: "20px" }}
            >
              <h3>📄 {report.file_name}</h3>

              <p>
                <strong>ID:</strong> {report.id}
              </p>

              <p>
                <strong>Type:</strong>{" "}
                {report.report_type || "Medical Report"}
              </p>

              <p>
                <strong>Uploaded:</strong>{" "}
                {new Date(report.created_at).toLocaleString()}
              </p>

              <p>
                <strong>Extraction:</strong>{" "}
                {report.extraction_status || "Pending"}
              </p>

              <p>
                <strong>AI Status:</strong>{" "}
                {report.analysis_status || "Pending"}
              </p>

              <p>
                <strong>Extracted At:</strong>{" "}
                {report.extracted_at || "Not extracted"}
              </p>

              <hr />

              <h4>Extracted Text</h4>

              <div
                style={{
                  maxHeight: "250px",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  padding: "12px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                }}
              >
                {report.extracted_text ||
                  "No extracted text available yet."}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
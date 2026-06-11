"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { generateHealthEngineResult } from "../../lib/healthEngine";

type OrganScore = {
  organ: string;
  score: number;
};

type SharedReport = {
  id: string;
  user_id: string;
  share_code: string;
  report_type: string;
  expires_at: string;
  created_at: string;
  overall_score: number | null;
  lab_score: number | null;
  priority_organ: string | null;
  latest_checkin_score: number | null;
  organ_scores: OrganScore[] | null;
  recommendations: string | null;
  report_summary: string | null;
};

export default function DoctorPortalPage() {
  const [shareCode, setShareCode] = useState("");
  const [verifiedReport, setVerifiedReport] = useState<SharedReport | null>(null);
  const [message, setMessage] = useState("");
const healthEngine =
  verifiedReport &&
  generateHealthEngineResult({
    overallScore: verifiedReport.overall_score ?? 0,
    labScore: verifiedReport.lab_score ?? null,
    priorityOrgan: verifiedReport.priority_organ ?? null,
    strongestOrgan:
      verifiedReport.organ_scores?.sort(
        (a, b) => b.score - a.score
      )[0]?.organ ?? null,
    isArabic: false,
  });
  async function verifyShareCode() {
    setMessage("");
    setVerifiedReport(null);

    if (!shareCode.trim()) {
      setMessage("Please enter a share code.");
      return;
    }

    const cleanCode = shareCode.trim().toUpperCase();

    const { data, error } = await supabase
      .from("shared_reports")
      .select(
        "id, user_id, share_code, report_type, expires_at, created_at, overall_score, lab_score, priority_organ, latest_checkin_score, organ_scores, recommendations, report_summary"
      )
      .eq("share_code", cleanCode)
      .single();

    if (error || !data) {
      setMessage("Invalid or expired share code.");
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setMessage("This share code has expired.");
      return;
    }

    setVerifiedReport(data as SharedReport);
    setMessage("Share code verified successfully.");
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <section className="assistantHeader">
          <p className="assistantBadge">DOCTOR PORTAL</p>
          <h1>Doctor Intelligence Portal</h1>
          <p>
            Secure access to patient-shared OrganHeal health intelligence
            reports.
          </p>
        </section>

        <section className="chatWindow">
          <div className="resultBox">
            <p className="sectionLabel">PATIENT REPORT ACCESS</p>
            <h2>Enter Share Code</h2>
            <p>Enter a valid OrganHeal share code provided by the patient.</p>

            <div className="chatInput">
              <input
                type="text"
                placeholder="OH-XXXXXX"
                value={shareCode}
                onChange={(event) => setShareCode(event.target.value)}
              />

              <button onClick={verifyShareCode}>Verify</button>
            </div>

            {message && (
              <p
                style={{
                  marginTop: "12px",
                  color: message.includes("success") ? "#22c55e" : "#f97316",
                  fontWeight: 600,
                }}
              >
                {message}
              </p>
            )}
          </div>

          {verifiedReport && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">ACCESS VERIFIED</p>

                <h2
                  style={{
                    color: "#22c55e",
                    fontWeight: 800,
                  }}
                >
                  {verifiedReport.share_code}
                </h2>

                <p>
                  <strong>Report Type:</strong> {verifiedReport.report_type}
                </p>

                <p>
                  <strong>Created:</strong>{" "}
                  {new Date(verifiedReport.created_at).toLocaleString()}
                </p>

                <p>
                  <strong>Expires:</strong>{" "}
                  {new Date(verifiedReport.expires_at).toLocaleString()}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "20px",
                }}
              >
                <div className="resultBox">
                  <p className="sectionLabel">PATIENT SUMMARY</p>
                  <h2>Health Intelligence Summary</h2>
<div className="resultBox">
  <p className="sectionLabel">
    PATIENT INTELLIGENCE SUMMARY
  </p>

  <h2>
    {healthEngine?.healthProfile || "Health Profile"}
  </h2>

  <div
    style={{
      display: "grid",
      gap: "12px",
      marginTop: "18px",
    }}
  >
    <div>
      <strong>Risk Pattern:</strong>{" "}
      {healthEngine?.riskPattern}
    </div>

    <div>
      <strong>Health Age:</strong>{" "}
      {healthEngine?.healthAgeStatus}
    </div>

    <div>
      <strong>Potential Score:</strong>{" "}
      {healthEngine?.potentialScore}/100
    </div>

    <div>
      <strong>Best Opportunity:</strong>{" "}
      {healthEngine?.opportunityTitle}
    </div>

    <div>
      <strong>Recommended Action:</strong>{" "}
      {healthEngine?.bestNextAction}
    </div>
  </div>
</div>
                  <p>
                    <strong>Overall Score:</strong>{" "}
                    {verifiedReport.overall_score !== null
                      ? `${verifiedReport.overall_score}/100`
                      : "Not available"}
                  </p>

                  <p>
                    <strong>Lab Score:</strong>{" "}
                    {verifiedReport.lab_score !== null
                      ? `${verifiedReport.lab_score}/100`
                      : "Not available"}
                  </p>

                  <p>
                    <strong>Priority Organ:</strong>{" "}
                    {verifiedReport.priority_organ || "Not available"}
                  </p>

                  <p>
                    <strong>Latest Check-In:</strong>{" "}
                    {verifiedReport.latest_checkin_score !== null
                      ? `${verifiedReport.latest_checkin_score}/100`
                      : "Not available"}
                  </p>

                  <hr
                    style={{
                      margin: "20px 0",
                      opacity: 0.2,
                    }}
                  />

                  <p>
                    <strong>Report Summary</strong>
                  </p>

                  <p>{verifiedReport.report_summary || "Not available"}</p>

                  <p style={{ marginTop: "16px" }}>
                    <strong>Recommendations</strong>
                  </p>

                  <p>{verifiedReport.recommendations || "Not available"}</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">ORGAN SCORES</p>
                  <h2>Shared Organ Scores</h2>

                  {verifiedReport.organ_scores &&
                  verifiedReport.organ_scores.length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gap: "10px",
                        marginTop: "16px",
                      }}
                    >
                      {verifiedReport.organ_scores.map((item) => (
                        <div
                          key={item.organ}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "12px",
                            borderRadius: "12px",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <span>{item.organ}</span>
                          <strong>{item.score}/100</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No organ scores available.</p>
                  )}
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">REPORT STATUS</p>
                  <h2>Temporary Access Active</h2>
                  <p>Access remains active until:</p>
                  <p>
                    <strong>
                      {new Date(verifiedReport.expires_at).toLocaleDateString()}
                    </strong>
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="resultBox">
            <p className="sectionLabel">IMPORTANT NOTICE</p>
            <h2>Educational Use Only</h2>
            <p>
              OrganHeal Doctor Portal supports health education, communication,
              and structured health awareness. It does not replace professional
              diagnosis, treatment, or clinical judgment.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link href="/dashboard">
              <button className="secondaryBtn">Dashboard</button>
            </Link>

            <Link href="/organ-report">
              <button className="secondaryBtn">Organ Report</button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
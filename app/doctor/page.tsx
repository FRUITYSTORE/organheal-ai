"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

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
};

export default function DoctorPortalPage() {
  const [shareCode, setShareCode] = useState("");
  const [verifiedReport, setVerifiedReport] = useState<SharedReport | null>(
    null
  );
  const [message, setMessage] = useState("");

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
  "id, user_id, share_code, report_type, expires_at, created_at, overall_score, lab_score, priority_organ, latest_checkin_score"
)
      .eq("share_code", cleanCode)
      .single();

    if (error || !data) {
      setMessage("Invalid or expired share code.");
      return;
    }

    const now = new Date();
    const expiryDate = new Date(data.expires_at);

    if (expiryDate < now) {
      setMessage("This share code has expired.");
      return;
    }

    setVerifiedReport(data);
    setMessage("Share code verified successfully.");
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <section className="assistantHeader">
          <p className="assistantBadge">DOCTOR PORTAL MVP</p>

          <h1>Doctor Intelligence Portal</h1>

          <p>
            Review patient-shared OrganHeal reports, organ scores, lab
            intelligence, and follow-up summaries.
          </p>

          <div className="buttons">
            <Link href="/dashboard">
              <button className="primaryBtn">Open Patient Dashboard</button>
            </Link>

            <Link href="/organ-report">
              <button className="secondaryBtn">View Patient Report</button>
            </Link>
          </div>
        </section>

        <section className="chatWindow">
          <div className="resultBox">
            <p className="sectionLabel">PATIENT REPORT ACCESS</p>
            <h2>Enter Patient Share Code</h2>

            <p>
              Enter a patient-generated OrganHeal share code to verify temporary
              report access.
            </p>

            <div className="chatInput">
              <input
                type="text"
                placeholder="Example: OH-4F82K9"
                value={shareCode}
                onChange={(event) => setShareCode(event.target.value)}
              />

              <button onClick={verifyShareCode}>Verify</button>
            </div>

            {message && <p>{message}</p>}
          </div>

          {verifiedReport && (
            <div className="resultBox">
              <p className="sectionLabel">ACCESS VERIFIED</p>

              <h2>{verifiedReport.share_code}</h2>

              <p>
                Report Type: <strong>{verifiedReport.report_type}</strong>
              </p>

              <p>
                Created:{" "}
                <strong>
                  {new Date(verifiedReport.created_at).toLocaleString()}
                </strong>
              </p>

              <p>
                Expires:{" "}
                <strong>
                  {new Date(verifiedReport.expires_at).toLocaleString()}
                </strong>
              </p>

              <div className="assessmentForm">
                <div className="resultBox">
                  <p className="sectionLabel">PATIENT SUMMARY</p>
<h2>Health Intelligence Preview</h2>

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
  <strong>Latest Check-In Score:</strong>{" "}
  {verifiedReport.latest_checkin_score !== null
    ? `${verifiedReport.latest_checkin_score}/100`
    : "Not available"}
</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">REPORT STATUS</p>
                  <h2>Temporary Access Active</h2>
                  <p>
                    This code is valid until{" "}
                    {new Date(verifiedReport.expires_at).toLocaleDateString()}.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="assessmentForm">
            <div className="resultBox">
              <p className="sectionLabel">PATIENT REPORTS</p>
              <h2>Shared Reports</h2>
              <p>
                Doctors will be able to review professional health intelligence
                reports shared by patients.
              </p>
            </div>

            <div className="resultBox">
              <p className="sectionLabel">ORGAN SCORES</p>
              <h2>Organ Health Overview</h2>
              <p>
                View heart, lung, kidney, liver, brain, metabolic, and lab
                intelligence scores in one clinical overview.
              </p>
            </div>

            <div className="resultBox">
              <p className="sectionLabel">LAB SUMMARY</p>
              <h2>Lab Intelligence</h2>
              <p>
                Review lab score, priority marker, affected organ, and suggested
                educational follow-up areas.
              </p>
            </div>

            <div className="resultBox">
              <p className="sectionLabel">FOLLOW-UP</p>
              <h2>Clinical Notes</h2>
              <p>
                Future versions will allow doctors to add structured follow-up
                notes and patient recommendations.
              </p>
            </div>
          </div>

          <div className="resultBox">
            <p className="sectionLabel">IMPORTANT NOTE</p>
            <h2>Educational and support use only</h2>
            <p>
              OrganHeal Doctor Portal is intended to support health education,
              health awareness, and better communication. It does not replace
              licensed clinical judgment, diagnosis, or treatment decisions.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
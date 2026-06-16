"use client";
import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { generateHealthEngineResult } from "../../lib/healthEngine";

type Assessment = {
  organ_name: string;
  score: number;
  risk_level: string;
  notes: string;
  created_at: string;
};

type LabReport = {
  score: number;
  interpretation: string;
  created_at: string;
};

type DailyCheckIn = {
  mood: string;
  wellness_score: number;
  created_at: string;
};
type SharedReport = {
  share_code: string;
  report_type: string | null;
  expires_at: string;
  overall_score: number | null;
  lab_score: number | null;
  priority_organ: string | null;
  latest_checkin_score: number | null;
  organ_scores: { organ: string; score: number }[] | null;
  recommendations: string | null;
  report_summary: string | null;
};
export default function DoctorPortalPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [shareCodeInput, setShareCodeInput] = useState("");
const [sharedReport, setSharedReport] = useState<SharedReport | null>(null);
const [shareMessage, setShareMessage] = useState("");
const [checkingShareCode, setCheckingShareCode] = useState(false);

  useEffect(() => {
    fetchDoctorPortalData();
  }, []);

  async function fetchDoctorPortalData() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Please login to access the doctor portal.");
      setLoading(false);
      return;
    }

    const user = userData.user;

    const { data: organData, error: organError } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level, notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (organError) {
      setMessage("Database error: " + organError.message);
      setLoading(false);
      return;
    }

    const { data: labData, error: labError } = await supabase
      .from("lab_reports")
      .select("score, interpretation, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (labError && labError.code !== "PGRST116") {
      setMessage("Database error: " + labError.message);
      setLoading(false);
      return;
    }

    const { data: checkInData, error: checkInError } = await supabase
      .from("daily_checkins")
      .select("mood, wellness_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (checkInError && checkInError.code !== "PGRST116") {
      setMessage("Database error: " + checkInError.message);
      setLoading(false);
      return;
    }

    setAssessments(organData || []);
    setLabReport(labData || null);
    setDailyCheckIn(checkInData || null);
    setLoading(false);
  }

  const allScores = [
    ...assessments.map((item) => item.score),
    ...(labReport ? [labReport.score] : []),
    ...(dailyCheckIn ? [dailyCheckIn.wellness_score] : []),
  ];

  const overallScore =
    allScores.length > 0
      ? Math.round(
          allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        )
      : 0;

  const strongestOrgan =
    assessments.length > 0
      ? [...assessments].sort((a, b) => b.score - a.score)[0]
      : null;

  const priorityOrgan =
    assessments.length > 0
      ? [...assessments].sort((a, b) => a.score - b.score)[0]
      : null;

  const healthEngine = generateHealthEngineResult({
    overallScore,
    labScore: labReport?.score ?? null,
    dailyCheckInScore: dailyCheckIn?.wellness_score ?? null,
    priorityOrgan: priorityOrgan?.organ_name ?? null,
    strongestOrgan: strongestOrgan?.organ_name ?? null,
    isArabic: false,
  });
async function verifyShareCode() {
  setShareMessage("");
  setSharedReport(null);

  const cleanCode = shareCodeInput.trim().toUpperCase();

  if (!cleanCode) {
    setShareMessage("Please enter a valid share code.");
    return;
  }

  setCheckingShareCode(true);

  const { data, error } = await supabase
    .from("shared_reports")
    .select(
      "share_code, report_type, expires_at, overall_score, lab_score, priority_organ, latest_checkin_score, organ_scores, recommendations, report_summary"
    )
    .eq("share_code", cleanCode)
    .maybeSingle();

  if (error) {
    setShareMessage("Could not verify share code.");
    setCheckingShareCode(false);
    return;
  }

  if (!data) {
    setShareMessage("Invalid share code.");
    setCheckingShareCode(false);
    return;
  }

  if (new Date(data.expires_at) < new Date()) {
    setShareMessage("This share code has expired.");
    setCheckingShareCode(false);
    return;
  }

  setSharedReport(data as SharedReport);
  setCheckingShareCode(false);
}
  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />
        <div className="assistantHeader">
          <p className="assistantBadge">Doctor Portal</p>
          <h1>Pre-Visit Intelligence Brief</h1>
          <p>
            A professional clinical-style summary generated from patient
            assessments, lab insights, daily check-ins, and health history.
          </p>
        </div>
<div className="resultBox">
  <p className="sectionLabel">Shared Report Access</p>
  <h2>Enter Patient Share Code</h2>
  <p>
    Doctors can view a temporary educational OrganHeal summary using a patient-provided share code.
  </p>

  <div className="formGroup">
    <label>Share Code</label>
    <input
      type="text"
      placeholder="Example: OH-ABC123"
      value={shareCodeInput}
      onChange={(event) => setShareCodeInput(event.target.value)}
    />
  </div>

  <button
    className="primaryBtn"
    onClick={verifyShareCode}
    disabled={checkingShareCode}
  >
    {checkingShareCode ? "Checking..." : "View Shared Report"}
  </button>

  {shareMessage && <p>{shareMessage}</p>}
</div>
        <div className="chatWindow">
          {sharedReport && (
  <>
    <div className="resultBox">
      <p className="sectionLabel">Shared Patient Report</p>
      <h2>{sharedReport.overall_score ?? "N/A"}/100</h2>
      <p>
        <strong>Priority Organ:</strong>{" "}
        {sharedReport.priority_organ || "General Health"}
      </p>
      <p>
        <strong>Lab Score:</strong>{" "}
        {sharedReport.lab_score ?? "N/A"}
      </p>
      <p>
        <strong>Latest Check-In:</strong>{" "}
        {sharedReport.latest_checkin_score ?? "N/A"}
      </p>
      <p>
        <strong>Expires:</strong>{" "}
        {new Date(sharedReport.expires_at).toLocaleString()}
      </p>
    </div>

    <div className="resultBox">
      <p className="sectionLabel">Report Summary</p>
      <p>{sharedReport.report_summary || "No summary available."}</p>
    </div>

    <div className="resultBox">
      <p className="sectionLabel">Recommendations</p>
      <p>{sharedReport.recommendations || "No recommendations available."}</p>
    </div>

    <div className="resultBox">
      <p className="sectionLabel">Organ Scores</p>

      {sharedReport.organ_scores && sharedReport.organ_scores.length > 0 ? (
        <div className="assessmentForm">
          {sharedReport.organ_scores.map((item) => (
            <div className="resultBox" key={item.organ}>
              <p className="sectionLabel">{item.organ}</p>
              <h2>{item.score}/100</h2>
            </div>
          ))}
        </div>
      ) : (
        <p>No organ scores available.</p>
      )}
    </div>
  </>
)}
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">Loading</p>
              <h2>Preparing doctor intelligence brief...</h2>
            </div>
          )}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">Access Status</p>
              <h2>Doctor Portal Unavailable</h2>
              <p>{message}</p>
            </div>
          )}

          {!loading && !message && allScores.length === 0 && (
            <div className="resultBox">
              <p className="sectionLabel">No Patient Data</p>
              <h2>No health intelligence available yet</h2>
              <p>
                The patient needs to complete at least one assessment, lab entry,
                or daily check-in before a doctor brief can be generated.
              </p>
            </div>
          )}

          {!loading && !message && allScores.length > 0 && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">Clinical Overview</p>
                <h2>{overallScore}/100</h2>
                <p>
                  This score is generated from available organ assessments,
                  laboratory report scoring, and daily wellness check-in data.
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Digital Health Profile</p>
                <h2>{healthEngine.healthProfile}</h2>
                <p>
                  Strongest area:{" "}
                  <strong>{strongestOrgan?.organ_name || "N/A"}</strong>
                </p>
                <p>
                  Priority area:{" "}
                  <strong>{priorityOrgan?.organ_name || "N/A"}</strong>
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Risk Pattern</p>
                <h2>{healthEngine.riskPattern}</h2>
                <p>{healthEngine.trendMessage}</p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Health Potential</p>
                <h2>{healthEngine.potentialScore}/100</h2>
                <h3>{healthEngine.potentialLevel}</h3>
                <p>
                  Estimated potential gain:{" "}
                  <strong>+{healthEngine.potentialGain}</strong> points.
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Health Age</p>
                <h2>{healthEngine.healthAgeStatus}</h2>
                <p>{healthEngine.healthAgeMessage}</p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Doctor Brief</p>
                <h2>Pre-Visit Summary</h2>
                <p>{healthEngine.doctorBrief}</p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Recommended Clinical Focus</p>
                <h2>{healthEngine.opportunityTitle}</h2>
                <p>{healthEngine.bestNextAction}</p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Available Data Sources</p>

                <p>
                  Organ assessments: <strong>{assessments.length}</strong>
                </p>

                <p>
                  Latest lab score:{" "}
                  <strong>{labReport ? `${labReport.score}/100` : "N/A"}</strong>
                </p>

                <p>
                  Latest daily check-in:{" "}
                  <strong>
                    {dailyCheckIn
                      ? `${dailyCheckIn.wellness_score}/100 - ${dailyCheckIn.mood}`
                      : "N/A"}
                  </strong>
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Disclaimer</p>
                <p>
                  OrganHeal AI provides health intelligence support and does not
                  replace clinical diagnosis, medical judgment, or emergency
                  care.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
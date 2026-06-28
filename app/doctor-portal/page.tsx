"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { generateHealthEngineResult } from "../../lib/healthEngine";

type Assessment = {
  organ_name: string;
  score: number;
  risk_level: string | null;
  notes: string | null;
  created_at: string;
};

type DailyCheckIn = {
  mood: string;
  wellness_score: number;
  created_at: string;
};

type UploadedReport = {
  id: number;
  file_name: string | null;
  extraction_status: string | null;
  created_at: string;
};

type HealthInsight = {
  id: number;
  report_id: number | null;
  insight_title: string | null;
  ai_status: string | null;
  summary: string | null;
  key_findings: string | null;
  recommendations: string | null;
  doctor_brief: string | null;
  created_at: string | null;
};

type SavedIntelligence = {
  insight_id: number;
  updated_at: string | null;
};

type HealthHistory = {
  id: string;
  module_name: string;
  score: number;
  status: string | null;
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
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [uploadedReports, setUploadedReports] = useState<UploadedReport[]>([]);
  const [healthInsights, setHealthInsights] = useState<HealthInsight[]>([]);
  const [savedIntelligence, setSavedIntelligence] = useState<SavedIntelligence[]>(
    []
  );
  const [healthHistory, setHealthHistory] = useState<HealthHistory[]>([]);

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
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Please login to access your personal doctor brief.");
      setLoading(false);
      return;
    }

    const userId = userData.user.id;

    const { data: organData, error: organError } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level, notes, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (organError) {
      setMessage("Database error: " + organError.message);
      setLoading(false);
      return;
    }

    const { data: checkInData, error: checkInError } = await supabase
      .from("daily_checkins")
      .select("mood, wellness_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (checkInError && checkInError.code !== "PGRST116") {
      setMessage("Database error: " + checkInError.message);
      setLoading(false);
      return;
    }

    const { data: reportData } = await supabase
      .from("uploaded_lab_files")
      .select("id, file_name, extraction_status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: insightData } = await supabase
      .from("health_insights")
      .select(
        "id, report_id, insight_title, ai_status, summary, key_findings, recommendations, doctor_brief, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const insightIds = (insightData || []).map((item) => item.id);

    let savedRows: SavedIntelligence[] = [];

    if (insightIds.length > 0) {
      const { data: savedData } = await supabase
        .from("generated_intelligence_results")
        .select("insight_id, updated_at")
        .eq("user_id", userId)
        .in("insight_id", insightIds)
        .order("updated_at", { ascending: false });

      savedRows = savedData || [];
    }

    const { data: historyData } = await supabase
      .from("health_history")
      .select("id, module_name, score, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    setAssessments((organData || []) as Assessment[]);
    setDailyCheckIn((checkInData || null) as DailyCheckIn | null);
    setUploadedReports((reportData || []) as UploadedReport[]);
    setHealthInsights((insightData || []) as HealthInsight[]);
    setSavedIntelligence(savedRows);
    setHealthHistory((historyData || []) as HealthHistory[]);
    setLoading(false);
  }

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
  .rpc("get_shared_report_by_code", {
    input_share_code: cleanCode,
  })
  .maybeSingle();

    if (error) {
      setShareMessage("Could not verify share code.");
      setCheckingShareCode(false);
      return;
    }

    if (!data) {
      setShareMessage("Invalid or expired share code.");
      setCheckingShareCode(false);
      return;
    }

    setShareMessage("Invalid or expired share code.");

    setSharedReport(data as SharedReport);
    setCheckingShareCode(false);
  }

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 60) return "moderateScore";
    return "riskScore";
  }

  const assessmentScores = assessments.map((item) => item.score);
  const checkInScores = dailyCheckIn ? [dailyCheckIn.wellness_score] : [];
  const allScores = [...assessmentScores, ...checkInScores];

  const overallScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
      : 0;

  const strongestOrgan =
    assessments.length > 0
      ? [...assessments].sort((a, b) => b.score - a.score)[0]
      : null;

  const priorityOrgan =
    assessments.length > 0
      ? [...assessments].sort((a, b) => a.score - b.score)[0]
      : null;

  const processedReports = uploadedReports.filter(
    (item) => item.extraction_status === "Completed"
  ).length;

  const pendingReports = uploadedReports.filter(
    (item) => item.extraction_status !== "Completed"
  ).length;

  const savedIntelligenceIds = new Set(
    savedIntelligence.map((item) => item.insight_id)
  );

  const generatedInsights = healthInsights.filter(
    (item) => item.ai_status === "Generated" || savedIntelligenceIds.has(item.id)
  );

  const latestDoctorBriefInsight =
    generatedInsights.find((item) => item.doctor_brief) || null;

  const latestReportSummary =
    generatedInsights.find((item) => item.summary)?.summary ||
    "No generated report summary is available yet.";

  const latestDoctorBrief =
    latestDoctorBriefInsight?.doctor_brief ||
    "No saved report-specific doctor brief is available yet. Generate intelligence from the reports page to prepare one.";

  const latestRecommendations =
    generatedInsights.find((item) => item.recommendations)?.recommendations ||
    "No saved report-specific recommendations are available yet.";

  const healthEngine = generateHealthEngineResult({
    overallScore,
    labScore: null,
    dailyCheckInScore: dailyCheckIn?.wellness_score ?? null,
    priorityOrgan: priorityOrgan?.organ_name ?? null,
    strongestOrgan: strongestOrgan?.organ_name ?? null,
    isArabic: false,
  });

  const doctorBriefReadiness =
    assessments.length > 0 &&
    dailyCheckIn &&
    uploadedReports.length > 0 &&
    generatedInsights.length > 0
      ? "Ready"
      : assessments.length > 0 || dailyCheckIn || uploadedReports.length > 0
      ? "Building"
      : "Not Started";

  const recommendedAction =
    assessments.length === 0
      ? {
          label: "Start with patient assessment data",
          description:
            "Complete at least one organ assessment so the doctor brief can identify a priority area.",
          href: "/assessment",
          buttonText: "Start Assessment",
        }
      : uploadedReports.length === 0
      ? {
          label: "Upload clinical documents",
          description:
            "Upload lab reports, radiology reports, discharge summaries, or prescriptions to strengthen the doctor brief.",
          href: "/lab-upload",
          buttonText: "Upload Report",
        }
      : generatedInsights.length === 0
      ? {
          label: "Generate report intelligence",
          description:
            "Open Intelligence Center to generate report summaries, recommendations, and doctor-ready interpretation.",
          href: "/intelligence",
          buttonText: "Open Intelligence",
        }
      : !dailyCheckIn
      ? {
          label: "Add latest wellness context",
          description:
            "Complete a wellness check-in so the brief includes the latest patient-reported status.",
          href: "/checkin",
          buttonText: "Open Check-In",
        }
      : {
          label: "Review follow-up readiness",
          description:
            "The brief has enough data to support a structured clinical discussion. Continue with the follow-up plan.",
          href: "/health-plan",
          buttonText: "Open Health Plan",
        };

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">DOCTOR PORTAL</p>
          <h1>Doctor Brief & Shared Health Summary</h1>
          <p>
            A structured educational pre-visit summary built from assessments,
            check-ins, uploaded reports, saved intelligence, and health history.
          </p>
        </div>

        <div className="chatWindow">
          <div className="resultBox">
            <p className="sectionLabel">Shared Report Access</p>
            <h2>Enter Patient Share Code</h2>
            <p>
              Doctors can view a temporary educational OrganHeal summary using a
              patient-provided share code.
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

          {sharedReport && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">Shared Patient Report</p>
                <h2>
                  {sharedReport.overall_score !== null
                    ? `${sharedReport.overall_score}/100`
                    : "N/A"}
                </h2>

                <p>
                  <strong>Priority Organ:</strong>{" "}
                  {sharedReport.priority_organ || "General Health"}
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
                <p className="sectionLabel">Shared Report Summary</p>
                <p>{sharedReport.report_summary || "No summary available."}</p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Shared Recommendations</p>
                <p>
                  {sharedReport.recommendations || "No recommendations available."}
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Shared Organ Scores</p>

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
              <p className="sectionLabel">Loading Brief</p>
              <h2>Preparing doctor intelligence brief...</h2>
            </div>
          )}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">Access Status</p>
              <h2>Personal Doctor Brief Unavailable</h2>
              <p>{message}</p>

              <Link href="/login" className="primaryBtn">
                Login
              </Link>
            </div>
          )}

          {!loading && !message && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">Recommended Next Step</p>

                <h2>{recommendedAction.label}</h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    marginBottom: "18px",
                  }}
                >
                  {recommendedAction.description}
                </p>

                <Link href={recommendedAction.href} className="primaryBtn">
                  {recommendedAction.buttonText}
                </Link>
              </div>

              <div className="assessmentForm">
                <div className="resultBox">
                  <p className="sectionLabel">Doctor Brief Readiness</p>
                  <h2>{doctorBriefReadiness}</h2>
                  <p>
                    Based on assessments, reports, saved intelligence, and latest
                    wellness check-in.
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Clinical Overview</p>
                  <h2 className={allScores.length > 0 ? getScoreClass(overallScore) : ""}>
                    {allScores.length > 0 ? `${overallScore}/100` : "N/A"}
                  </h2>
                  <p>
                    Generated from available organ assessments and latest wellness
                    check-in data.
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Assessments</p>
                  <h2>{assessments.length}</h2>
                  <p>Total saved organ assessments.</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Uploaded Reports</p>
                  <h2>{uploadedReports.length}</h2>
                  <p>
                    {processedReports} processed · {pendingReports} pending
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Saved Intelligence</p>
                  <h2>{savedIntelligence.length}</h2>
                  <p>Saved generated intelligence results.</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Latest Check-In</p>
                  <h2>
                    {dailyCheckIn ? `${dailyCheckIn.wellness_score}/100` : "N/A"}
                  </h2>
                  <p>
                    {dailyCheckIn
                      ? `${dailyCheckIn.mood} · ${new Date(
                          dailyCheckIn.created_at
                        ).toLocaleDateString()}`
                      : "No check-in yet"}
                  </p>
                </div>
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

                <p>
                  Risk pattern: <strong>{healthEngine.riskPattern}</strong>
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Doctor Brief</p>
                <h2>Pre-Visit Summary</h2>
                <p>{healthEngine.doctorBrief}</p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Report Intelligence Brief</p>
                <h2>Saved Report-Based Clinical Summary</h2>

                <p>
                  <strong>Summary:</strong> {latestReportSummary}
                </p>

                <p>
                  <strong>Doctor Brief:</strong> {latestDoctorBrief}
                </p>

                <p>
                  <strong>Recommendations:</strong> {latestRecommendations}
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Available Data Sources</p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                    gap: "14px",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <strong>Assessments</strong>
                    <p>{assessments.length}</p>
                  </div>

                  <div>
                    <strong>Reports</strong>
                    <p>{uploadedReports.length}</p>
                  </div>

                  <div>
                    <strong>Generated Insights</strong>
                    <p>{generatedInsights.length}</p>
                  </div>

                  <div>
                    <strong>History Records</strong>
                    <p>{healthHistory.length}</p>
                  </div>

                  <div>
                    <strong>Latest Check-In</strong>
                    <p>{dailyCheckIn ? "Available" : "Missing"}</p>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Doctor Brief Journey</p>

                <h2>Prepare for a safer clinical discussion</h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    maxWidth: "760px",
                    margin: "0 auto 22px",
                  }}
                >
                  This page organizes the patient&apos;s profile, assessments,
                  reports, intelligence, check-ins, and history into a concise
                  educational brief for discussion with a licensed clinician.
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Link href="/profile" className="secondaryBtn">
                    Profile
                  </Link>

                  <Link href="/reports" className="secondaryBtn">
                    Reports
                  </Link>

                  <Link href="/intelligence" className="primaryBtn">
                    Intelligence
                  </Link>

                  <Link href="/history" className="secondaryBtn">
                    History
                  </Link>

                  <Link href="/checkin" className="secondaryBtn">
                    Check-In
                  </Link>

                  <Link href="/health-plan" className="secondaryBtn">
                    Health Plan
                  </Link>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Disclaimer</p>
                <p>
                  OrganHeal AI provides educational health intelligence support.
                  It does not diagnose, treat, replace clinical judgment, or
                  provide emergency medical advice.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

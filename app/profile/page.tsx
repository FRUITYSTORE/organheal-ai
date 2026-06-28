"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Assessment = {
  organ_name: string;
  score: number;
  created_at: string;
};

type DailyCheckIn = {
  mood: string;
  wellness_score: number;
  created_at: string;
};

type Profile = {
  username: string | null;
  email: string | null;
  created_at: string | null;
};

type UploadedReport = {
  id: number;
  created_at: string;
  extraction_status: string | null;
};

type HealthInsight = {
  id: number;
  ai_status: string | null;
  created_at: string | null;
};

type SavedIntelligence = {
  insight_id: number;
  updated_at: string | null;
};

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [memberSince, setMemberSince] = useState("");

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [uploadedReports, setUploadedReports] = useState<UploadedReport[]>([]);
  const [healthInsights, setHealthInsights] = useState<HealthInsight[]>([]);
  const [savedIntelligence, setSavedIntelligence] = useState<SavedIntelligence[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    setLoading(true);
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      window.location.href = "/login";
      return;
    }

    const user = userData.user;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("username, email, created_at")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    setEmail(profile?.email || user.email || "");
    setUsername(profile?.username || "User");
    setMemberSince(
      profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString()
        : "Recently"
    );

    const { data: organData, error: organError } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (organError) {
      setMessage("Database error: " + organError.message);
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

    const { data: uploadedReportsData } = await supabase
      .from("uploaded_lab_files")
      .select("id, created_at, extraction_status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: insightsData } = await supabase
      .from("health_insights")
      .select("id, ai_status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const insightIds = (insightsData || []).map((item) => item.id);

    let savedIntelligenceData: SavedIntelligence[] = [];

    if (insightIds.length > 0) {
      const { data: savedData } = await supabase
        .from("generated_intelligence_results")
        .select("insight_id, updated_at")
        .eq("user_id", user.id)
        .in("insight_id", insightIds)
        .order("updated_at", { ascending: false });

      savedIntelligenceData = savedData || [];
    }

    setAssessments((organData || []) as Assessment[]);
    setDailyCheckIn((checkInData || null) as DailyCheckIn | null);
    setUploadedReports((uploadedReportsData || []) as UploadedReport[]);
    setHealthInsights((insightsData || []) as HealthInsight[]);
    setSavedIntelligence(savedIntelligenceData);
    setLoading(false);
  }

  const uploadedReportsCount = uploadedReports.length;

  const processedReports = uploadedReports.filter(
    (item) => item.extraction_status === "Completed"
  ).length;

  const pendingReports = uploadedReports.filter(
    (item) => item.extraction_status !== "Completed"
  ).length;

  const latestReportDate =
    uploadedReports.length > 0
      ? new Date(uploadedReports[0].created_at).toLocaleDateString()
      : "";

  const latestAssessment = assessments[0] || null;

  const firstAssessment =
    assessments.length > 0 ? assessments[assessments.length - 1] : null;

  const priorityAssessment =
    assessments.length > 0
      ? [...assessments].sort((a, b) => a.score - b.score)[0]
      : null;

  const scoreInputs = [
    ...assessments.map((item) => item.score),
    ...(dailyCheckIn ? [dailyCheckIn.wellness_score] : []),
  ];

  const overallScore =
    scoreInputs.length > 0
      ? Math.round(
          scoreInputs.reduce((sum, score) => sum + score, 0) /
            scoreInputs.length
        )
      : 0;

  function getStatus(score: number) {
    if (score >= 80) return "Good";
    if (score >= 50) return "Moderate";
    return "High Risk";
  }

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 50) return "moderateScore";
    return "riskScore";
  }

  let completion = 0;

  if (assessments.length > 0) completion += 30;
  if (uploadedReportsCount > 0) completion += 25;
  if (dailyCheckIn) completion += 20;
  if (savedIntelligence.length > 0) completion += 25;

  const healthProfileStatus =
    completion === 0 ? "Not Started" : completion < 75 ? "Building" : "Active";

  const recommendedAction =
    assessments.length === 0
      ? {
          label: "Start your first health assessment",
          description:
            "Complete one organ assessment so OrganHeal can begin building your saved health identity.",
          href: "/assessment",
          buttonText: "Start Assessment",
        }
      : uploadedReportsCount === 0
      ? {
          label: "Upload your first medical report",
          description:
            "Add a lab report, radiology report, or medical document to strengthen your health profile.",
          href: "/lab-upload",
          buttonText: "Upload Report",
        }
      : savedIntelligence.length === 0
      ? {
          label: "Generate saved health intelligence",
          description:
            "Open Intelligence Center to generate and save insights from your reports.",
          href: "/intelligence",
          buttonText: "Open Intelligence",
        }
      : !dailyCheckIn
      ? {
          label: "Complete your first wellness check-in",
          description:
            "Add your latest sleep, mood, stress, hydration, energy, and activity status.",
          href: "/checkin",
          buttonText: "Open Check-In",
        }
      : {
          label: "Continue your follow-up plan",
          description:
            "Your profile is active. Review your health plan, action tasks, and follow-up rhythm.",
          href: "/health-plan",
          buttonText: "Open Health Plan",
        };

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">USER PROFILE</p>
          <h1>Your OrganHeal Profile</h1>
          <p>
            Your saved health identity, account summary, health data progress,
            reports, intelligence, and recommended next step.
          </p>
        </div>

        <div className="chatWindow">
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">Loading Profile</p>
              <h2>Preparing your health identity...</h2>
            </div>
          )}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">Profile Notice</p>
              <h2>Could not load profile</h2>
              <p>{message}</p>
            </div>
          )}

          {!loading && !message && (
            <>
              <div className="healthIdentityHero">
                <div>
                  <p className="sectionLabel">Health Identity</p>
                  <h2>{username}</h2>
                  <p>{email}</p>
                  <p>Member since: {memberSince}</p>
                  <p>Health Profile Completion: {completion}%</p>
                </div>

                <div className="healthIdentityStatus">
                  <span>{completion}%</span>
                  <p>{healthProfileStatus}</p>
                </div>
              </div>

              <div
                className="resultBox"
                style={{
                  marginTop: "18px",
                  marginBottom: "20px",
                  border: "1px solid rgba(34,211,238,0.22)",
                }}
              >
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
                  <p className="sectionLabel">Overall Health Score</p>
                  <h2 className={getScoreClass(overallScore)}>
                    {overallScore}/100
                  </h2>
                  <h3>
                    {scoreInputs.length > 0 ? getStatus(overallScore) : "No Data Yet"}
                  </h3>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Saved Organ Assessments</p>
                  <h2>{assessments.length}</h2>
                  <p>Total saved organ modules.</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Uploaded Reports</p>
                  <h2>{uploadedReportsCount}</h2>
                  <p>
                    {processedReports} processed · {pendingReports} pending
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Saved Intelligence</p>
                  <h2>{savedIntelligence.length}</h2>
                  <p>Saved intelligence results connected to your reports.</p>
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
                      : "No wellness check-in yet"}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Priority Organ</p>
                  <h2>{priorityAssessment?.organ_name || "N/A"}</h2>
                  <p>
                    {priorityAssessment
                      ? `Lowest current score: ${priorityAssessment.score}/100`
                      : "Complete assessments to identify your priority organ."}
                  </p>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Saved Data Summary</p>

                <h2>{completion}% Complete</h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    marginBottom: "18px",
                  }}
                >
                  This summary shows the main data currently connected to your
                  OrganHeal profile.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <div>
                    <strong>Assessments</strong>
                    <p>{assessments.length}</p>
                  </div>

                  <div>
                    <strong>Reports</strong>
                    <p>{uploadedReportsCount}</p>
                  </div>

                  <div>
                    <strong>Saved Intelligence</strong>
                    <p>{savedIntelligence.length}</p>
                  </div>

                  <div>
                    <strong>Check-In</strong>
                    <p>{dailyCheckIn ? "Active" : "Not started"}</p>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Health Journey Timeline</p>

                <div className="healthTimeline">
                  <div className="timelineItem active">
                    <strong>Account Created</strong>
                    <span>{memberSince}</span>
                  </div>

                  <div
                    className={firstAssessment ? "timelineItem active" : "timelineItem"}
                  >
                    <strong>First Assessment</strong>
                    <span>
                      {firstAssessment
                        ? `${firstAssessment.organ_name} · ${new Date(
                            firstAssessment.created_at
                          ).toLocaleDateString()}`
                        : "Not started yet"}
                    </span>
                  </div>

                  <div
                    className={latestAssessment ? "timelineItem active" : "timelineItem"}
                  >
                    <strong>Latest Assessment</strong>
                    <span>
                      {latestAssessment
                        ? `${latestAssessment.organ_name} · ${latestAssessment.score}/100`
                        : "No latest assessment"}
                    </span>
                  </div>

                  <div
                    className={
                      uploadedReportsCount > 0 ? "timelineItem active" : "timelineItem"
                    }
                  >
                    <strong>Medical Reports Uploaded</strong>
                    <span>
                      {uploadedReportsCount > 0
                        ? `${uploadedReportsCount} report(s) · Latest: ${latestReportDate}`
                        : "No reports uploaded yet"}
                    </span>
                  </div>

                  <div
                    className={
                      savedIntelligence.length > 0
                        ? "timelineItem active"
                        : "timelineItem"
                    }
                  >
                    <strong>Health Intelligence Saved</strong>
                    <span>
                      {savedIntelligence.length > 0
                        ? `${savedIntelligence.length} saved result(s)`
                        : "No saved intelligence yet"}
                    </span>
                  </div>

                  <div className={dailyCheckIn ? "timelineItem active" : "timelineItem"}>
                    <strong>Wellness Check-In</strong>
                    <span>
                      {dailyCheckIn
                        ? `${dailyCheckIn.wellness_score}/100 · ${dailyCheckIn.mood}`
                        : "No check-in yet"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Profile Journey</p>

                <h2>Continue from your saved identity</h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    maxWidth: "760px",
                    margin: "0 auto 22px",
                  }}
                >
                  Your profile connects your account, assessments, reports,
                  intelligence results, check-ins, and follow-up plan.
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Link href="/dashboard" className="secondaryBtn">
                    Dashboard
                  </Link>

                  <Link href="/reports" className="secondaryBtn">
                    Reports
                  </Link>

                  <Link href="/intelligence" className="primaryBtn">
                    Intelligence
                  </Link>

                  <Link href="/health-plan" className="secondaryBtn">
                    Health Plan
                  </Link>

                  <Link href="/checkin" className="secondaryBtn">
                    Check-In
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
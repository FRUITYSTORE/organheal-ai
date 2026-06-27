"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Assessment = {
  organ_name: string;
  score: number;
  created_at: string;
};

type LabReport = {
  score: number;
  created_at: string;
};
type Profile = {
  username: string | null;
  email: string | null;
  created_at: string | null;
};

type UploadedReport = {
  id: number;
};
export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
const [memberSince, setMemberSince] = useState("");
const [uploadedReportsCount, setUploadedReportsCount] = useState(0);
const [latestReportDate, setLatestReportDate] = useState("");
const [pendingReports, setPendingReports] = useState(0);
const [processedReports, setProcessedReports] = useState(0);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    setLoading(true);

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

    const { data: labData, error: labError } = await supabase
      .from("lab_reports")
      .select("score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (labError && labError.code !== "PGRST116") {
      setMessage("Database error: " + labError.message);
      setLoading(false);
      return;
    }
const { data: uploadedReports } = await supabase
  .from("uploaded_lab_files")
  .select("id, created_at, extraction_status")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });

setUploadedReportsCount((uploadedReports || []).length);
setProcessedReports(
  (uploadedReports || []).filter(
    (item) => item.extraction_status === "Completed"
  ).length
);

setPendingReports(
  (uploadedReports || []).filter(
    (item) => item.extraction_status !== "Completed"
  ).length
);
setLatestReportDate(
  uploadedReports && uploadedReports.length > 0
    ? new Date(uploadedReports[0].created_at).toLocaleDateString()
    : ""
);
    setAssessments(organData || []);
    setLabReport(labData || null);
    setLoading(false);
  }

  const allScores = [
    ...assessments.map((item) => item.score),
    ...(labReport ? [labReport.score] : []),
  ];

  const overallScore =
    allScores.length > 0
      ? Math.round(
          allScores.reduce((sum, score) => sum + score, 0) / allScores.length
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
const priorityAssessment =
  assessments.length > 0
    ? [...assessments].sort((a, b) => a.score - b.score)[0]
    : null;

const healthProfileStatus =
  allScores.length === 0
    ? "Not Started"
    : allScores.length < 3
    ? "Building"
    : "Active";
    let completion = 0;

if (assessments.length > 0) completion += 40;
if (uploadedReportsCount > 0) completion += 30;
if (allScores.length >= 3) completion += 30;
const firstAssessment =
  assessments.length > 0
    ? assessments[assessments.length - 1]
    : null;

const latestAssessment =
  assessments.length > 0 ? assessments[0] : null;
    const recommendedAction =
    assessments.length === 0
      ? {
          label: "Complete your first organ assessment",
          description:
            "Start by completing one organ assessment so OrganHeal can begin building your health profile.",
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
      : healthProfileStatus !== "Active"
      ? {
          label: "Continue building your health profile",
          description:
            "Complete more assessments to improve your profile completion and activate stronger health intelligence.",
          href: "/assessment",
          buttonText: "Continue Assessment",
        }
      : {
          label: "Review your Health Intelligence Center",
          description:
            "Your profile is active. Review your intelligence insights, reports, and next health opportunities.",
          href: "/intelligence",
          buttonText: "Open Intelligence",
        };
  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">USER PROFILE</p>
          <h1>Your OrganHeal Profile</h1>
          <p>
  View your account summary, health profile progress, saved assessments,
  and uploaded medical reports.
</p>
        </div>

        <div className="chatWindow">
          {loading && <p>Loading profile...</p>}

          {!loading && message && (
            <div className="resultBox">
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

  <a href={recommendedAction.href}>
    <button className="primaryBtn">{recommendedAction.buttonText}</button>
  </a>
</div>

              <div className="assessmentForm">
                <div className="resultBox">
                  <p className="sectionLabel">Overall Health Score</p>
                  <h2 className={getScoreClass(overallScore)}>
                    {overallScore}/100
                  </h2>
                  <h3>
                    {allScores.length > 0 ? getStatus(overallScore) : "No Data Yet"}
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
  <p>Total medical reports uploaded.</p>
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
                
<div className="resultBox">
  <p className="sectionLabel">Health Journey Timeline</p>

  <div className="healthTimeline">
    <div className="timelineItem active">
      <strong>Account Created</strong>
      <span>{memberSince}</span>
    </div>

    <div className={firstAssessment ? "timelineItem active" : "timelineItem"}>
      <strong>First Assessment</strong>
      <span>
        {firstAssessment
          ? `${firstAssessment.organ_name} • ${new Date(
              firstAssessment.created_at
            ).toLocaleDateString()}`
          : "Not started yet"}
      </span>
    </div>

    <div className={latestAssessment ? "timelineItem active" : "timelineItem"}>
      <strong>Latest Assessment</strong>
      <span>
        {latestAssessment
          ? `${latestAssessment.organ_name} • ${latestAssessment.score}/100`
          : "No latest assessment"}
      </span>
    </div>

    <div className={uploadedReportsCount > 0 ? "timelineItem active" : "timelineItem"}>
      <strong>Medical Reports Uploaded</strong>
      <span>
        {uploadedReportsCount > 0
          ? `${uploadedReportsCount} report(s) • Latest: ${latestReportDate}`
          : "No reports uploaded yet"}
      </span>
    </div>

    <div className={healthProfileStatus === "Active" ? "timelineItem active" : "timelineItem"}>
      <strong>Health Intelligence Activated</strong>
      <span>
        {healthProfileStatus === "Active"
          ? "Your health profile is active"
          : "Complete more data to activate full intelligence"}
      </span>
    </div>
  </div>
</div>
<div className="resultBox">
  <p className="sectionLabel">Profile Snapshot</p>

  <h2>{completion}% Complete</h2>

  <p
    style={{
      opacity: 0.82,
      lineHeight: 1.7,
      marginBottom: "16px",
    }}
  >
    A short summary of your current OrganHeal profile status without repeating
    the full dashboard.
  </p>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
      gap: "14px",
    }}
  >
    <div>
      <strong>Status</strong>
      <p>{healthProfileStatus}</p>
    </div>

    <div>
      <strong>Saved Assessments</strong>
      <p>{assessments.length}</p>
    </div>

    <div>
      <strong>Reports</strong>
      <p>
        {uploadedReportsCount} total • {processedReports} processed
      </p>
    </div>

    <div>
      <strong>Priority Focus</strong>
      <p>{priorityAssessment?.organ_name || "Not identified yet"}</p>
    </div>
  </div>
</div>

  <div style={{ marginTop: "20px" }}>
  <strong>Next Recommended Action</strong>
  <p>{recommendedAction.label}</p>
</div>
</div>
                <div className="resultBox">
                  <p className="sectionLabel">Quick Actions</p>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                   <p
  style={{
    margin: 0,
    opacity: 0.72,
    lineHeight: 1.7,
    textAlign: "center",
  }}
>
  Use the recommended step above to continue building your OrganHeal profile.
</p>
                  </div>
                </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
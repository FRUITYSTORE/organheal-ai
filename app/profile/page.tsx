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
  .select("id")
  .eq("user_id", user.id);

setUploadedReportsCount((uploadedReports || []).length);
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
  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">USER PROFILE</p>
          <h1>Your OrganHeal Profile</h1>
          <p>
            View your account summary, saved assessments, latest lab score, and
            overall health intelligence.
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
                  <p className="sectionLabel">Latest Lab Score</p>
                  {labReport ? (
                    <>
                      <h2 className={getScoreClass(labReport.score)}>
                        {labReport.score}/100
                      </h2>
                      <h3>{getStatus(labReport.score)}</h3>
                    </>
                  ) : (
                    <p>No lab report saved yet.</p>
                  )}
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
                    <a href="/dashboard">
                      <button className="primaryBtn">Dashboard</button>
                    </a>

                    <a href="/organ-report">
                      <button className="secondaryBtn">Report</button>
                    </a>

                    <a href="/history">
                      <button className="secondaryBtn">History</button>
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
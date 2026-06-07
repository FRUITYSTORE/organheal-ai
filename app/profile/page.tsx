"use client";

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

export default function ProfilePage() {
  const [email, setEmail] = useState("");
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
      setMessage("Please login or sign up to access your profile.");
      setLoading(false);
      return;
    }

    const user = userData.user;
    setEmail(user.email || "");

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

    setAssessments(organData || []);
    setLabReport(labData || null);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
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

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
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
              <p className="sectionLabel">Login Required</p>
              <h2>Access Protected</h2>
              <p>{message}</p>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <a href="/login">
                  <button className="primaryBtn">Login</button>
                </a>

                <a href="/signup">
                  <button className="secondaryBtn">Sign Up</button>
                </a>
              </div>
            </div>
          )}

          {!loading && !message && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">Account</p>
                <h2>{email}</h2>
                <p>Your active OrganHeal AI account.</p>
              </div>

              <div className="assessmentForm">
                <div className="resultBox">
                  <p className="sectionLabel">Overall Health Score</p>
                  <h2 className={getScoreClass(overallScore)}>
                    {overallScore}/100
                  </h2>
                  <h3>{allScores.length > 0 ? getStatus(overallScore) : "No Data Yet"}</h3>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Saved Organ Assessments</p>
                  <h2>{assessments.length}</h2>
                  <p>Total saved organ modules.</p>
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

                    <button className="secondaryBtn" onClick={logout}>
                      Logout
                    </button>
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
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import DashboardEmptyState from "../components/DashboardEmptyState";

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

export default function DashboardPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Please login or sign up to access your dashboard.");
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

  function getProgressColor(score: number) {
    if (score >= 80) return "linear-gradient(90deg, #22c55e, #38bdf8)";
    if (score >= 50) return "linear-gradient(90deg, #f59e0b, #facc15)";
    return "linear-gradient(90deg, #ef4444, #f97316)";
  }

  function getAIRecommendation(moduleName: string | null) {
    switch (moduleName) {
      case "Heart":
        return "Monitor blood pressure, cholesterol, physical activity, and body weight.";
      case "Lung":
        return "Avoid smoking exposure and monitor cough, wheezing, or shortness of breath.";
      case "Kidney":
        return "Maintain hydration, monitor blood pressure, and consider kidney function follow-up.";
      case "Liver":
        return "Focus on healthy nutrition, weight control, and reducing liver stressors.";
      case "Brain":
        return "Improve sleep quality, physical activity, and stress reduction habits.";
      case "Metabolic":
        return "Focus on blood sugar control, healthy weight, physical activity, and nutrition.";
      default:
        return "Continue regular health monitoring and preventive assessments.";
    }
  }

  function generateCoachMessage(
    priorityOrgan: string,
    strongestOrgan: string,
    overallScore: number
  ) {
    let coachMessage = "";

    if (overallScore >= 80) {
      coachMessage +=
        "Excellent progress. Your overall health profile is currently strong. ";
    } else if (overallScore >= 60) {
      coachMessage +=
        "Your health profile shows moderate performance with opportunities for improvement. ";
    } else {
      coachMessage +=
        "Several health areas require closer attention and follow-up. ";
    }

    coachMessage += `Your strongest area is ${strongestOrgan}. `;
    coachMessage += `Your current priority area is ${priorityOrgan}. `;
    coachMessage += getAIRecommendation(priorityOrgan);

    return coachMessage;
  }

  function generateTodayMission(priorityOrgan: string, currentScore: number) {
    const targetScore = currentScore < 50 ? 70 : currentScore < 80 ? 85 : 95;
    const progress = Math.min(
      100,
      Math.round((currentScore / targetScore) * 100)
    );

    return {
      priorityOrgan,
      currentScore,
      targetScore,
      progress,
      nextReview: "7 days",
    };
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

  const topStrength =
    assessments.length > 0
      ? [...assessments].sort((a, b) => b.score - a.score)[0]
      : null;

  const priorityAttention =
    assessments.length > 0
      ? [...assessments].sort((a, b) => a.score - b.score)[0]
      : null;

  const latestDate = [...assessments.map((item) => item.created_at)]
    .concat(labReport ? [labReport.created_at] : [])
    .concat(dailyCheckIn ? [dailyCheckIn.created_at] : [])
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  const todayMission = priorityAttention
    ? generateTodayMission(priorityAttention.organ_name, priorityAttention.score)
    : null;

  const healthCoachMessage =
    assessments.length > 0
      ? generateCoachMessage(
          priorityAttention?.organ_name || "General Health",
          topStrength?.organ_name || "General Health",
          overallScore
        )
      : "Complete your first organ assessment to receive personalized health guidance.";

  const notifications = [];

  if (assessments.length === 0) {
    notifications.push(
      "Complete your first organ assessment to unlock health intelligence."
    );
  }

  if (!dailyCheckIn) {
    notifications.push("Daily Check-In pending. Track today's wellness status.");
  }

  if (!labReport) {
    notifications.push(
      "No lab report found. Upload laboratory results for deeper insights."
    );
  }

  if (priorityAttention) {
    notifications.push(
      `${priorityAttention.organ_name} currently requires the most attention.`
    );
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">ORGANHEAL DASHBOARD</p>
          <h1>Dashboard Intelligence</h1>
          <p>
            A focused overview of your health intelligence, daily wellness, and
            next recommended action.
          </p>
        </div>

        <div className="chatWindow">
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">Loading Dashboard</p>
              <h2>Preparing your health intelligence...</h2>

              <div style={{ display: "grid", gap: "16px", marginTop: "20px" }}>
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    style={{
                      height: "90px",
                      borderRadius: "18px",
                      background:
                        "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(34,211,238,0.18), rgba(255,255,255,0.08))",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

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
                <Link href="/login">
                  <button className="primaryBtn">Login</button>
                </Link>

                <Link href="/signup">
                  <button className="secondaryBtn">Sign Up</button>
                </Link>
              </div>
            </div>
          )}

          {!loading && !message && allScores.length === 0 && (
            <DashboardEmptyState
              title="Your Dashboard Is Ready"
              description="Start your first organ assessment to unlock your health score, health plan, and professional report."
              buttonText="Start First Assessment"
              href="/assessment"
            />
          )}

          {!loading && !message && allScores.length > 0 && (
            <>
              {priorityAttention && (
                <div className="priorityAlert">
                  <h3>🚨 Health Priority Alert</h3>
                  <p>
                    <strong>{priorityAttention.organ_name}</strong> currently
                    has the lowest score ({priorityAttention.score}/100).
                  </p>
                  <p>{getAIRecommendation(priorityAttention.organ_name)}</p>
                </div>
              )}

              <div className="resultBox">
                <p className="sectionLabel">Overall Health Intelligence</p>

                <h2 className={getScoreClass(overallScore)}>
                  {overallScore}/100
                </h2>

                <h3>{getStatus(overallScore)}</h3>

                <p>
                  Completed data sources:{" "}
                  {assessments.length +
                    (labReport ? 1 : 0) +
                    (dailyCheckIn ? 1 : 0)}
                </p>

                {latestDate && (
                  <p>Last updated: {new Date(latestDate).toLocaleString()}</p>
                )}

                <div
                  style={{
                    width: "100%",
                    height: "14px",
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: "999px",
                    overflow: "hidden",
                    marginTop: "16px",
                  }}
                >
                  <div
                    style={{
                      width: `${overallScore}%`,
                      height: "100%",
                      background: getProgressColor(overallScore),
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>

              {todayMission && (
                <div className="resultBox">
                  <p className="sectionLabel">🎯 Today's Health Mission</p>

                  <h2>{todayMission.priorityOrgan}</h2>

                  <p>Current Score: {todayMission.currentScore}/100</p>
                  <p>Target Score: {todayMission.targetScore}/100</p>
                  <p>Progress: {todayMission.progress}%</p>

                  <div
                    style={{
                      width: "100%",
                      height: "12px",
                      background: "rgba(255,255,255,0.12)",
                      borderRadius: "999px",
                      overflow: "hidden",
                      marginTop: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: `${todayMission.progress}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #22c55e, #38bdf8)",
                        borderRadius: "999px",
                      }}
                    />
                  </div>

                  <p style={{ marginTop: "14px" }}>
                    Recommended Action:{" "}
                    {getAIRecommendation(todayMission.priorityOrgan)}
                  </p>

                  <p>Next Review: {todayMission.nextReview}</p>

                  <Link href="/health-plan">
                    <button className="primaryBtn">Start Mission</button>
                  </Link>
                </div>
              )}

              <div className="resultBox">
                <p className="sectionLabel">☀️ Latest Daily Check-In</p>

                {dailyCheckIn ? (
                  <>
                    <h2 className={getScoreClass(dailyCheckIn.wellness_score)}>
                      {dailyCheckIn.wellness_score}/100
                    </h2>

                    <h3>{dailyCheckIn.mood}</h3>

                    <p>
                      Last check-in:{" "}
                      {new Date(dailyCheckIn.created_at).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <>
                    <h2>No check-in yet</h2>
                    <p>
                      Complete your daily check-in to track wellness patterns.
                    </p>

                    <Link href="/checkin">
                      <button className="primaryBtn">
                        Start Daily Check-In
                      </button>
                    </Link>
                  </>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">🔔 Notifications Center</p>
                <h2>Health Notifications</h2>

                {notifications.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                      marginTop: "18px",
                    }}
                  >
                    {notifications.map((notification, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "14px",
                          borderRadius: "14px",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {notification}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No active notifications.</p>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">🤖 AI Health Coach</p>
                <h2>Personalized Guidance</h2>
                <p>{healthCoachMessage}</p>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Link href="/health-plan">
                  <button className="primaryBtn">Health Plan</button>
                </Link>

                <Link href="/history">
                  <button className="secondaryBtn">Health History</button>
                </Link>

                <Link href="/organ-report">
                  <button className="secondaryBtn">Full Report</button>
                </Link>

                <Link href="/checkin">
                  <button className="secondaryBtn">Daily Check-In</button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
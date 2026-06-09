"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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

const organs = [
  { name: "Heart", icon: "❤️", path: "/heart" },
  { name: "Lung", icon: "🫁", path: "/lung" },
  { name: "Kidney", icon: "🩺", path: "/kidney" },
  { name: "Liver", icon: "🧬", path: "/liver" },
  { name: "Brain", icon: "🧠", path: "/brain" },
  { name: "Metabolic", icon: "⚡", path: "/metabolic" },
];

export default function DashboardPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError) {
      setMessage("Please login or sign up to access your dashboard.");
      setLoading(false);
      return;
    }

    const user = userData.user;

    if (!user) {
      setMessage("Please login or sign up to access your dashboard.");
      setLoading(false);
      return;
    }

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

    setAssessments(organData || []);
    setLabReport(labData || null);
    setLoading(false);
  }

  function getAssessment(organName: string) {
    return assessments.find((item) => item.organ_name === organName);
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

function getAIRecommendation(
  moduleName: string | null,
  score?: number
) {
  if (!moduleName) {
    return {
      priority: "No Data",
      explanation:
        "Complete your assessments to receive personalized health insights.",
      action:
        "Start the organ assessments and lab analyzer.",
      followUp:
        "No follow-up recommendations available yet.",
    };
  }

  switch (moduleName) {
    case "Heart":
      return {
        priority:
          score && score < 50 ? "High Priority" : "Monitor",
        explanation:
          "Your responses suggest cardiovascular risk factors that may benefit from lifestyle improvement and professional review.",
        action:
          "Monitor blood pressure, cholesterol, physical activity, and body weight.",
        followUp:
          "Consider blood pressure assessment, lipid profile, and cardiovascular evaluation.",
      };

    case "Lung":
      return {
        priority:
          score && score < 50 ? "High Priority" : "Monitor",
        explanation:
          "Your responses suggest respiratory health factors that deserve attention.",
        action:
          "Avoid smoking exposure and monitor symptoms such as cough, wheezing, or shortness of breath.",
        followUp:
          "Consider lung function assessment if symptoms persist.",
      };

    case "Kidney":
      return {
        priority:
          score && score < 50 ? "High Priority" : "Monitor",
        explanation:
          "Your assessment indicates kidney-related factors that may require closer monitoring.",
        action:
          "Maintain hydration, monitor blood pressure, and avoid unnecessary kidney stressors.",
        followUp:
          "Consider kidney function tests, urine analysis, and healthcare review.",
      };

    case "Liver":
      return {
        priority:
          score && score < 50 ? "High Priority" : "Monitor",
        explanation:
          "Your assessment suggests possible liver-health concerns.",
        action:
          "Focus on healthy nutrition, weight control, and limiting liver stressors.",
        followUp:
          "Consider liver enzyme testing and medical follow-up when appropriate.",
      };

    case "Brain":
      return {
        priority:
          score && score < 50 ? "High Priority" : "Monitor",
        explanation:
          "Your responses suggest areas where cognitive wellness and stress management may help.",
        action:
          "Improve sleep quality, physical activity, and stress reduction habits.",
        followUp:
          "Discuss persistent headaches, memory concerns, or neurological symptoms with a healthcare professional.",
      };

    case "Metabolic":
      return {
        priority:
          score && score < 50 ? "High Priority" : "Monitor",
        explanation:
          "Your assessment suggests metabolic risk factors that may benefit from lifestyle improvement.",
        action:
          "Focus on blood sugar control, healthy weight, physical activity, and nutrition.",
        followUp:
          "Consider HbA1c, glucose monitoring, and lipid profile review.",
      };

    default:
      return {
        priority: "Monitor",
        explanation:
          "Continue monitoring your health and maintaining healthy lifestyle habits.",
        action:
          "Stay active, eat a balanced diet, and attend regular checkups.",
        followUp:
          "Discuss any persistent symptoms with a healthcare professional.",
      };
  }
}
function generateCoachMessage(
  priorityOrgan: string,
  strongestOrgan: string,
  overallScore: number
) {
  let message = "";

  if (overallScore >= 80) {
    message +=
      "Excellent progress. Your overall health profile is currently strong. ";
  } else if (overallScore >= 60) {
    message +=
      "Your health profile shows moderate performance with opportunities for improvement. ";
  } else {
    message +=
      "Several health areas require closer attention and follow-up. ";
  }

  message += `Your strongest area is ${strongestOrgan}. `;
  message += `Your current priority area is ${priorityOrgan}. `;

  switch (priorityOrgan) {
    case "Heart":
      message +=
        "Focus on blood pressure, cholesterol management, exercise, and smoking avoidance.";
      break;
    case "Lung":
      message +=
        "Focus on respiratory health, physical activity, smoking avoidance, and symptom monitoring.";
      break;
    case "Kidney":
      message +=
        "Focus on hydration, blood pressure control, and kidney function follow-up.";
      break;
    case "Liver":
      message +=
        "Focus on healthy nutrition, weight control, and reducing liver stressors.";
      break;
    case "Brain":
      message +=
        "Focus on sleep quality, stress management, and cognitive wellness.";
      break;
    case "Metabolic":
      message +=
        "Focus on blood sugar control, weight management, and physical activity.";
      break;
    default:
      message +=
        "Continue regular health monitoring and preventive assessments.";
  }

  return message;
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
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  const dashboardInsights = {
  overallScore,
  status: allScores.length > 0 ? getStatus(overallScore) : "No Data Yet",
  topStrength,
  priorityAttention,
  latestLab: labReport,
  latestDate,
  completedModules: assessments.length + (labReport ? 1 : 0),
  totalModules: organs.length + 1,
  aiRecommendation: getAIRecommendation(
    priorityAttention ? priorityAttention.organ_name : null,
    priorityAttention ? priorityAttention.score : undefined
  ),
  healthCoachMessage: generateCoachMessage(
    priorityAttention?.organ_name || "General Health",
    topStrength?.organ_name || "General Health",
    overallScore
  ),
};

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">ORGANHEAL DASHBOARD</p>
          <h1>Dashboard Intelligence</h1>
          <p>
            View your overall health intelligence, priority areas, strongest
            score, latest lab score, and personalized guidance.
          </p>
        </div>

        <div className="chatWindow">
          {loading && <p>Loading dashboard...</p>}

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
              {dashboardInsights.priorityAttention && (
                <div className="priorityAlert">
                  <h3>🚨 Health Priority Alert</h3>
                  <p>
                    <strong>
                      {dashboardInsights.priorityAttention.organ_name}
                    </strong>{" "}
                    currently has the lowest score (
                    {dashboardInsights.priorityAttention.score}/100).
                  </p>
                  <p>{dashboardInsights.aiRecommendation.action}</p>
                </div>
              )}

              <div className="resultBox">
                <p className="sectionLabel">Overall Health Intelligence</p>

                <h2 className={getScoreClass(dashboardInsights.overallScore)}>
                  {dashboardInsights.overallScore}/100
                </h2>

                <h3>{dashboardInsights.status}</h3>

                <p>
                  Completed modules: {dashboardInsights.completedModules} /{" "}
                  {dashboardInsights.totalModules}
                </p>

                {dashboardInsights.latestDate && (
                  <p>
                    Last updated:{" "}
                    {new Date(dashboardInsights.latestDate).toLocaleString()}
                  </p>
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
                      width: `${dashboardInsights.overallScore}%`,
                      height: "100%",
                      background: getProgressColor(
                        dashboardInsights.overallScore
                      ),
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>

              <div className="assessmentForm">
                <div className="resultBox">
                  <p className="sectionLabel">🏆 Top Strength</p>

                  {dashboardInsights.topStrength ? (
                    <>
                      <h2
                        className={getScoreClass(
                          dashboardInsights.topStrength.score
                        )}
                      >
                        {dashboardInsights.topStrength.organ_name}
                      </h2>

                      <h3>{dashboardInsights.topStrength.score}/100</h3>

                      <p>{getStatus(dashboardInsights.topStrength.score)}</p>
                    </>
                  ) : (
                    <p>No organ assessment data yet.</p>
                  )}
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">⚠️ Priority Attention</p>

                  {dashboardInsights.priorityAttention ? (
                    <>
                      <h2
                        className={getScoreClass(
                          dashboardInsights.priorityAttention.score
                        )}
                      >
                        {dashboardInsights.priorityAttention.organ_name}
                      </h2>

                      <h3>
                        {dashboardInsights.priorityAttention.score}/100
                      </h3>

                      <p>
                        {getStatus(
                          dashboardInsights.priorityAttention.score
                        )}
                      </p>
                    </>
                  ) : (
                    <p>No organ assessment data yet.</p>
                  )}
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">🧪 Latest Lab Score</p>

                  {dashboardInsights.latestLab ? (
                    <>
                      <h2
                        className={getScoreClass(
                          dashboardInsights.latestLab.score
                        )}
                      >
                        {dashboardInsights.latestLab.score}/100
                      </h2>

                      <h3>{getStatus(dashboardInsights.latestLab.score)}</h3>

                      <p>{dashboardInsights.latestLab.interpretation}</p>
                    </>
                  ) : (
                    <>
                      <h2>No lab score yet</h2>
                      <p>Complete the Lab Analyzer to include it here.</p>

                      <a href="/lab-analyzer">
                        <button className="primaryBtn">
                          Start Lab Analyzer
                        </button>
                      </a>
                    </>
                  )}
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">🤖 AI Health Insights</p>

                  <p>
                    <strong>Priority:</strong>{" "}
                    {dashboardInsights.aiRecommendation.priority}
                  </p>

                  <p>
                    <strong>Explanation:</strong>{" "}
                    {dashboardInsights.aiRecommendation.explanation}
                  </p>

                  <p>
                    <strong>Recommended Action:</strong>{" "}
                    {dashboardInsights.aiRecommendation.action}
                  </p>

                  <p>
                    <strong>Suggested Follow-Up:</strong>{" "}
                    {dashboardInsights.aiRecommendation.followUp}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">🤖 AI Health Coach</p>
                  <h2>Personalized Guidance</h2>
                  <p>{dashboardInsights.healthCoachMessage}</p>
                </div>
              </div>
<div className="resultBox">
  <p className="sectionLabel">🎯 AI Health Plan</p>

  <h2>
    {dashboardInsights.priorityAttention?.organ_name || "No Priority Area"}
  </h2>

  <p>
    <strong>Immediate Action:</strong>
  </p>

  <p>
    {dashboardInsights.aiRecommendation.action}
  </p>

  <p>
    <strong>This Week:</strong>
  </p>

  <p>
    Complete follow-up activities related to{" "}
    {dashboardInsights.priorityAttention?.organ_name || "your assessments"}.
  </p>

  <p>
    <strong>Next Follow-Up:</strong>
  </p>

  <p>
    {dashboardInsights.aiRecommendation.followUp}
  </p>

  <p>
    <strong>Improvement Goal:</strong>
  </p>

  <p>
    Raise{" "}
    {dashboardInsights.priorityAttention?.organ_name || "Health"} score by
    at least 20 points during the next assessment cycle.
  </p>
</div>
<div className="resultBox">
  <p className="sectionLabel">🗺️ Health Roadmap</p>

  <p>✅ Assessment Completed</p>

  <p>📌 Week 1: Follow recommended actions</p>

  <p>📌 Week 2: Complete suggested laboratory tests</p>

  <p>📌 Week 4: Reassess priority organ</p>

  <p>
    🎯 Goal:
    Improve {dashboardInsights.priorityAttention?.organ_name || "Health"} score
    and reduce overall risk level.
  </p>
</div>
              <div className="assessmentForm">
                {organs.map((organ) => {
                  const assessment = getAssessment(organ.name);

                  return (
                    <div className="resultBox" key={organ.name}>
                      <p className="sectionLabel">
                        {organ.icon} {organ.name}
                      </p>

                      {assessment ? (
                        <>
                          <h2 className={getScoreClass(assessment.score)}>
                            {assessment.score}/100
                          </h2>

                          <h3>{getStatus(assessment.score)}</h3>

                          <p>{assessment.notes}</p>

                          <p>
                            Last saved:{" "}
                            {new Date(
                              assessment.created_at
                            ).toLocaleString()}
                          </p>

                          <a href={organ.path}>
                            <button className="secondaryBtn">
                              Reassess {organ.name}
                            </button>
                          </a>
                        </>
                      ) : (
                        <>
                          <h2>No score yet</h2>
                          <p>
                            Complete this assessment to include it in your
                            dashboard and overall score.
                          </p>

                          <a href={organ.path}>
                            <button className="primaryBtn">
                              Start {organ.name} Assessment
                            </button>
                          </a>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <a href="/organ-report">
                  <button className="primaryBtn">View Full Organ Report</button>
                </a>

                <a href="/lab-analyzer">
                  <button className="secondaryBtn">Open Lab Analyzer</button>
                </a>

                <a href="/history">
                  <button className="secondaryBtn">View Health History</button>
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
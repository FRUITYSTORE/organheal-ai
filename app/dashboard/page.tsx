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
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchAssessments();
  }, []);

  async function fetchAssessments() {
    setLoading(true);

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError) {
      setMessage("Auth error: " + userError.message);
      setLoading(false);
      return;
    }

    const user = userData.user;

    if (!user) {
      setMessage("Please login to view your dashboard.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level, notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Database error: " + error.message);
      setLoading(false);
      return;
    }

    setAssessments(data || []);
    setLoading(false);
  }

  function getAssessment(organName: string) {
    return assessments.find((item) => item.organ_name === organName);
  }

  const completedAssessments = assessments.length;

  const overallScore =
    completedAssessments > 0
      ? Math.round(
          assessments.reduce((sum, item) => sum + item.score, 0) /
            completedAssessments
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
          <p className="assistantBadge">ORGANHEAL DASHBOARD</p>
          <h1>Your Health Dashboard</h1>
          <p>
            Track your organ assessment scores and continue your saved health
            evaluations.
          </p>
        </div>

        <div className="chatWindow">
          {loading && <p>Loading dashboard...</p>}

          {!loading && message && <p>{message}</p>}

          {!loading && !message && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">Overall Organ Health Score</p>

                <h2 className={getScoreClass(overallScore)}>
                  {overallScore}/100
                </h2>

                <h3>{completedAssessments > 0 ? getStatus(overallScore) : "No Data Yet"}</h3>

                <p>
                  Completed assessments: {completedAssessments} / {organs.length}
                </p>

                <div
                  style={{
                    width: "100%",
                    height: "12px",
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
                      background: "linear-gradient(90deg, #22c55e, #38bdf8)",
                      borderRadius: "999px",
                    }}
                  />
                </div>
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

                          <h3>{assessment.risk_level}</h3>

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

              <a href="/organ-report">
                <button className="primaryBtn">View Full Organ Report</button>
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
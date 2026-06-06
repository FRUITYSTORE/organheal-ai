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

export default function OrganReportPage() {
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
      setMessage("Please login to view your organ report.");
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

  const overallScore =
    assessments.length > 0
      ? Math.round(
          assessments.reduce((sum, item) => sum + item.score, 0) /
            assessments.length
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
          <p className="assistantBadge">ORGAN HEALTH REPORT</p>
          <h1>Your Organ Health Report</h1>
          <p>
            This report summarizes your saved organ assessments from Supabase.
          </p>
        </div>

        <div className="chatWindow">
          {loading && <p>Loading your report...</p>}

          {!loading && message && <p>{message}</p>}

          {!loading && !message && assessments.length === 0 && (
            <p>No organ assessments found yet.</p>
          )}

          {!loading && assessments.length > 0 && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">Overall Organ Health Score</p>
                <h2 className={getScoreClass(overallScore)}>
                  {overallScore}/100
                </h2>
                <h3>{getStatus(overallScore)}</h3>
                <p>
                  This score is calculated from the average of your saved organ
                  assessment scores.
                </p>
              </div>

              <div className="assessmentForm">
                {assessments.map((item) => (
                  <div className="resultBox" key={item.organ_name}>
                    <p className="sectionLabel">{item.organ_name}</p>

                    <h2 className={getScoreClass(item.score)}>
                      {item.score}/100
                    </h2>

                    <h3>{item.risk_level}</h3>
                    <p>{item.notes}</p>

                    <p>
                      Last saved:{" "}
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
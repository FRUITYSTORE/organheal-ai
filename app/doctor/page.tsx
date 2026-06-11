"use client";

import { useEffect, useState } from "react";
import PageBackActions from "../components/PageBackActions";
import { supabase } from "../../lib/supabase";
import { buildHealthIntelligence } from "../../lib/intelligenceBuilder";

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

export default function DoctorPortalPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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

  const intelligence = buildHealthIntelligence({
    assessments: assessments.map((item) => ({
      organ_name: item.organ_name,
      score: item.score,
      created_at: item.created_at,
    })),
    labReport,
    dailyCheckIn,
    isArabic: false,
  });

  const hasData =
    assessments.length > 0 || labReport !== null || dailyCheckIn !== null;

  const latestAssessment = assessments[0] || null;

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">Doctor Portal</p>
          <h1>Doctor Intelligence Brief</h1>
          <p>
            A concise pre-visit summary generated from assessments, lab scores,
            daily wellness tracking, and OrganHeal intelligence engines.
          </p>
        </div>

        <div className="chatWindow">
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

          {!loading && !message && !hasData && (
            <div className="resultBox">
              <p className="sectionLabel">No Patient Data</p>
              <h2>No health intelligence available yet</h2>
              <p>
                The patient needs to complete at least one assessment, lab entry,
                or daily check-in before a doctor brief can be generated.
              </p>
            </div>
          )}

          {!loading && !message && hasData && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">Pre-Visit Overview</p>

                <h2>{intelligence.overallScore}/100</h2>

                <p>
                  <strong>Health Profile:</strong>{" "}
                  {intelligence.healthProfile}
                </p>

                <p>
                  <strong>Priority Area:</strong>{" "}
                  {intelligence.priorityOrgan || "General Health"}
                </p>

                <p>
                  <strong>Strongest Area:</strong>{" "}
                  {intelligence.strongestOrgan || "General Health"}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <div className="resultBox">
                  <p className="sectionLabel">Risk Pattern</p>
                  <h2>{intelligence.riskPattern}</h2>
                  <p>{intelligence.trendMessage}</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Health Age</p>
                  <h2>{intelligence.healthAgeStatus}</h2>
                  <p>{intelligence.healthAgeMessage}</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Potential</p>
                  <h2>{intelligence.potentialScore}/100</h2>
                  <p>Potential gain: +{intelligence.potentialGain}</p>
                </div>
              </div>

              {intelligence.riskEscalationLevel !== "Stable" && (
                <div className="priorityAlert">
                  <h3>Risk Escalation</h3>
                  <p>
                    <strong>Level:</strong>{" "}
                    {intelligence.riskEscalationLevel}
                  </p>
                  <p>{intelligence.riskEscalationMessage}</p>
                  <p>
                    <strong>Reason:</strong>{" "}
                    {intelligence.riskEscalationReason}
                  </p>
                </div>
              )}

              <div className="resultBox">
                <p className="sectionLabel">Recommended Clinical Focus</p>
                <h2>{intelligence.opportunityTitle}</h2>
                <p>{intelligence.bestNextAction}</p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Top Health Opportunities</p>

                {intelligence.opportunities.length === 0 ? (
                  <p>No opportunities available yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: "12px" }}>
                    {intelligence.opportunities.map((item) => (
                      <div
                        key={item.organ}
                        style={{
                          padding: "14px",
                          borderRadius: "14px",
                          border: "1px solid rgba(255,255,255,0.16)",
                        }}
                      >
                        <h3>{item.title}</h3>
                        <p>
                          Current: {item.currentScore}/100 → Potential:{" "}
                          {item.potentialScore}/100
                        </p>
                        <p>
                          Gain: +{item.potentialGain} | Priority:{" "}
                          {item.priority}
                        </p>
                        <p>{item.action}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Doctor Brief</p>
                <h2>Patient Intelligence Summary</h2>

                <div
                  style={{
                    whiteSpace: "pre-line",
                    lineHeight: "1.8",
                    textAlign: "left",
                  }}
                >
                  {intelligence.doctorBrief}
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Available Data Sources</p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <strong>Organ assessments</strong>
                    <p>{assessments.length}</p>
                  </div>

                  <div>
                    <strong>Latest assessment</strong>
                    <p>
                      {latestAssessment
                        ? `${latestAssessment.organ_name} - ${latestAssessment.score}/100`
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <strong>Latest lab score</strong>
                    <p>{labReport ? `${labReport.score}/100` : "N/A"}</p>
                  </div>

                  <div>
                    <strong>Latest daily check-in</strong>
                    <p>
                      {dailyCheckIn
                        ? `${dailyCheckIn.wellness_score}/100 - ${dailyCheckIn.mood}`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Disclaimer</p>
                <p>
                  OrganHeal AI provides educational health intelligence support.
                  It does not replace clinical diagnosis, medical judgment,
                  treatment decisions, emergency evaluation, or licensed medical
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
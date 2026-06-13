"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { buildHealthIntelligence } from "../../lib/intelligenceBuilder";

type Assessment = {
  organ_name: string;
  score: number;
  created_at: string;
};

type HealthEngine = ReturnType<typeof buildHealthIntelligence>;

export default function IntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [healthEngine, setHealthEngine] = useState<HealthEngine | null>(null);
  const [healthInsights, setHealthInsights] = useState<any[]>([]);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    loadIntelligence();
  }, []);

  async function loadIntelligence() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Please login to access your Intelligence Center.");
      setLoading(false);
      return;
    }

    const { data: assessments, error } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Database error: " + error.message);
      setLoading(false);
      return;
    }

    const assessmentData = (assessments || []) as Assessment[];

    if (assessmentData.length === 0) {
      setMessage("Complete your first organ assessment to unlock intelligence.");
      setLoading(false);
      return;
    }

    const intelligence = buildHealthIntelligence({
      assessments: assessmentData,
      labReport: null,
      dailyCheckIn: null,
      isArabic: false,
    });
const { data: insights } = await supabase
  .from("health_insights")
  .select("*")
  .eq("user_id", userData.user.id)
  .order("created_at", { ascending: false });

setHealthInsights(insights || []);
    setHealthEngine(intelligence);
    setLoading(false);
  }

  async function copyDoctorBrief() {
    if (!healthEngine) return;

    await navigator.clipboard.writeText(healthEngine.doctorBrief);
    setCopyMessage("Doctor brief copied.");
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />

        <section className="assistantHeader">
          <p className="assistantBadge">ORGANHEAL INTELLIGENCE CENTER</p>
          <h1>Health Intelligence Center</h1>
          <p>
            A focused intelligence view for your health profile, opportunities,
            roadmap, risk signals, and doctor-ready summary.
          </p>
        </section>

        <section className="chatWindow">
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">LOADING INTELLIGENCE</p>
              <h2>Preparing your health intelligence...</h2>
            </div>
          )}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">INTELLIGENCE STATUS</p>
              <h2>Not enough data yet</h2>
              <p>{message}</p>
            </div>
          )}

          {!loading && healthEngine && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">🪪 HEALTH PASSPORT</p>
                <h2>{healthEngine.healthProfile}</h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "14px",
                    marginTop: "18px",
                  }}
                >
                  <div>
                    <strong>Overall Score</strong>
                    <p>{healthEngine.overallScore}/100</p>
                  </div>

                  <div>
                    <strong>Health Age</strong>
                    <p>{healthEngine.healthAgeStatus}</p>
                  </div>

                  <div>
                    <strong>Priority Area</strong>
                    <p>{healthEngine.priorityOrgan || "N/A"}</p>
                  </div>

                  <div>
                    <strong>Potential Score</strong>
                    <p>{healthEngine.potentialScore}/100</p>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">📊 INTELLIGENCE SNAPSHOT</p>
                <h2>Your Current Pattern</h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "14px",
                    marginTop: "18px",
                  }}
                >
                  <div>
                    <strong>Strongest Area</strong>
                    <p>{healthEngine.strongestOrgan || "N/A"}</p>
                  </div>

                  <div>
                    <strong>Risk Pattern</strong>
                    <p>{healthEngine.riskPattern}</p>
                  </div>

                  <div>
                    <strong>Potential Gain</strong>
                    <p>+{healthEngine.potentialGain}</p>
                  </div>

                  <div>
                    <strong>Trend</strong>
                    <p>{healthEngine.trendDirection}</p>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">🏆 TOP HEALTH OPPORTUNITIES</p>
                <h2>Where You Can Improve the Most</h2>

                {healthEngine.opportunities.length === 0 ? (
                  <p>Complete more assessments to generate opportunities.</p>
                ) : (
                  <div style={{ display: "grid", gap: "14px", marginTop: "18px" }}>
                    {healthEngine.opportunities.map((item) => (
                      <div
                        key={item.organ}
                        style={{
                          padding: "16px",
                          borderRadius: "16px",
                          background: "rgba(15, 23, 42, 0.75)",
                          border: "1px solid rgba(34, 211, 238, 0.18)",
                          textAlign: "left",
                        }}
                      >
                        <h3>{item.title}</h3>
                        <p>
                          Current: {item.currentScore}/100 → Potential:{" "}
                          {item.potentialScore}/100
                        </p>
                        <p>
                          Potential Gain: <strong>+{item.potentialGain}</strong>
                        </p>
                        <p>
                          Priority: <strong>{item.priority}</strong>
                        </p>
                        <p>{item.action}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">🎯 NEXT BEST ACTIONS</p>
                <h2>Recommended Focus</h2>

                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    marginTop: "18px",
                    textAlign: "left",
                  }}
                >
                  <p>1. {healthEngine.bestNextAction}</p>
                  <p>2. Repeat your priority assessment within 30 days.</p>
                  <p>3. Review your full report before your next health visit.</p>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">🗺️ HEALTH ROADMAP</p>
                <h2>Today → 30 Days → 90 Days</h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                    marginTop: "18px",
                  }}
                >
                  <div>
                    <strong>Today</strong>
                    <p>{healthEngine.opportunityTitle}</p>
                  </div>

                  <div>
                    <strong>30 Days</strong>
                    <p>
                      Improve your priority area:{" "}
                      {healthEngine.priorityOrgan || "General Health"}.
                    </p>
                  </div>

                  <div>
                    <strong>90 Days</strong>
                    <p>Aim for {healthEngine.potentialScore}/100.</p>
                  </div>
                </div>
              </div>

              {healthEngine.riskEscalationLevel !== "Stable" && (
                <div className="priorityAlert">
                  <h3>🚨 Risk Escalation Intelligence</h3>
                  <p>
                    <strong>Level:</strong> {healthEngine.riskEscalationLevel}
                  </p>
                  <p>{healthEngine.riskEscalationMessage}</p>
                  <p>
                    <strong>Reason:</strong> {healthEngine.riskEscalationReason}
                  </p>
                </div>
              )}

              <div className="resultBox">
                <p className="sectionLabel">🩺 DOCTOR READY SUMMARY</p>
                <h2>Patient Intelligence Brief</h2>

                <div
                  style={{
                    whiteSpace: "pre-line",
                    lineHeight: "1.8",
                    marginTop: "16px",
                    textAlign: "left",
                  }}
                >
                  {healthEngine.doctorBrief}
                </div>

                <button
                  className="primaryBtn"
                  onClick={copyDoctorBrief}
                  style={{ marginTop: "18px" }}
                >
                  Copy Brief
                </button>

                {copyMessage && <p>{copyMessage}</p>}
              </div>
              MEDICAL REPORT INTELLIGENCE
              <div className="resultBox">
  <p className="sectionLabel">
    📄 MEDICAL REPORT INTELLIGENCE
  </p>

  <h2>Uploaded Medical Reports</h2>

  {healthInsights.length === 0 ? (
    <p>No medical report intelligence available yet.</p>
  ) : (
    <div
      style={{
        display: "grid",
        gap: "14px",
        marginTop: "18px",
      }}
    >
      {healthInsights.map((item) => (
        <div
          key={item.id}
          style={{
            padding: "16px",
            borderRadius: "16px",
            background: "rgba(15,23,42,0.75)",
            border: "1px solid rgba(34,211,238,0.18)",
            textAlign: "left",
          }}
        >
          <h3>
            {item.insight_title || "Medical Report Uploaded"}
          </h3>

          <p>
            <strong>Report Type:</strong>{" "}
            {item.report_type || "Medical"}
          </p>

          <p>
            <strong>AI Status:</strong>{" "}
            {item.ai_status || "Pending"}
          </p>

          <p>
            <strong>Risk Level:</strong>{" "}
            {item.risk_level || "Pending"}
          </p>

          <p>
            {item.insight_summary ||
              "Report uploaded and waiting for AI interpretation."}
          </p>
        </div>
      ))}
    </div>
  )}
</div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
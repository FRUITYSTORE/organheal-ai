"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { generateHealthEngineResult } from "../../lib/healthEngine";

type Assessment = {
  organ_name: string;
  score: number;
  created_at: string;
};

type HealthEngine = ReturnType<typeof generateHealthEngineResult>;

export default function IntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [overallScore, setOverallScore] = useState(0);
  const [strongestOrgan, setStrongestOrgan] = useState<string | null>(null);
  const [priorityOrgan, setPriorityOrgan] = useState<string | null>(null);
  const [healthEngine, setHealthEngine] = useState<HealthEngine | null>(null);
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

    const scores = assessmentData.map((item) => item.score);

    const calculatedOverallScore = Math.round(
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    );

    const strongest = [...assessmentData].sort((a, b) => b.score - a.score)[0];
    const weakest = [...assessmentData].sort((a, b) => a.score - b.score)[0];

    const engine = generateHealthEngineResult({
      overallScore: calculatedOverallScore,
      priorityOrgan: weakest.organ_name,
      strongestOrgan: strongest.organ_name,
      isArabic: false,
    });

    setOverallScore(calculatedOverallScore);
    setStrongestOrgan(strongest.organ_name);
    setPriorityOrgan(weakest.organ_name);
    setHealthEngine(engine);
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
        <section className="assistantHeader">
          <p className="assistantBadge">ORGANHEAL INTELLIGENCE CENTER</p>

          <h1>Health Intelligence Center</h1>

          <p>
            Your digital health intelligence profile, generated from OrganHeal
            assessments and intelligence engines.
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
                <p className="sectionLabel">🪪 ORGANHEAL HEALTH PASSPORT</p>

                <h2>{healthEngine.healthProfile}</h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "14px",
                    marginTop: "18px",
                  }}
                >
                  <div>
                    <strong>Overall Score</strong>
                    <p>{overallScore}/100</p>
                  </div>

                  <div>
                    <strong>Health Age</strong>
                    <p>{healthEngine.healthAgeStatus}</p>
                  </div>

                  <div>
                    <strong>Priority Area</strong>
                    <p>{priorityOrgan || "N/A"}</p>
                  </div>

                  <div>
                    <strong>Potential Score</strong>
                    <p>{healthEngine.potentialScore}/100</p>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">📊 HEALTH INTELLIGENCE SCORECARD</p>

                <h2>Your Intelligence Snapshot</h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "14px",
                    marginTop: "18px",
                  }}
                >
                  <div>
                    <strong>Strongest Area</strong>
                    <p>{strongestOrgan || "N/A"}</p>
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
                <p className="sectionLabel">🎯 TOP ACTIONS</p>

                <h2>Next Best Actions</h2>

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
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
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
                    <p>Improve your priority area: {priorityOrgan || "N/A"}.</p>
                  </div>

                  <div>
                    <strong>90 Days</strong>
                    <p>
                      Aim for a potential score of{" "}
                      {healthEngine.potentialScore}/100.
                    </p>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">🧬 DIGITAL HEALTH PROFILE</p>

                <h2>{healthEngine.healthProfile}</h2>

                <p>
                  This profile is generated from your organ assessment pattern,
                  current overall score, and priority health area.
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">🧩 HEALTH RISK PATTERN</p>

                <h2>{healthEngine.riskPattern}</h2>

                <p>
                  OrganHeal identifies the dominant health pattern influencing
                  your current results.
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">📈 HEALTH POTENTIAL SCORE</p>

                <h2>{healthEngine.potentialScore}/100</h2>

                <h3>{healthEngine.potentialLevel}</h3>

                <p>
                  Possible gain: +{healthEngine.potentialGain} health points.
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">⏳ HEALTH AGE ENGINE</p>

                <h2>{healthEngine.healthAgeStatus}</h2>

                <p>{healthEngine.healthAgeMessage}</p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">📊 TREND INTELLIGENCE</p>

                <h2>{healthEngine.trendDirection}</h2>

                <p>{healthEngine.trendMessage}</p>
              </div>

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
            </>
          )}
        </section>
      </div>
    </main>
  );
}
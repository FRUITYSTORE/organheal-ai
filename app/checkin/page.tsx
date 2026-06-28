"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type DailyCheckIn = {
  mood: string;
  energy_level: number;
  stress_level: number;
  sleep_quality: number;
  hydration: number;
  physical_activity: number;
  wellness_score: number;
  notes: string | null;
  created_at: string;
};

export default function CheckInPage() {
  const [mood, setMood] = useState("Good");
  const [energyLevel, setEnergyLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [hydration, setHydration] = useState(3);
  const [physicalActivity, setPhysicalActivity] = useState(3);
  const [notes, setNotes] = useState("");

  const [latestCheckIn, setLatestCheckIn] = useState<DailyCheckIn | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<DailyCheckIn[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedToday, setSavedToday] = useState(false);

  useEffect(() => {
    loadCheckInHistory();
  }, []);

  function calculateWellnessScore() {
    return Math.round(
      ((energyLevel +
        sleepQuality +
        hydration +
        physicalActivity +
        (6 - stressLevel)) /
        25) *
        100
    );
  }

  function getScoreStatus(score: number) {
    if (score >= 80) return "Strong";
    if (score >= 60) return "Stable";
    if (score >= 40) return "Needs Attention";
    return "Recovery Needed";
  }

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 60) return "moderateScore";
    return "riskScore";
  }

  async function loadCheckInHistory() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("daily_checkins")
      .select(
        "mood, energy_level, stress_level, sleep_quality, hydration, physical_activity, wellness_score, notes, created_at"
      )
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(7);

    if (error) {
      setMessage("Database error: " + error.message);
      setLoading(false);
      return;
    }

    const checkIns = (data || []) as DailyCheckIn[];

    setRecentCheckIns(checkIns);
    setLatestCheckIn(checkIns[0] || null);

    if (checkIns[0]) {
      const latestDate = new Date(checkIns[0].created_at).toDateString();
      const today = new Date().toDateString();
      setSavedToday(latestDate === today);
    }

    setLoading(false);
  }

  async function saveCheckIn() {
    setSaving(true);
    setMessage("Saving daily check-in...");

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user) {
      setMessage("Please login to save your daily check-in.");
      setSaving(false);
      return;
    }

    const wellnessScore = calculateWellnessScore();

    const { error } = await supabase.from("daily_checkins").insert({
      user_id: data.user.id,
      mood,
      energy_level: energyLevel,
      stress_level: stressLevel,
      sleep_quality: sleepQuality,
      hydration,
      physical_activity: physicalActivity,
      wellness_score: wellnessScore,
      notes,
    });

    if (error) {
      setMessage("Database error: " + error.message);
      setSaving(false);
      return;
    }

    setMessage(`Check-in saved successfully. Wellness Score: ${wellnessScore}/100`);
    setSavedToday(true);
    setSaving(false);

    await loadCheckInHistory();
  }

  const wellnessScore = calculateWellnessScore();
  const scoreStatus = getScoreStatus(wellnessScore);

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">DAILY HEALTH CHECK-IN</p>
          <h1>How Are You Feeling Today?</h1>
          <p>
            Track sleep, stress, hydration, energy, activity, and mood so your
            dashboard, profile, and follow-up plan stay realistic.
          </p>
        </div>

        <div className="chatWindow">
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">Loading Check-In</p>
              <h2>Preparing your wellness tracker...</h2>
            </div>
          )}

          {!loading && (
            <>
              <div
                className="resultBox"
                style={{
                  border: savedToday
                    ? "1px solid rgba(34,211,238,0.24)"
                    : "1px solid rgba(148,163,184,0.14)",
                }}
              >
                <p className="sectionLabel">Today’s Wellness Preview</p>

                <h2 className={getScoreClass(wellnessScore)}>
                  {wellnessScore}/100
                </h2>

                <h3>{scoreStatus}</h3>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    maxWidth: "760px",
                    margin: "0 auto",
                  }}
                >
                  This score updates before saving. It is based on energy,
                  sleep, hydration, physical activity, and stress level.
                </p>
              </div>

              {latestCheckIn && (
                <div className="resultBox">
                  <p className="sectionLabel">Latest Saved Check-In</p>

                  <h2 className={getScoreClass(latestCheckIn.wellness_score)}>
                    {latestCheckIn.wellness_score}/100
                  </h2>

                  <p>
                    {latestCheckIn.mood} ·{" "}
                    {new Date(latestCheckIn.created_at).toLocaleString()}
                  </p>

                  <p>
                    Energy {latestCheckIn.energy_level}/5 · Stress{" "}
                    {latestCheckIn.stress_level}/5 · Sleep{" "}
                    {latestCheckIn.sleep_quality}/5 · Hydration{" "}
                    {latestCheckIn.hydration}/5 · Activity{" "}
                    {latestCheckIn.physical_activity}/5
                  </p>
                </div>
              )}

              <div className="assessmentForm">
                <div className="formGroup">
                  <label>Mood</label>
                  <select value={mood} onChange={(e) => setMood(e.target.value)}>
                    <option>Excellent</option>
                    <option>Good</option>
                    <option>Average</option>
                    <option>Poor</option>
                  </select>
                </div>

                <div className="formGroup">
                  <label>Energy Level: {energyLevel}/5</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  />
                </div>

                <div className="formGroup">
                  <label>Stress Level: {stressLevel}/5</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={stressLevel}
                    onChange={(e) => setStressLevel(Number(e.target.value))}
                  />
                </div>

                <div className="formGroup">
                  <label>Sleep Quality: {sleepQuality}/5</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(Number(e.target.value))}
                  />
                </div>

                <div className="formGroup">
                  <label>Hydration: {hydration}/5</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={hydration}
                    onChange={(e) => setHydration(Number(e.target.value))}
                  />
                </div>

                <div className="formGroup">
                  <label>Physical Activity: {physicalActivity}/5</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={physicalActivity}
                    onChange={(e) =>
                      setPhysicalActivity(Number(e.target.value))
                    }
                  />
                </div>

                <div className="formGroup">
                  <label>Notes</label>
                  <input
                    placeholder="Optional notes about your day"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <button
                  className="primaryBtn"
                  onClick={saveCheckIn}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Daily Check-In"}
                </button>

                {message && (
                  <div className="resultBox" style={{ marginTop: "18px" }}>
                    <p style={{ whiteSpace: "pre-line" }}>{message}</p>

                    {savedToday && (
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          justifyContent: "center",
                          flexWrap: "wrap",
                          marginTop: "18px",
                        }}
                      >
                        <Link href="/health-plan" className="primaryBtn">
                          Open Health Plan
                        </Link>

                        <Link href="/dashboard" className="secondaryBtn">
                          Dashboard
                        </Link>

                        <Link href="/profile" className="secondaryBtn">
                          Profile
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Recent Check-In Pattern</p>

                <h2>{recentCheckIns.length} recent saved check-ins</h2>

                {recentCheckIns.length === 0 ? (
                  <p>
                    Save your first daily check-in to start building a wellness
                    pattern.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "12px" }}>
                    {recentCheckIns.slice(0, 3).map((item, index) => (
                      <div
                        key={`${item.created_at}-${index}`}
                        style={{
                          padding: "14px",
                          borderRadius: "16px",
                          border: "1px solid rgba(148,163,184,0.14)",
                          background: "rgba(15,23,42,0.35)",
                        }}
                      >
                        <strong>
                          {item.wellness_score}/100 · {item.mood}
                        </strong>
                        <p style={{ marginBottom: 0, opacity: 0.75 }}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Check-In Journey</p>

                <h2>Keep your health plan realistic</h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    maxWidth: "760px",
                    margin: "0 auto 22px",
                  }}
                >
                  Your daily check-ins help OrganHeal connect your current
                  wellness status with your dashboard, profile, intelligence,
                  and follow-up plan.
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Link href="/dashboard" className="secondaryBtn">
                    Dashboard
                  </Link>

                  <Link href="/health-plan" className="primaryBtn">
                    Health Plan
                  </Link>

                  <Link href="/profile" className="secondaryBtn">
                    Profile
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
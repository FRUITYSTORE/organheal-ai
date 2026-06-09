"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CheckInPage() {
  const [mood, setMood] = useState("Good");
  const [energyLevel, setEnergyLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [hydration, setHydration] = useState(3);
  const [physicalActivity, setPhysicalActivity] = useState(3);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  async function saveCheckIn() {
    setMessage("Saving daily check-in...");

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user) {
      setMessage("Please login to save your daily check-in.");
      return;
    }

    const wellnessScore = Math.round(
      ((energyLevel +
        sleepQuality +
        hydration +
        physicalActivity +
        (6 - stressLevel)) /
        25) *
        100
    );

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
      return;
    }

    setMessage(`Check-in saved successfully. Wellness Score: ${wellnessScore}/100`);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">DAILY HEALTH CHECK-IN</p>
          <h1>How Are You Feeling Today?</h1>
          <p>
            Track your daily wellness patterns and build a personal health
            history over time.
          </p>
        </div>

        <div className="chatWindow">
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

            <button className="primaryBtn" onClick={saveCheckIn}>
              Save Daily Check-In
            </button>

            {message && <p>{message}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
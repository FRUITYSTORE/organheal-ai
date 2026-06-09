"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type HealthHistory = {
  id: string;
  module_name: string;
  score: number;
  status: string;
  notes: string;
  created_at: string;
};
type DailyCheckIn = {
  id: string;
  mood: string;
  energy_level: number;
  stress_level: number;
  sleep_quality: number;
  hydration: number;
  physical_activity: number;
  wellness_score: number;
  created_at: string;
};
const filters = [
  "All",
  "Heart",
  "Lung",
  "Kidney",
  "Liver",
  "Brain",
  "Metabolic",
];

export default function HistoryPage() {
  const [history, setHistory] = useState<HealthHistory[]>([]);
  const [dailyCheckIns, setDailyCheckIns] = useState<DailyCheckIn[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Please login or sign up to view your health history.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("health_history")
      .select("id, module_name, score, status, notes, created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Database error: " + error.message);
      setLoading(false);
      return;
    }

    const { data: checkInData, error: checkInError } = await supabase
  .from("daily_checkins")
  .select(
    "id, mood, energy_level, stress_level, sleep_quality, hydration, physical_activity, wellness_score, created_at"
  )
  .eq("user_id", userData.user.id)
  .order("created_at", { ascending: false });

if (checkInError) {
  setMessage("Database error: " + checkInError.message);
  setLoading(false);
  return;
}

setHistory(data || []);
setDailyCheckIns(checkInData || []);
setLoading(false);
  }

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 50) return "moderateScore";
    return "riskScore";
  }

  const filteredHistory =
    selectedFilter === "All"
      ? history
      : history.filter((item) => item.module_name === selectedFilter);

  const latestRecord = filteredHistory[0];

  const bestScore =
    filteredHistory.length > 0
      ? Math.max(...filteredHistory.map((item) => item.score))
      : 0;

  const lowestScore =
    filteredHistory.length > 0
      ? Math.min(...filteredHistory.map((item) => item.score))
      : 0;

  const averageScore =
    filteredHistory.length > 0
      ? Math.round(
          filteredHistory.reduce((sum, item) => sum + item.score, 0) /
            filteredHistory.length
        )
      : 0;

      const achievements = getAchievements();
      const chartData = filteredHistory
  .slice()
  .sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  .map((item) => ({
    date: new Date(item.created_at).toLocaleDateString(),
    score: item.score,
    module: item.module_name,
  }));

function getTrend(item: HealthHistory) {
  const sameModuleRecords = history
    .filter((record) => record.module_name === item.module_name)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const currentIndex = sameModuleRecords.findIndex(
    (record) => record.id === item.id
  );

  const previousRecord = sameModuleRecords[currentIndex + 1];

  if (!previousRecord) {
    return {
      text: "First recorded result",
      symbol: "•",
      className: "",
    };
  }

  const difference = item.score - previousRecord.score;

  if (difference > 0) {
    return {
      text: `Improved by +${difference} points`,
      symbol: "↑",
      className: "goodScore",
    };
  }

  if (difference < 0) {
    return {
      text: `Declined by ${difference} points`,
      symbol: "↓",
      className: "riskScore",
    };
  }

return {
  text: "No change since previous result",
  symbol: "→",
  className: "moderateScore",
};
}

function getAchievements() {
  const milestones = [];

  const hasAllOrgans = filters
    .filter((item) => item !== "All")
    .every((organ) => history.some((item) => item.module_name === organ));

  if (hasAllOrgans) {
    milestones.push("✅ Full Organ Review Completed");
  }

  const highRiskArea = history.find((item) => item.score < 50);

  if (highRiskArea) {
    milestones.push(`⚠️ ${highRiskArea.module_name} Needs Priority Follow-up`);
  }

  const bestArea = history
    .filter((item) => item.score >= 80)
    .sort((a, b) => b.score - a.score)[0];

  if (bestArea) {
    milestones.push(`🌟 Strong Area Identified: ${bestArea.module_name}`);
  }

  const heartRecords = history
    .filter((item) => item.module_name === "Heart")
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  if (heartRecords.length >= 2) {
    const first = heartRecords[0].score;
    const latest = heartRecords[heartRecords.length - 1].score;

    if (latest > first) {
      milestones.push(`📈 Heart Improved by ${latest - first} Points`);
    }

    if (latest < first) {
      milestones.push(`📉 Heart Declined by ${first - latest} Points`);
    }
  }

  return milestones;
}
  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">HEALTH HISTORY</p>
          <h1>Health History Timeline</h1>
          <p>
            Review all saved assessment results over time and track your health
            journey.
          </p>
        </div>

        <div className="chatWindow">
          {loading && <p>Loading health history...</p>}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">Login Required</p>
              <h2>Access Protected</h2>
              <p>{message}</p>

              <a href="/login">
                <button className="primaryBtn">Login</button>
              </a>
            </div>
          )}

          {!loading && !message && history.length === 0 && (
            <div className="resultBox">
              <p className="sectionLabel">No History Yet</p>
              <h2>No saved results</h2>
              <p>
                Complete an assessment to start building your health timeline.
              </p>

              <a href="/assessment">
                <button className="primaryBtn">Start Assessment</button>
              </a>
            </div>
          )}

          {!loading && !message && history.length > 0 && (
            <>
              <div className="assessmentForm">
                <div className="resultBox">
                  <p className="sectionLabel">Total Records</p>
                  <h2>{filteredHistory.length}</h2>
                  <p>Saved assessment records.</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Latest Score</p>
                  <h2 className={latestRecord ? getScoreClass(latestRecord.score) : ""}>
                    {latestRecord ? `${latestRecord.score}/100` : "N/A"}
                  </h2>
                  <p>{latestRecord ? latestRecord.module_name : "No record"}</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Best Score</p>
                  <h2 className={getScoreClass(bestScore)}>{bestScore}/100</h2>
                  <p>Highest saved score.</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Average Score</p>
                  <h2 className={getScoreClass(averageScore)}>
                    {averageScore}/100
                  </h2>
                  <p>Average based on selected records.</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Lowest Score</p>
                  <h2 className={getScoreClass(lowestScore)}>
                    {lowestScore}/100
                  </h2>
                  <p>Lowest saved score.</p>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Filter History</p>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  {filters.map((filter) => (
                    <button
                      key={filter}
                      className={
                        selectedFilter === filter ? "primaryBtn" : "secondaryBtn"
                      }
                      onClick={() => setSelectedFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
<div className="resultBox">
  <p className="sectionLabel">🏅 Health Milestones</p>
{achievements.map((achievement, index) => (
  <div key={index}>{achievement}</div>
))}
<div className="resultBox">
  <p className="sectionLabel">☀️ Daily Wellness History</p>

  {dailyCheckIns.length === 0 ? (
    <>
      <h2>No check-ins yet</h2>
      <p>Complete your daily check-in to start tracking wellness patterns.</p>

      <a href="/checkin">
        <button className="primaryBtn">Start Daily Check-In</button>
      </a>
    </>
  ) : (
    <div style={{ display: "grid", gap: "14px" }}>
      {dailyCheckIns.slice(0, 7).map((item) => (
        <div
          key={item.id}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "12px",
            alignItems: "center",
            padding: "16px",
            borderRadius: "16px",
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(34, 211, 238, 0.18)",
            textAlign: "left",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 6px" }}>{item.mood}</h3>

            <p style={{ margin: "0 0 6px" }}>
              Energy {item.energy_level}/5 · Sleep {item.sleep_quality}/5 ·
              Stress {item.stress_level}/5
            </p>

            <p style={{ margin: 0 }}>
              {new Date(item.created_at).toLocaleString()}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <h2 className={getScoreClass(item.wellness_score)} style={{ margin: 0 }}>
              {item.wellness_score}/100
            </h2>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
<div className="resultBox">
  <p className="sectionLabel">📈 Health Progress Chart</p>

  {chartData.length < 2 ? (
    <p>Complete at least two assessments to view progress trends.</p>
  ) : (
    <div style={{ width: "100%", height: "320px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="score"
            strokeWidth={4}
            dot={{ r: 6 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )}
</div>
</div>

              <div className="resultBox">
                <p className="sectionLabel">Timeline</p>

                {filteredHistory.length === 0 ? (
                  <p>No records found for this filter.</p>
                ) : (
                  <div style={{ display: "grid", gap: "14px" }}>
                    {filteredHistory.map((item) => {
  const trend = getTrend(item);

  return (
    <div
      key={item.id}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "12px",
        alignItems: "center",
        padding: "16px",
        borderRadius: "16px",
        background: "rgba(15, 23, 42, 0.75)",
        border: "1px solid rgba(34, 211, 238, 0.18)",
        textAlign: "left",
      }}
    >
      <div>
        <h3 style={{ margin: "0 0 6px" }}>{item.module_name}</h3>

        <p style={{ margin: "0 0 6px" }}>{item.status}</p>

        <p style={{ margin: 0 }}>
          {new Date(item.created_at).toLocaleString()}
        </p>

        <p
          className={trend.className}
          style={{ margin: "8px 0 0", fontWeight: 800 }}
        >
          {trend.symbol} {trend.text}
        </p>
      </div>

      <div style={{ textAlign: "right" }}>
        <h2 className={getScoreClass(item.score)} style={{ margin: 0 }}>
          {item.score}/100
        </h2>
      </div>
    </div>
  );
})}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
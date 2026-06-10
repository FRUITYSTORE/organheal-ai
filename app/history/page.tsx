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

    const { data: historyData, error: historyError } = await supabase
      .from("health_history")
      .select("id, module_name, score, status, notes, created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (historyError) {
      setMessage("Database error: " + historyError.message);
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

    setHistory(historyData || []);
    setDailyCheckIns(checkInData || []);
    setLoading(false);
  }

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 50) return "moderateScore";
    return "riskScore";
  }

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
    const milestones: string[] = [];

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
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
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

    if (milestones.length === 0) {
      milestones.push("📌 Keep tracking your assessments to unlock milestones");
    }

    return milestones;
  }

  function getWellnessTrend() {
    if (dailyCheckIns.length < 2) {
      return {
        title: "Not Enough Wellness Data",
        message:
          "Complete at least two daily check-ins to receive wellness trend insights.",
        className: "",
      };
    }

    const sortedCheckIns = [...dailyCheckIns].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const latest = sortedCheckIns[0];
    const previous = sortedCheckIns[1];
    const difference = latest.wellness_score - previous.wellness_score;

    if (difference > 0) {
      return {
        title: "📈 Wellness Improved",
        message: `Your wellness score improved by ${difference} points compared with your previous check-in. Keep following your current routine and repeat your check-in tomorrow.`,
        className: "goodScore",
      };
    }

    if (difference < 0) {
      return {
        title: "📉 Wellness Declined",
        message: `Your wellness score decreased by ${Math.abs(
          difference
        )} points compared with your previous check-in. Focus on sleep, stress, hydration, and recovery today.`,
        className: "riskScore",
      };
    }

    return {
      title: "➡️ Wellness Stable",
      message:
        "Your wellness score stayed the same compared with your previous check-in. Continue tracking your daily patterns.",
      className: "moderateScore",
    };
  }function getForecastConfidence(change: number) {
  const absChange = Math.abs(change);

  if (absChange >= 15) return "High";
  if (absChange >= 5) return "Moderate";

  return "Low";
}
function getHealthForecasts() {
  const modules = filters.filter((item) => item !== "All");

  return modules
    .map((module) => {
      const records = history
        .filter((item) => item.module_name === module)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );

      if (records.length < 2) {
        return null;
      }

      const latest = records[0];
      const previous = records[1];
      const difference = latest.score - previous.score;
const expectedNextScore = Math.max(
  0,
  Math.min(100, latest.score + difference)
);

const confidence = getForecastConfidence(difference);
      let trend = "Stable";
      let message =
        "Your score is stable compared with the previous assessment.";
      let forecast =
        "Continue monitoring this area and repeat assessment after 4 weeks.";
      let className = "moderateScore";

      if (difference > 0) {
        trend = "Improving";
        message = `${module} improved by ${difference} points compared with the previous assessment.`;
        forecast = `If this trend continues, ${module} may improve by another 5–15 points in the next assessment cycle.`;
        className = "goodScore";
      }

      if (difference < 0) {
        trend = "Declining";
        message = `${module} declined by ${Math.abs(
          difference
        )} points compared with the previous assessment.`;
        forecast = `${module} needs closer attention. Follow the recommended plan and reassess after 4 weeks.`;
        className = "riskScore";
      }

      return {
  module,
  latestScore: latest.score,
  previousScore: previous.score,
  expectedNextScore,
  confidence,
        difference,
        trend,
        message,
        forecast,
        className,
      };
    })
    .filter(Boolean);
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
function getHealthGoals() {
  const modules = filters.filter((item) => item !== "All");

  return modules
    .map((module) => {
      const records = history
        .filter((item) => item.module_name === module)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );

      if (records.length === 0) return null;

      const latest = records[0];
      const targetScore = latest.score < 50 ? 70 : latest.score < 80 ? 85 : 95;

      const progress = Math.min(
        100,
        Math.round((latest.score / targetScore) * 100)
      );

      return {
        module,
        currentScore: latest.score,
        targetScore,
        progress,
        status:
          progress >= 100
            ? "Goal Reached"
            : progress >= 75
            ? "Close to Goal"
            : "In Progress",
      };
    })
    .filter(Boolean);
}
  const achievements = getAchievements();
  const wellnessTrend = getWellnessTrend();
  const healthForecasts = getHealthForecasts();
  const healthGoals = getHealthGoals();
const overallHealthScore =
  history.length > 0
    ? Math.round(
        history.reduce((sum, item) => sum + item.score, 0) /
          history.length
      )
    : 0;

const bestOrgan =
  history.length > 0
    ? [...history].sort((a, b) => b.score - a.score)[0]
    : null;

const priorityOrgan =
  history.length > 0
    ? [...history].sort((a, b) => a.score - b.score)[0]
    : null;
  const chartData = filteredHistory
    .slice()
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .map((item) => ({
      date: new Date(item.created_at).toLocaleDateString(),
      score: item.score,
    }));

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">HEALTH HISTORY</p>
          <h1>Health History Timeline</h1>
          <p>
            Review saved assessment results, daily wellness check-ins, trends,
            milestones, and progress over time.
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
            <div className="resultBox">
  <p className="sectionLabel">
    🧠 Overall Health Intelligence
  </p>

  <h2 className={getScoreClass(overallHealthScore)}>
    {overallHealthScore}/100
  </h2>

  <p>
    Based on all completed assessments and historical records.
  </p>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
      gap: "16px",
      marginTop: "20px",
    }}
  >
    <div>
      <strong>🌟 Best Organ</strong>
      <p>
        {bestOrgan
          ? `${bestOrgan.module_name} (${bestOrgan.score}/100)`
          : "N/A"}
      </p>
    </div>

    <div>
      <strong>⚠️ Priority Organ</strong>
      <p>
        {priorityOrgan
          ? `${priorityOrgan.module_name} (${priorityOrgan.score}/100)`
          : "N/A"}
      </p>
    </div>
  </div>
</div>
              <div className="assessmentForm">
                <div className="resultBox">
                  <p className="sectionLabel">Total Records</p>
                  <h2>{filteredHistory.length}</h2>
                  <p>Saved assessment records.</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Latest Score</p>
                  <h2
                    className={
                      latestRecord ? getScoreClass(latestRecord.score) : ""
                    }
                  >
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

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "20px",
                  }}
                >
                  {achievements.map((achievement, index) => (
                    <div key={index}>{achievement}</div>
                  ))}
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">☀️ Daily Wellness History</p>

                {dailyCheckIns.length === 0 ? (
                  <>
                    <h2>No check-ins yet</h2>
                    <p>
                      Complete your daily check-in to start tracking wellness
                      patterns.
                    </p>

                    <a href="/checkin">
                      <button className="primaryBtn">
                        Start Daily Check-In
                      </button>
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
                            Energy {item.energy_level}/5 · Sleep{" "}
                            {item.sleep_quality}/5 · Stress{" "}
                            {item.stress_level}/5
                          </p>

                          <p style={{ margin: 0 }}>
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <h2
                            className={getScoreClass(item.wellness_score)}
                            style={{ margin: 0 }}
                          >
                            {item.wellness_score}/100
                          </h2>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">🧠 Wellness Trend Intelligence</p>

                <h2 className={wellnessTrend.className}>
                  {wellnessTrend.title}
                </h2>

                <p>{wellnessTrend.message}</p>
              </div>
<div className="resultBox">
  <p className="sectionLabel">🎯 Health Goals System</p>

  {healthGoals.length === 0 ? (
    <p>Complete assessments to generate health goals.</p>
  ) : (
    <div style={{ display: "grid", gap: "14px" }}>
      {healthGoals.map((goal: any) => (
        <div
          key={goal.module}
          style={{
            padding: "16px",
            borderRadius: "16px",
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(34, 211, 238, 0.18)",
            textAlign: "left",
          }}
        >
          <h3 style={{ margin: "0 0 8px" }}>{goal.module}</h3>

          <p>
            Current: {goal.currentScore}/100 → Target: {goal.targetScore}/100
          </p>

          <h3>{goal.status}</h3>

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
                width: `${goal.progress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #22c55e, #38bdf8)",
                borderRadius: "999px",
              }}
            />
          </div>

          <p style={{ marginTop: "8px" }}>{goal.progress}% complete</p>
        </div>
      ))}
    </div>
  )}
</div>

<div className="resultBox">
  <p className="sectionLabel">🔮 Health Forecast Engine</p>

  {healthForecasts.length === 0 ? (
    <p>
      Complete at least two assessments for the same organ to generate health
      forecasts.
    </p>
  ) : (
    <div style={{ display: "grid", gap: "14px" }}>
      {healthForecasts.map((item: any) => (
        <div
          key={item.module}
          style={{
            padding: "16px",
            borderRadius: "16px",
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(34, 211, 238, 0.18)",
            textAlign: "left",
          }}
        >
          <h3 style={{ margin: "0 0 8px" }}>{item.module}</h3>

          <p>
            Previous: {item.previousScore}/100 → Current:{" "}
            {item.latestScore}/100
          </p>

          <h3 className={item.className}>{item.trend}</h3>

          <p>{item.message}</p>

          <p>
            <strong>Forecast:</strong> {item.forecast}
          </p>
          <p>
  <strong>Expected Next Score:</strong>{" "}
  {item.expectedNextScore}/100
</p>

<p>
  <strong>Confidence:</strong>{" "}
  {item.confidence}
</p>
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
                            <h3 style={{ margin: "0 0 6px" }}>
                              {item.module_name}
                            </h3>

                            <p style={{ margin: "0 0 6px" }}>{item.status}</p>

                            <p style={{ margin: 0 }}>
                              {new Date(item.created_at).toLocaleString()}
                            </p>

                            <p
                              className={trend.className}
                              style={{
                                margin: "8px 0 0",
                                fontWeight: 800,
                              }}
                            >
                              {trend.symbol} {trend.text}
                            </p>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <h2
                              className={getScoreClass(item.score)}
                              style={{ margin: 0 }}
                            >
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
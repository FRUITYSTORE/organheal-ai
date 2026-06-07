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
  CartesianGrid,
} from "recharts";

type HistoryItem = {
  id: number;
  module_name: string;
  score: number;
  status: string;
  notes: string;
  created_at: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
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
      setMessage("Please login to view your health history.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("health_history")
      .select("id, module_name, score, status, notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Database error: " + error.message);
      setLoading(false);
      return;
    }

    setHistory(data || []);
    setLoading(false);
  }

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 50) return "moderateScore";
    return "riskScore";
  }

  function getStatus(score: number) {
    if (score >= 80) return "Good";
    if (score >= 50) return "Moderate";
    return "High Risk";
  }

  function getTrend(records: HistoryItem[]) {
    if (records.length < 2) return "Baseline Assessment";

    const latest = records[0].score;
    const previous = records[1].score;

    if (latest > previous) return "Improving";
    if (latest < previous) return "Declining";
    return "Stable";
  }

  function getTrendIcon(trend: string) {
    if (trend === "Improving") return "📈";
    if (trend === "Declining") return "📉";
    if (trend === "Stable") return "➖";
    return "ℹ️";
  }

  function getTrendMessage(records: HistoryItem[]) {
    if (records.length < 2) {
      return "This is your first saved record for this module. Complete it again later to compare progress.";
    }

    const latest = records[0].score;
    const previous = records[1].score;
    const difference = latest - previous;

    if (difference > 0) {
      return `Improved by ${difference} points compared with the previous record.`;
    }

    if (difference < 0) {
      return `Decreased by ${Math.abs(
        difference
      )} points compared with the previous record.`;
    }

    return "No change compared with the previous record.";
  }

  function getChartData(records: HistoryItem[]) {
    return [...records]
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map((record) => ({
        date: new Date(record.created_at).toLocaleDateString(),
        score: record.score,
      }));
  }

  const groupedHistory = history.reduce<Record<string, HistoryItem[]>>(
    (groups, item) => {
      if (!groups[item.module_name]) {
        groups[item.module_name] = [];
      }

      groups[item.module_name].push(item);
      return groups;
    },
    {}
  );

  const moduleNames = Object.keys(groupedHistory);

  const latestOverallScore =
    moduleNames.length > 0
      ? Math.round(
          moduleNames.reduce((sum, moduleName) => {
            return sum + groupedHistory[moduleName][0].score;
          }, 0) / moduleNames.length
        )
      : 0;

  const bestModule =
    moduleNames.length > 0
      ? moduleNames
          .map((name) => groupedHistory[name][0])
          .sort((a, b) => b.score - a.score)[0]
      : null;

  const priorityModule =
    moduleNames.length > 0
      ? moduleNames
          .map((name) => groupedHistory[name][0])
          .sort((a, b) => a.score - b.score)[0]
      : null;

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader" style={{ marginBottom: "32px" }}>
          <p className="assistantBadge">HEALTH HISTORY</p>
          <h1>Your Health History & Trends</h1>
          <p>
            Review your saved scores, identify trends, and track progress across
            organ and lab assessments.
          </p>
        </div>

        <div className="chatWindow" style={{ paddingTop: "28px" }}>
          {loading && <p>Loading health history...</p>}

          {!loading && message && <p>{message}</p>}

          {!loading && !message && history.length === 0 && (
            <p>No health history found yet.</p>
          )}

          {!loading && !message && history.length > 0 && (
            <>
              <div className="assessmentForm">
                <div className="resultBox">
                  <p className="sectionLabel">Overall Trend Score</p>
                  <h2 className={getScoreClass(latestOverallScore)}>
                    {latestOverallScore}/100
                  </h2>
                  <h3>{getStatus(latestOverallScore)}</h3>
                  <p>
                    Calculated from the latest saved score of each tracked
                    module.
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Total Records</p>
                  <h2>{history.length}</h2>
                  <p>Total historical records saved in your account.</p>
                  <p>Tracked modules: {moduleNames.length}</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Top Current Score</p>
                  {bestModule ? (
                    <>
                      <h2 className={getScoreClass(bestModule.score)}>
                        {bestModule.module_name}
                      </h2>
                      <h3>{bestModule.score}/100</h3>
                      <p>{getStatus(bestModule.score)}</p>
                    </>
                  ) : (
                    <p>No data yet.</p>
                  )}
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Priority Current Score</p>
                  {priorityModule ? (
                    <>
                      <h2 className={getScoreClass(priorityModule.score)}>
                        {priorityModule.module_name}
                      </h2>
                      <h3>{priorityModule.score}/100</h3>
                      <p>{getStatus(priorityModule.score)}</p>
                    </>
                  ) : (
                    <p>No data yet.</p>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "28px" }}>
                <p className="sectionLabel">Trend Charts</p>
              </div>

              <div className="assessmentForm">
                {moduleNames.map((moduleName) => {
                  const records = groupedHistory[moduleName];
                  const trend = getTrend(records);
                  const latestRecord = records[0];

                  return (
                    <div className="resultBox" key={moduleName}>
                      <p className="sectionLabel">
                        {getTrendIcon(trend)} {moduleName}
                      </p>

                      <h2 className={getScoreClass(latestRecord.score)}>
                        {latestRecord.score}/100
                      </h2>

                      <h3>{trend}</h3>

                      <p>{getTrendMessage(records)}</p>

                      <p>
                        Latest saved:{" "}
                        {new Date(latestRecord.created_at).toLocaleString()}
                      </p>

                      <div
                        style={{
                          width: "100%",
                          height: "240px",
                          marginTop: "18px",
                          background: "rgba(255,255,255,0.04)",
                          borderRadius: "16px",
                          padding: "12px",
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={getChartData(records)}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="rgba(255,255,255,0.18)"
                            />
                            <XAxis
                              dataKey="date"
                              stroke="rgba(255,255,255,0.6)"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              stroke="rgba(255,255,255,0.6)"
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="#38bdf8"
                              strokeWidth={3}
                              dot={{ r: 5 }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginTop: "14px",
                        }}
                      >
                        {records.slice(0, 5).map((record) => (
                          <div
                            key={record.id}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "12px",
                              background: "rgba(255,255,255,0.08)",
                              minWidth: "74px",
                              textAlign: "center",
                            }}
                          >
                            <strong className={getScoreClass(record.score)}>
                              {record.score}
                            </strong>
                            <p style={{ margin: 0, fontSize: "12px" }}>
                              {new Date(record.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: "28px" }}>
                <p className="sectionLabel">Detailed Records</p>
              </div>

              {moduleNames.map((moduleName) => {
                const records = groupedHistory[moduleName];

                return (
                  <div className="resultBox" key={`${moduleName}-details`}>
                    <p className="sectionLabel">{moduleName} Records</p>

                    {records.map((record) => (
                      <div
                        key={record.id}
                        style={{
                          padding: "12px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        <h3 className={getScoreClass(record.score)}>
                          {record.score}/100
                        </h3>

                        <p>{record.status}</p>

                        <p>{record.notes}</p>

                        <p>
                          Saved on:{" "}
                          {new Date(record.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
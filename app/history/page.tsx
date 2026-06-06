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

  function getTrend(records: HistoryItem[]) {
    if (records.length < 2) return "Not enough data";

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
      return "Complete this assessment more than once to see a trend.";
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

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">HEALTH HISTORY</p>
          <h1>Your Health History & Trends</h1>
          <p>
            Track your previous organ and lab assessment results over time with
            score trends.
          </p>
        </div>

        <div className="chatWindow">
          {loading && <p>Loading health history...</p>}

          {!loading && message && <p>{message}</p>}

          {!loading && !message && history.length === 0 && (
            <p>No health history found yet.</p>
          )}

          {!loading && !message && history.length > 0 && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">History Summary</p>
                <h2>{history.length}</h2>
                <p>Total saved historical records.</p>
                <p>Tracked modules: {moduleNames.length}</p>
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
                          height: "220px",
                          marginTop: "18px",
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={getChartData(records)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="#38bdf8"
                              strokeWidth={3}
                              dot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginTop: "12px",
                        }}
                      >
                        {records.slice(0, 5).map((record) => (
                          <div
                            key={record.id}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "12px",
                              background: "rgba(255,255,255,0.08)",
                              minWidth: "70px",
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
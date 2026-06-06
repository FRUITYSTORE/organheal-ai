"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">HEALTH HISTORY</p>
          <h1>Your Health History</h1>
          <p>
            Track your previous organ and lab assessment results over time.
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
              </div>

              {Object.entries(groupedHistory).map(([moduleName, records]) => (
                <div className="resultBox" key={moduleName}>
                  <p className="sectionLabel">{moduleName}</p>

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
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type HealthHistory = {
  id: string;
  module_name: string;
  score: number;
  status: string;
  notes: string;
  created_at: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HealthHistory[]>([]);
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

    setHistory(data || []);
    setLoading(false);
  }

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 50) return "moderateScore";
    return "riskScore";
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
            <div className="assessmentForm">
              {history.map((item) => (
                <div className="resultBox" key={item.id}>
                  <p className="sectionLabel">{item.module_name}</p>

                  <h2 className={getScoreClass(item.score)}>
                    {item.score}/100
                  </h2>

                  <h3>{item.status}</h3>

                  <p>{item.notes}</p>

                  <p>
                    Saved on: {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
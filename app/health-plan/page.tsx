"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Assessment = {
  organ_name: string;
  score: number;
  risk_level: string;
};

const taskPlans: Record<string, string[]> = {
  Heart: [
    "Monitor blood pressure at least 3 times this week",
    "Reduce high-salt and high-fat meals",
    "Walk or exercise for at least 20 minutes on 4 days",
    "Review cholesterol or lipid profile when available",
    "Repeat Heart assessment after 4 weeks",
  ],
  Lung: [
    "Avoid smoking and second-hand smoke exposure",
    "Track cough, wheezing, or shortness of breath symptoms",
    "Practice light breathing exercises daily",
    "Avoid dust, strong perfumes, and respiratory irritants",
    "Repeat Lung assessment after 4 weeks",
  ],
  Kidney: [
    "Track daily hydration unless medically restricted",
    "Monitor blood pressure regularly",
    "Avoid unnecessary kidney stressors such as NSAIDs without medical advice",
    "Complete kidney function and urine testing if recommended",
    "Repeat Kidney assessment after 4 weeks",
  ],
  Liver: [
    "Reduce sugary and high-fat meals",
    "Focus on weight control and balanced nutrition",
    "Avoid unnecessary liver stressors",
    "Review liver enzymes if available",
    "Repeat Liver assessment after 4 weeks",
  ],
  Brain: [
    "Improve sleep routine and sleep duration",
    "Practice stress reduction for 10 minutes daily",
    "Add regular physical activity",
    "Monitor headaches, memory concerns, or neurological symptoms",
    "Repeat Brain assessment after 4 weeks",
  ],
  Metabolic: [
    "Track weight and waist changes weekly",
    "Reduce sugary drinks and refined carbohydrates",
    "Walk or exercise regularly",
    "Review glucose, HbA1c, and lipid results when available",
    "Repeat Metabolic assessment after 4 weeks",
  ],
  General: [
    "Follow the recommended action from your dashboard",
    "Track hydration and daily wellness habits",
    "Monitor blood pressure if relevant",
    "Complete suggested follow-up tests",
    "Repeat the priority organ assessment after 4 weeks",
  ],
};

export default function HealthPlanPage() {
  const [priorityOrgan, setPriorityOrgan] = useState("General");
  const [priorityScore, setPriorityScore] = useState<number | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPriorityOrgan();
  }, []);

  async function fetchPriorityOrgan() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Please login to view your personalized health plan.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level")
      .eq("user_id", userData.user.id)
      .order("score", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      setMessage("Complete at least one organ assessment to generate a health plan.");
      setLoading(false);
      return;
    }

    setPriorityOrgan(data?.organ_name || "General");
    setPriorityScore(data?.score ?? null);
    setCompletedTasks([]);
    setLoading(false);
  }

  const planTasks = taskPlans[priorityOrgan] || taskPlans.General;

  function toggleTask(task: string) {
    if (completedTasks.includes(task)) {
      setCompletedTasks(completedTasks.filter((item) => item !== task));
    } else {
      setCompletedTasks([...completedTasks, task]);
    }
  }

  const progress = Math.round((completedTasks.length / planTasks.length) * 100);

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">HEALTH IMPROVEMENT PLAN</p>

          <h1>
            {priorityOrgan} 4-Week Improvement Plan
          </h1>

          <p>
            A simple educational action plan based on your current priority
            health area. This plan does not replace medical advice.
          </p>
        </div>

        <div className="chatWindow">
          {loading && <p>Loading health plan...</p>}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">Health Plan</p>
              <h2>Plan Not Ready</h2>
              <p>{message}</p>

              <a href="/assessment">
                <button className="primaryBtn">Start Assessment</button>
              </a>
            </div>
          )}

          {!loading && !message && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">Priority Area</p>
                <h2>{priorityOrgan}</h2>
                <p>
                  Current score:{" "}
                  {priorityScore !== null ? `${priorityScore}/100` : "N/A"}
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Progress</p>
                <h2>{progress}% Complete</h2>

                <div
                  style={{
                    width: "100%",
                    height: "14px",
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: "999px",
                    overflow: "hidden",
                    marginTop: "16px",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #22c55e, #38bdf8)",
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Weekly Action Tasks</p>

                <div style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
                  {planTasks.map((task) => (
                    <label
                      key={task}
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                        padding: "14px",
                        borderRadius: "14px",
                        border: "1px solid rgba(255,255,255,0.2)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={completedTasks.includes(task)}
                        onChange={() => toggleTask(task)}
                      />
                      <span>{task}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Next Step</p>
                <h2>Reassess After 4 Weeks</h2>
                <p>
                  After completing your weekly actions, repeat your{" "}
                  {priorityOrgan} assessment and compare your progress in Health
                  History.
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <a href="/history">
                    <button className="primaryBtn">View Health History</button>
                  </a>

                  <a href={`/${priorityOrgan.toLowerCase()}`}>
                    <button className="secondaryBtn">
                      Reassess {priorityOrgan}
                    </button>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
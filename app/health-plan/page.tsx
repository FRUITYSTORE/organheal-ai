"use client";

import { useState } from "react";

const planTasks = [
  "Follow the recommended action from your dashboard",
  "Track hydration and daily wellness habits",
  "Monitor blood pressure if relevant",
  "Complete suggested follow-up tests",
  "Repeat the priority organ assessment after 4 weeks",
];

export default function HealthPlanPage() {
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  function toggleTask(task: string) {
    if (completedTasks.includes(task)) {
      setCompletedTasks(completedTasks.filter((item) => item !== task));
    } else {
      setCompletedTasks([...completedTasks, task]);
    }
  }

  const progress = Math.round(
    (completedTasks.length / planTasks.length) * 100
  );

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">HEALTH IMPROVEMENT PLAN</p>
          <h1>Your 4-Week Health Action Plan</h1>
          <p>
            Follow a simple action plan based on your current health priority.
            This plan is educational and does not replace medical advice.
          </p>
        </div>

        <div className="chatWindow">
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
              After completing your weekly actions, repeat your priority organ
              assessment and compare the trend in Health History.
            </p>

            <a href="/history">
              <button className="primaryBtn">View Health History</button>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
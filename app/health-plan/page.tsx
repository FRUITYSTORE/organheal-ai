"use client";
import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Assessment = {
  organ_name: string;
  score: number;
  risk_level: string;
};

type DailyCheckIn = {
  mood: string;
  wellness_score: number;
  created_at: string;
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

const weeklyPlan: Record<string, string[]> = {
  Heart: [
    "Week 1: Record blood pressure and review major lifestyle risk factors.",
    "Week 2: Improve activity routine and reduce high-salt meals.",
    "Week 3: Review cholesterol-related habits and repeat daily check-ins.",
    "Week 4: Repeat Heart assessment and compare trend in Health History.",
  ],
  Lung: [
    "Week 1: Track respiratory symptoms and avoid smoke exposure.",
    "Week 2: Add light daily breathing or walking activity.",
    "Week 3: Reduce exposure to dust, perfumes, and irritants.",
    "Week 4: Repeat Lung assessment and review symptom trend.",
  ],
  Kidney: [
    "Week 1: Track hydration and blood pressure if relevant.",
    "Week 2: Review kidney stressors and avoid unnecessary NSAIDs unless advised.",
    "Week 3: Complete kidney function or urine testing if recommended.",
    "Week 4: Repeat Kidney assessment and compare progress.",
  ],
  Liver: [
    "Week 1: Reduce sugary and high-fat meals.",
    "Week 2: Focus on balanced nutrition and weight control.",
    "Week 3: Review liver enzyme results if available.",
    "Week 4: Repeat Liver assessment and monitor improvement.",
  ],
  Brain: [
    "Week 1: Improve sleep timing and reduce late-night screen time.",
    "Week 2: Practice stress reduction for 10 minutes daily.",
    "Week 3: Add regular physical activity and hydration tracking.",
    "Week 4: Repeat Brain assessment and review cognitive wellness trend.",
  ],
  Metabolic: [
    "Week 1: Track weight, sugar intake, and activity level.",
    "Week 2: Reduce refined carbohydrates and sugary drinks.",
    "Week 3: Review glucose, HbA1c, or lipid results if available.",
    "Week 4: Repeat Metabolic assessment and compare progress.",
  ],
  General: [
    "Week 1: Complete your priority assessment and daily check-ins.",
    "Week 2: Follow dashboard recommendations.",
    "Week 3: Review history and trends.",
    "Week 4: Repeat assessment and compare results.",
  ],
};

export default function HealthPlanPage() {
  const [priorityOrgan, setPriorityOrgan] = useState("General");
  const [priorityScore, setPriorityScore] = useState<number | null>(null);
  const [riskLevel, setRiskLevel] = useState("");
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchHealthPlanData();
  }, []);

  async function fetchHealthPlanData() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Please login to view your personalized health plan.");
      setLoading(false);
      return;
    }

    const { data: priorityData, error: priorityError } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level")
      .eq("user_id", userData.user.id)
      .order("score", { ascending: true })
      .limit(1)
      .single();

    if (priorityError) {
      setMessage("Complete at least one organ assessment to generate a health plan.");
      setLoading(false);
      return;
    }

    const { data: checkInData, error: checkInError } = await supabase
      .from("daily_checkins")
      .select("mood, wellness_score, created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (checkInError && checkInError.code !== "PGRST116") {
      setMessage("Database error: " + checkInError.message);
      setLoading(false);
      return;
    }

    setPriorityOrgan(priorityData?.organ_name || "General");
    setPriorityScore(priorityData?.score ?? null);
    setRiskLevel(priorityData?.risk_level || "");
    setDailyCheckIn(checkInData || null);
    setCompletedTasks([]);
    setLoading(false);
  }

  const planTasks = taskPlans[priorityOrgan] || taskPlans.General;
  const weekPlan = weeklyPlan[priorityOrgan] || weeklyPlan.General;

  const targetScore =
    priorityScore === null ? 0 : priorityScore < 50 ? 70 : priorityScore < 80 ? 85 : 95;

  const scoreProgress =
    priorityScore && targetScore
      ? Math.min(100, Math.round((priorityScore / targetScore) * 100))
      : 0;

  const taskProgress = Math.round((completedTasks.length / planTasks.length) * 100);

  function toggleTask(task: string) {
    if (completedTasks.includes(task)) {
      setCompletedTasks(completedTasks.filter((item) => item !== task));
    } else {
      setCompletedTasks([...completedTasks, task]);
    }
  }

  function getPlanIntensity() {
    if (priorityScore === null) return "General";
    if (priorityScore < 50) return "High Priority";
    if (priorityScore < 80) return "Moderate Priority";
    return "Maintenance";
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />
        <div className="assistantHeader">
          <p className="assistantBadge">FOLLOW-UP & HEALTH PLAN</p>

<h1>{priorityOrgan} Follow-Up Plan</h1>

<p>
  A structured follow-up center that connects your priority health area,
  latest assessment score, wellness check-ins, and 4-week educational action
  plan.
</p>
        </div>

        <div className="chatWindow">
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">Loading Follow-Up Plan</p>
<h2>Preparing your follow-up and health plan...</h2>
            </div>
          )}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">Follow-Up Plan</p>
<h2>Follow-Up Plan Not Ready</h2>
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
                  Current Score:{" "}
                  {priorityScore !== null ? `${priorityScore}/100` : "N/A"}
                </p>

                <p>Target Score: {targetScore}/100</p>

                <p>Risk Level: {riskLevel || getPlanIntensity()}</p>

                <p>Plan Intensity: {getPlanIntensity()}</p>

                {dailyCheckIn && (
                  <p>
                    Latest Wellness Check-In: {dailyCheckIn.wellness_score}/100
                    · Mood: {dailyCheckIn.mood}
                  </p>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Goal Progress</p>

                <h2>{scoreProgress}% Toward Target</h2>

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
                      width: `${scoreProgress}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #22c55e, #38bdf8)",
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Task Progress</p>

                <h2>{taskProgress}% Complete</h2>

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
                      width: `${taskProgress}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #22c55e, #38bdf8)",
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Weekly Roadmap</p>

                <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
                  {weekPlan.map((week) => (
                    <div
                      key={week}
                      style={{
                        padding: "14px",
                        borderRadius: "14px",
                        border: "1px solid rgba(255,255,255,0.16)",
                        background: "rgba(15, 23, 42, 0.55)",
                      }}
                    >
                      {week}
                    </div>
                  ))}
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Action Tasks</p>

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
                  After completing your weekly actions, repeat your {priorityOrgan}
                  assessment and compare your progress in Health History.
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

                  <a href="/dashboard">
                    <button className="secondaryBtn">Back to Dashboard</button>
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
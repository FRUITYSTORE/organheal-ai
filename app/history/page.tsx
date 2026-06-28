"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type HealthHistory = {
  id: string;
  module_name: string;
  score: number;
  status: string | null;
  notes: string | null;
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

type UploadedReport = {
  id: number;
  file_name: string | null;
  extraction_status: string | null;
  created_at: string;
};

type HealthInsight = {
  id: number;
  report_id: number | null;
  ai_status: string | null;
  insight_title: string | null;
  created_at: string | null;
};

type SavedIntelligence = {
  insight_id: number;
  updated_at: string | null;
};

type TimelineItem = {
  id: string;
  type: "Assessment" | "Check-In" | "Report" | "Intelligence";
  title: string;
  subtitle: string;
  score?: number | null;
  date: string;
  href: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HealthHistory[]>([]);
  const [dailyCheckIns, setDailyCheckIns] = useState<DailyCheckIn[]>([]);
  const [uploadedReports, setUploadedReports] = useState<UploadedReport[]>([]);
  const [healthInsights, setHealthInsights] = useState<HealthInsight[]>([]);
  const [savedIntelligence, setSavedIntelligence] = useState<SavedIntelligence[]>(
    []
  );

  const [selectedFilter, setSelectedFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Please login or sign up to view your health history.");
      setLoading(false);
      return;
    }

    const userId = userData.user.id;

    const { data: historyData, error: historyError } = await supabase
      .from("health_history")
      .select("id, module_name, score, status, notes, created_at")
      .eq("user_id", userId)
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
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (checkInError) {
      setMessage("Database error: " + checkInError.message);
      setLoading(false);
      return;
    }

    const { data: reportData } = await supabase
      .from("uploaded_lab_files")
      .select("id, file_name, extraction_status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: insightData } = await supabase
      .from("health_insights")
      .select("id, report_id, ai_status, insight_title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const insightIds = (insightData || []).map((item) => item.id);

    let savedDataRows: SavedIntelligence[] = [];

    if (insightIds.length > 0) {
      const { data: savedData } = await supabase
        .from("generated_intelligence_results")
        .select("insight_id, updated_at")
        .eq("user_id", userId)
        .in("insight_id", insightIds)
        .order("updated_at", { ascending: false });

      savedDataRows = savedData || [];
    }

    setHistory((historyData || []) as HealthHistory[]);
    setDailyCheckIns((checkInData || []) as DailyCheckIn[]);
    setUploadedReports((reportData || []) as UploadedReport[]);
    setHealthInsights((insightData || []) as HealthInsight[]);
    setSavedIntelligence(savedDataRows);
    setLoading(false);
  }

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 60) return "moderateScore";
    return "riskScore";
  }

  function getScoreStatus(score: number) {
    if (score >= 80) return "Strong";
    if (score >= 60) return "Stable";
    if (score >= 40) return "Needs Attention";
    return "Recovery Needed";
  }

  const allScores = [
    ...history.map((item) => item.score),
    ...dailyCheckIns.map((item) => item.wellness_score),
  ];

  const overallProgressScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
      : 0;

  const latestAssessment = history[0] || null;
  const latestCheckIn = dailyCheckIns[0] || null;

  const bestAssessment =
    history.length > 0 ? [...history].sort((a, b) => b.score - a.score)[0] : null;

  const priorityAssessment =
    history.length > 0 ? [...history].sort((a, b) => a.score - b.score)[0] : null;

  const processedReports = uploadedReports.filter(
    (item) => item.extraction_status === "Completed"
  ).length;

  const pendingReports = uploadedReports.filter(
    (item) => item.extraction_status !== "Completed"
  ).length;

  const savedIntelligenceIds = new Set(
    savedIntelligence.map((item) => item.insight_id)
  );

  const generatedInsights = healthInsights.filter(
    (item) => item.ai_status === "Generated" || savedIntelligenceIds.has(item.id)
  );

  const assessmentTrend = useMemo(() => {
    if (history.length < 2) {
      return {
        label: "Assessment trend not ready",
        description:
          "Complete at least two assessments to compare progress over time.",
        className: "",
      };
    }

    const latest = history[0];
    const previous = history[1];
    const difference = latest.score - previous.score;

    if (difference > 0) {
      return {
        label: "Assessment progress improving",
        description: `${latest.module_name} improved by ${difference} points compared with the previous record.`,
        className: "goodScore",
      };
    }

    if (difference < 0) {
      return {
        label: "Assessment progress declined",
        description: `${latest.module_name} declined by ${Math.abs(
          difference
        )} points. Review your follow-up plan and reassess after 4 weeks.`,
        className: "riskScore",
      };
    }

    return {
      label: "Assessment progress stable",
      description:
        "Your latest assessment score is stable compared with the previous record.",
      className: "moderateScore",
    };
  }, [history]);

  const wellnessTrend = useMemo(() => {
    if (dailyCheckIns.length < 2) {
      return {
        label: "Wellness trend not ready",
        description:
          "Complete at least two check-ins to compare wellness movement.",
        className: "",
      };
    }

    const latest = dailyCheckIns[0];
    const previous = dailyCheckIns[1];
    const difference = latest.wellness_score - previous.wellness_score;

    if (difference > 0) {
      return {
        label: "Wellness improving",
        description: `Your wellness score improved by ${difference} points compared with your previous check-in.`,
        className: "goodScore",
      };
    }

    if (difference < 0) {
      return {
        label: "Wellness needs attention",
        description: `Your wellness score decreased by ${Math.abs(
          difference
        )} points. Focus on sleep, stress, hydration, and recovery today.`,
        className: "riskScore",
      };
    }

    return {
      label: "Wellness stable",
      description:
        "Your wellness score stayed the same compared with your previous check-in.",
      className: "moderateScore",
    };
  }, [dailyCheckIns]);

  const timelineItems: TimelineItem[] = [
    ...history.map((item) => ({
      id: `assessment-${item.id}`,
      type: "Assessment" as const,
      title: item.module_name,
      subtitle: item.status || "Assessment saved",
      score: item.score,
      date: item.created_at,
      href: "/assessment",
    })),

    ...dailyCheckIns.map((item) => ({
      id: `checkin-${item.id}`,
      type: "Check-In" as const,
      title: `Wellness Check-In · ${item.mood}`,
      subtitle: `Energy ${item.energy_level}/5 · Sleep ${item.sleep_quality}/5 · Stress ${item.stress_level}/5`,
      score: item.wellness_score,
      date: item.created_at,
      href: "/checkin",
    })),

    ...uploadedReports.map((item) => ({
      id: `report-${item.id}`,
      type: "Report" as const,
      title: item.file_name || "Medical report",
      subtitle: item.extraction_status || "Uploaded",
      score: null,
      date: item.created_at,
      href: "/reports",
    })),

    ...generatedInsights.map((item) => ({
      id: `intelligence-${item.id}`,
      type: "Intelligence" as const,
      title: item.insight_title || "Saved health intelligence",
      subtitle:
        item.ai_status === "Generated"
          ? "Generated intelligence result"
          : "Saved intelligence result",
      score: null,
      date: item.created_at || new Date().toISOString(),
      href: "/intelligence",
    })),
  ].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filters = ["All", "Assessment", "Check-In", "Report", "Intelligence"];

  const filteredTimeline =
    selectedFilter === "All"
      ? timelineItems
      : timelineItems.filter((item) => item.type === selectedFilter);

  const recommendedAction =
    history.length === 0
      ? {
          label: "Start your progress history",
          description:
            "Complete an assessment so OrganHeal can begin building your progress timeline.",
          href: "/assessment",
          buttonText: "Start Assessment",
        }
      : dailyCheckIns.length === 0
      ? {
          label: "Add wellness tracking",
          description:
            "Complete a daily check-in so your progress timeline reflects how you feel today.",
          href: "/checkin",
          buttonText: "Open Check-In",
        }
      : uploadedReports.length === 0
      ? {
          label: "Add medical reports",
          description:
            "Upload a medical report to connect your progress timeline with report intelligence.",
          href: "/lab-upload",
          buttonText: "Upload Report",
        }
      : savedIntelligence.length === 0
      ? {
          label: "Generate saved intelligence",
          description:
            "Open Intelligence Center to generate and save report-based health intelligence.",
          href: "/intelligence",
          buttonText: "Open Intelligence",
        }
      : {
          label: "Continue your follow-up plan",
          description:
            "Your history has assessments, check-ins, reports, and saved intelligence. Continue with your health plan.",
          href: "/health-plan",
          buttonText: "Open Health Plan",
        };

  const hasAnyHistory = timelineItems.length > 0;

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">HEALTH HISTORY</p>
          <h1>Progress Timeline</h1>
          <p>
            Review your assessments, wellness check-ins, uploaded reports, saved
            intelligence, trends, and recommended next step.
          </p>
        </div>

        <div className="chatWindow">
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">Loading History</p>
              <h2>Preparing your progress timeline...</h2>
            </div>
          )}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">Login Required</p>
              <h2>Access Protected</h2>
              <p>{message}</p>

              <Link href="/login" className="primaryBtn">
                Login
              </Link>
            </div>
          )}

          {!loading && !message && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">Recommended Next Step</p>

                <h2>{recommendedAction.label}</h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    marginBottom: "18px",
                  }}
                >
                  {recommendedAction.description}
                </p>

                <Link href={recommendedAction.href} className="primaryBtn">
                  {recommendedAction.buttonText}
                </Link>
              </div>

              <div className="assessmentForm">
                <div className="resultBox">
                  <p className="sectionLabel">Overall Progress Score</p>
                  <h2 className={getScoreClass(overallProgressScore)}>
                    {overallProgressScore}/100
                  </h2>
                  <h3>
                    {allScores.length > 0
                      ? getScoreStatus(overallProgressScore)
                      : "No Data Yet"}
                  </h3>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Assessments</p>
                  <h2>{history.length}</h2>
                  <p>Total saved assessment records.</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Check-Ins</p>
                  <h2>{dailyCheckIns.length}</h2>
                  <p>Total wellness check-ins saved.</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Reports</p>
                  <h2>{uploadedReports.length}</h2>
                  <p>
                    {processedReports} processed · {pendingReports} pending
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Saved Intelligence</p>
                  <h2>{savedIntelligence.length}</h2>
                  <p>Saved intelligence results connected to your reports.</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Priority Focus</p>
                  <h2>{priorityAssessment?.module_name || "N/A"}</h2>
                  <p>
                    {priorityAssessment
                      ? `Lowest assessment score: ${priorityAssessment.score}/100`
                      : "Complete assessments to identify a priority area."}
                  </p>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Progress Trends</p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "14px",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <strong className={assessmentTrend.className}>
                      {assessmentTrend.label}
                    </strong>
                    <p>{assessmentTrend.description}</p>
                  </div>

                  <div>
                    <strong className={wellnessTrend.className}>
                      {wellnessTrend.label}
                    </strong>
                    <p>{wellnessTrend.description}</p>
                  </div>

                  <div>
                    <strong>Best Assessment</strong>
                    <p>
                      {bestAssessment
                        ? `${bestAssessment.module_name} · ${bestAssessment.score}/100`
                        : "No assessment yet"}
                    </p>
                  </div>

                  <div>
                    <strong>Latest Check-In</strong>
                    <p>
                      {latestCheckIn
                        ? `${latestCheckIn.wellness_score}/100 · ${latestCheckIn.mood}`
                        : "No check-in yet"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">Filter Timeline</p>

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
                <p className="sectionLabel">Progress Timeline</p>

                {!hasAnyHistory ? (
                  <>
                    <h2>No saved progress yet</h2>
                    <p>
                      Start with an assessment or daily check-in to build your
                      progress timeline.
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        marginTop: "18px",
                      }}
                    >
                      <Link href="/assessment" className="primaryBtn">
                        Start Assessment
                      </Link>

                      <Link href="/checkin" className="secondaryBtn">
                        Open Check-In
                      </Link>
                    </div>
                  </>
                ) : filteredTimeline.length === 0 ? (
                  <p>No records found for this filter.</p>
                ) : (
                  <div className="healthTimeline">
                    {filteredTimeline.map((item) => (
                      <div className="timelineItem active" key={item.id}>
                        <strong>
                          {item.type}: {item.title}
                        </strong>

                        <span>
                          {item.score !== null && item.score !== undefined
                            ? `${item.score}/100 · `
                            : ""}
                          {item.subtitle}
                        </span>

                        <span>{new Date(item.date).toLocaleString()}</span>

                        <Link href={item.href} className="secondaryBtn">
                          Open
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">History Journey</p>

                <h2>Continue from your progress timeline</h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    maxWidth: "760px",
                    margin: "0 auto 22px",
                  }}
                >
                  Your history connects assessments, wellness check-ins,
                  reports, saved intelligence, and your follow-up plan.
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Link href="/dashboard" className="secondaryBtn">
                    Dashboard
                  </Link>

                  <Link href="/profile" className="secondaryBtn">
                    Profile
                  </Link>

                  <Link href="/checkin" className="secondaryBtn">
                    Check-In
                  </Link>

                  <Link href="/reports" className="secondaryBtn">
                    Reports
                  </Link>

                  <Link href="/intelligence" className="secondaryBtn">
                    Intelligence
                  </Link>

                  <Link href="/health-plan" className="primaryBtn">
                    Health Plan
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
"use client";
import { generateIntelligenceFromText } from "../../lib/extractedTextIntelligence";
import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { buildHealthIntelligence } from "../../lib/intelligenceBuilder";
import {
  detectLabMarkers,
  buildLabMarkerSummary,
} from "../../lib/labMarkerDetector";
import { buildHealthStrategy } from "../../lib/healthStrategyEngine";
import { buildUnifiedHealthIntelligence } from "../../lib/unifiedHealthEngine";
import { detectClinicalPatterns } from "../../lib/clinicalPatternEngine";
import { buildCrossSourceIntelligence } from "../../lib/crossSourceIntelligence";
import { buildForecast } from "../../lib/forecastEngine";


type Assessment = {
  organ_name: string;
  score: number;
  created_at: string;
};

type DailyCheckIn = {
  mood: string | null;
  wellness_score: number | null;
  created_at: string;
};


type HealthEngine = ReturnType<typeof buildHealthIntelligence>;

type HealthInsight = {
  id: number;
  report_id: number | null;
  report_type: string | null;
  insight_title: string | null;
  ai_status: string | null;
  risk_level: string | null;
  next_best_action: string | null;
  created_at: string;

  medical_category?: string | null;
  summary?: string | null;
  key_findings?: string | null;
  risk_signals?: string | null;
  recommendations?: string | null;
  doctor_brief?: string | null;

  extraction_status?: string | null;
  extracted_text?: string | null;
  extracted_at?: string | null;

  file_name?: string;
  file_path?: string | null;
  uploaded_at?: string;
};

export default function IntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [healthEngine, setHealthEngine] = useState<HealthEngine | null>(null);
  const [healthInsights, setHealthInsights] = useState<HealthInsight[]>([]);
  const [assessmentData, setAssessmentData] = useState<Assessment[]>([]);
const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [generatedStrategy, setGeneratedStrategy] = useState<any>(null);
  const [generatedUnifiedHealth, setGeneratedUnifiedHealth] = useState<any>(null);
  const [generatedCrossSource, setGeneratedCrossSource] = useState<any>(null);
  const [generatedForecast, setGeneratedForecast] = useState<any>(null);
 

  useEffect(() => {
    loadIntelligence();
  }, []);

  async function loadIntelligence() {
    setLoading(true);
    setMessage("");

const { data: userData, error: userError } = await supabase.auth.getUser();

if (userError || !userData.user) {
  window.location.href = "/login";
  return;
}

    const userId = userData.user.id;

const { data: checkInData } = await supabase
  .from("daily_checkins")
  .select("mood, wellness_score, created_at")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

setDailyCheckIn(checkInData || null);

    const { data: assessments, error: assessmentError } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (assessmentError) {
      setMessage("Database error: " + assessmentError.message);
      setLoading(false);
      return;
    }

    const assessmentData = (assessments || []) as Assessment[];
    setAssessmentData(assessmentData);

    if (assessmentData.length > 0) {
      const intelligence = buildHealthIntelligence({
        assessments: assessmentData,
        labReport: null,
        dailyCheckIn: null,
        isArabic: false,
      });
      

      setHealthEngine(intelligence);
    }

    const { data: insights, error: insightsError } = await supabase
      .from("health_insights")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (insightsError) {
      setMessage("Could not load medical report intelligence.");
      setLoading(false);
      return;
    }

    const reportIds = (insights || [])
      .map((item) => item.report_id)
      .filter(Boolean);

    let reports: {
      id: number;
      file_name: string;
      file_path: string;
      created_at: string;
      extraction_status: string | null;
      extracted_text: string | null;
      extracted_at: string | null;
    }[] = [];

    if (reportIds.length > 0) {
      const { data: reportData } = await supabase
        .from("uploaded_lab_files")
        .select(
          "id, file_name, file_path, created_at, extraction_status, extracted_text, extracted_at"
        )
        .in("id", reportIds);

      reports = reportData || [];
    }

    const mergedInsights = (insights || []).map((item) => {
      const report = reports.find(
        (reportItem) => reportItem.id === item.report_id
      );

      return {
        ...item,
        file_name: report?.file_name || "Medical report",
        file_path: report?.file_path || null,
        uploaded_at: report?.created_at || item.created_at,
        extraction_status: report?.extraction_status || "Pending",
        extracted_text: report?.extracted_text || null,
        extracted_at: report?.extracted_at || null,
      };
    });

    setHealthInsights(mergedInsights);

    if (assessmentData.length === 0 && mergedInsights.length === 0) {
      setMessage(
        "Complete your first organ assessment or upload a medical report to unlock intelligence."
      );
    }

    setLoading(false);
  }

  async function openMedicalReport(filePath: string | null | undefined) {
    if (!filePath) return;

    const { data, error } = await supabase.storage
      .from("lab-reports")
      .createSignedUrl(filePath, 60 * 60);

    if (error) {
      alert("Could not open report: " + error.message);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function generateReportIntelligence(insightId: number) {
    const selectedInsight = healthInsights.find((item) => item.id === insightId);

    if (!selectedInsight) return;

    let extractedText: string | null = null;

   if (selectedInsight.report_id && selectedInsight.file_path) {
      try {
        const extractionResponse = await fetch("/api/extract-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reportId: selectedInsight.report_id,
            filePath: selectedInsight.file_path,
            fileName: selectedInsight.file_name,
          }),
        });

        const extractionResult = await extractionResponse.json();

        if (!extractionResponse.ok || !extractionResult.success) {
          alert(extractionResult.error || "PDF extraction failed.");
          return;
        }

        extractedText = extractionResult.text || null;
      } catch (error) {
        console.error("Extraction failed", error);
        alert("Extraction failed.");
        return;
      }
    }
    if (!extractedText && selectedInsight.report_id) {
      const { data: reportData } = await supabase
        .from("uploaded_lab_files")
        .select("extracted_text")
        .eq("id", selectedInsight.report_id)
        .single();

      extractedText = reportData?.extracted_text || null;
    }

    if (!extractedText || extractedText.length < 30) {
      alert("No readable PDF text was extracted yet.");
      return;
    }

const detectedMarkers = detectLabMarkers(extractedText);
const markerSummary = buildLabMarkerSummary(detectedMarkers);
const clinicalPatterns = detectClinicalPatterns(detectedMarkers);
const healthStrategy = buildHealthStrategy(detectedMarkers);

const unifiedHealth = buildUnifiedHealthIntelligence({
  detectedMarkers,
  healthStrategy,
});
const crossSource = buildCrossSourceIntelligence({
  detectedMarkers,
});

setGeneratedCrossSource(crossSource);
const forecast = buildForecast(
  detectedMarkers,
  crossSource.confidenceScore
);

setGeneratedForecast(forecast);
setGeneratedUnifiedHealth(unifiedHealth);
const intelligence = {
  ...generateIntelligenceFromText(extractedText, selectedInsight.report_type),
  summary: markerSummary.summary,
  key_findings: markerSummary.keyFindings,
  risk_signals:
  clinicalPatterns.length > 0
    ? clinicalPatterns
        .map(
          (pattern) =>
            `${pattern.title} (${pattern.severity}): ${pattern.summary}`
        )
        .join("\n")
    : markerSummary.riskSignals,
recommendations:
  clinicalPatterns.length > 0
    ? clinicalPatterns
        .map(
          (pattern) =>
            `${pattern.title}: ${pattern.suggestedFocus}`
        )
        .join("\n")
    : markerSummary.recommendations,
  doctor_brief: `Detected lab markers:
${markerSummary.keyFindings}

Unified Health Intelligence:
${unifiedHealth.healthForecast}

Priority Goal:
${unifiedHealth.priorityGoal}

Next Best Action:
${unifiedHealth.nextBestAction}

Clinical note: This is an educational interpretation and should be reviewed by a licensed healthcare professional.`,
};
setGeneratedStrategy(healthStrategy);

    const { error } = await supabase
      .from("health_insights")
      .update(intelligence)
      .eq("id", insightId);

    if (error) {
      alert("Could not generate intelligence: " + error.message);
      return;
    }

    setHealthInsights((currentInsights) =>
      currentInsights.map((item) =>
        item.id === insightId
          ? {
              ...item,
              ...intelligence,
              extraction_status: "Completed",
              extracted_text: extractedText,
              extracted_at: new Date().toISOString(),
            }
          : item
      )
    );
  }

  function getReportTypeLabel(type: string | null) {
    if (type === "lab") return "Laboratory Report";
    if (type === "radiology") return "Radiology Report";
    if (type === "discharge") return "Discharge Summary";
    return "Medical Report";
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />

        <section className="assistantHeader">
          <p className="assistantBadge">ORGANHEAL INTELLIGENCE CENTER</p>
          <h1>Health Intelligence Center</h1>
          <p>
            A focused view for your health profile, medical reports, top
            opportunities, and doctor-ready intelligence.
          </p>
        </section>

        <section className="chatWindow">
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">LOADING INTELLIGENCE</p>
              <h2>Preparing your health intelligence...</h2>
            </div>
          )}

          {!loading && message && !healthEngine && healthInsights.length === 0 && (
            <div className="resultBox">
              <p className="sectionLabel">INTELLIGENCE STATUS</p>
              <h2>Not enough data yet</h2>
              <p>{message}</p>
            </div>
          )}

          {!loading && healthEngine && (
            <div className="resultBox">
              <p className="sectionLabel">🪪 HEALTH PASSPORT</p>
              <h2>{healthEngine.healthProfile}</h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "14px",
                  marginTop: "18px",
                }}
              >
                <div>
                  <strong>Overall Score</strong>
                  <p>{healthEngine.overallScore}/100</p>
                </div>

                <div>
                  <strong>Health Age</strong>
                  <p>{healthEngine.healthAgeStatus}</p>
                </div>

                <div>
                  <strong>Priority Area</strong>
                  <p>{healthEngine.priorityOrgan || "N/A"}</p>
                </div>

                <div>
                  <strong>Potential Score</strong>
                  <p>{healthEngine.potentialScore}/100</p>
                </div>
              </div>
            </div>
          )}

          {!loading && (
            <div className="resultBox">
              <p className="sectionLabel">📄 MEDICAL REPORT INTELLIGENCE</p>
              <h2>Reports Ready for Medical Intelligence</h2>

              {healthInsights.length === 0 ? (
                <p>No uploaded reports are ready for intelligence yet.</p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    marginTop: "18px",
                  }}
                >
                  {healthInsights.map((item) => {
                    const isGenerated =
                      item.ai_status === "Generated" &&
                      item.extraction_status === "Completed";

                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: "14px 16px",
                          borderRadius: "16px",
                          background: "rgba(15,23,42,0.75)",
                          border: "1px solid rgba(34,211,238,0.18)",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: "12px",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <h3 style={{ marginBottom: "6px" }}>
                              📄 {item.file_name}
                            </h3>

                            <p style={{ margin: 0 }}>
                              {getReportTypeLabel(item.report_type)} •{" "}
                              {new Date(
                                item.uploaded_at || item.created_at
                              ).toLocaleString()}
                            </p>

                            <p style={{ marginTop: "6px" }}>
                              Extraction: {item.extraction_status || "Pending"}
                            </p>

                            <p style={{ marginTop: "8px", fontWeight: 800 }}>
                              {isGenerated
                                ? "Intelligence Generated"
                                : "Ready for Interpretation"}
                            </p>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              flexWrap: "wrap",
                              justifyContent: "flex-end",
                            }}
                          >
                            {item.file_path && (
                              <button
                                className="secondaryBtn"
                                onClick={() => openMedicalReport(item.file_path)}
                              >
                                Open
                              </button>
                            )}

                            <button
                              className="primaryBtn"
                              onClick={() => generateReportIntelligence(item.id)}
                              disabled={isGenerated}
                            >
                              {isGenerated ? "Generated" : "Generate"}
                            </button>
                          </div>
                        </div>

                        {isGenerated && (
                          <div style={{ marginTop: "16px" }}>
                            <p>
                              <strong>Medical Category:</strong>{" "}
                              {item.medical_category}
                            </p>

                            <p>
                              <strong>Summary:</strong> {item.summary}
                            </p>

                            <p>
                              <strong>Key Findings:</strong> {item.key_findings}
                            </p>

                            <p>
                              <strong>Risk Signals:</strong> {item.risk_signals}
                            </p>

                            <p>
                              <strong>Recommendations:</strong>{" "}
                              {item.recommendations}
                            </p>

                            <p>
                              <strong>Doctor Brief:</strong> {item.doctor_brief}
                            </p>
                            {generatedStrategy && (
  <div className="resultBox">
    <p className="sectionLabel">Personal Health Strategy</p>

    <h3>Health Risks</h3>
    <p style={{ whiteSpace: "pre-line" }}>{generatedStrategy.healthRisks}</p>

    <h3>90-Day Action Plan</h3>
    <p style={{ whiteSpace: "pre-line" }}>
      {generatedStrategy.actionPlan90Days}
    </p>

    <h3>Nutrition Strategy</h3>
    <p style={{ whiteSpace: "pre-line" }}>
      {generatedStrategy.nutritionStrategy}
    </p>

    <h3>Follow-Up Plan</h3>
    <p style={{ whiteSpace: "pre-line" }}>{generatedStrategy.followUpPlan}</p>
  </div>
)}

{generatedUnifiedHealth && (
  <div className="resultBox">
    <p className="sectionLabel">Health Intelligence Summary</p>

    <h3>Current Profile</h3>
    <p>{generatedUnifiedHealth.currentProfile}</p>

    {generatedUnifiedHealth.topPriorities?.length > 0 && (
      <>
        <h3>Top Health Priorities</h3>

        {generatedUnifiedHealth.topPriorities
          .slice(0, 3)
          .map((priority: any, index: number) => (
            <div key={index} style={{ marginBottom: "16px" }}>
              <strong>
                #{index + 1} {priority.area}
              </strong>
              <p>Severity: {priority.severity}</p>
              <p>Priority Score: {priority.score}</p>
            </div>
          ))}
      </>
    )}

    <h3>Priority Goal</h3>
    <p>{generatedUnifiedHealth.priorityGoal}</p>

    <h3>Health Forecast</h3>
    <p>{generatedUnifiedHealth.healthForecast}</p>

    <h3>Expected Improvement</h3>
    <p>{generatedUnifiedHealth.expectedImprovement}</p>

    <h3>Next Best Action</h3>
    <p>{generatedUnifiedHealth.nextBestAction}</p>
  </div>
)}

{generatedCrossSource && (
  <div className="resultBox">
    <p className="sectionLabel">Cross-Source Intelligence</p>
    {generatedForecast && (
  <div className="resultBox">
    <p className="sectionLabel">90-Day Health Forecast</p>
    <h3>Current Health Score</h3>
<p>{generatedForecast.currentScore}/100</p>

<h3>Projected Scores</h3>

<p>
  Best Case: {generatedForecast.bestCaseScore}/100
</p>

<p>
  Expected: {generatedForecast.expectedScore}/100
</p>

<p>
  Risk Case: {generatedForecast.riskScore}/100
</p>

<h3>Current Trajectory</h3>
<p>{generatedForecast.currentTrajectory}</p>

<h3>Improvement Potential</h3>
<p>{generatedForecast.improvementPotential}</p>

    <h3>Forecast Score</h3>
    <p>{generatedForecast.forecastScore}/100</p>

    <h3>Best Case Scenario</h3>
    <p>{generatedForecast.bestCase}</p>

    <h3>Expected Scenario</h3>
    <p>{generatedForecast.expectedCase}</p>

    <h3>Risk Escalation Scenario</h3>
    <p>{generatedForecast.riskCase}</p>
  </div>
)}

    <h3>Confidence Level</h3>
    <p>{generatedCrossSource.confidenceLevel}</p>

    <h3>Confidence Score</h3>
    <p>{generatedCrossSource.confidenceScore}/100</p>

    <h3>Primary System</h3>
    <p>{generatedCrossSource.primarySystem}</p>

    <h3>Supporting Sources</h3>
    {generatedCrossSource.supportingSources.length > 0 ? (
      <ul>
        {generatedCrossSource.supportingSources.map(
          (source: string, index: number) => (
            <li key={index}>{source}</li>
          )
        )}
      </ul>
    ) : (
      <p>No additional supporting sources detected yet.</p>
    )}

    <h3>Intelligence Summary</h3>
    <p>{generatedCrossSource.intelligenceSummary}</p>
  </div>
)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!loading && healthEngine && (
            <div className="resultBox">
              <p className="sectionLabel">🏆 HEALTH INTELLIGENCE SNAPSHOT</p>
              <h2>Top Opportunities</h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "14px",
                  marginTop: "18px",
                }}
              >
                <div>
                  <strong>Strongest Area</strong>
                  <p>{healthEngine.strongestOrgan || "N/A"}</p>
                </div>

                <div>
                  <strong>Risk Pattern</strong>
                  <p>{healthEngine.riskPattern}</p>
                </div>

                <div>
                  <strong>Potential Gain</strong>
                  <p>+{healthEngine.potentialGain}</p>
                </div>
              </div>

              {healthEngine.opportunities.length === 0 ? (
                <p style={{ marginTop: "18px" }}>
                  Complete more assessments to generate opportunities.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "14px",
                    marginTop: "18px",
                  }}
                >
                  {healthEngine.opportunities.slice(0, 3).map((item) => (
                    <div
                      key={item.organ}
                      style={{
                        padding: "16px",
                        borderRadius: "16px",
                        background: "rgba(15,23,42,0.75)",
                        border: "1px solid rgba(34,211,238,0.18)",
                        textAlign: "left",
                      }}
                    >
                      <h3>{item.title}</h3>
                      <p>
                        Current: {item.currentScore}/100 → Potential:{" "}
                        {item.potentialScore}/100
                      </p>
                      <p>
                        Potential Gain: <strong>+{item.potentialGain}</strong>
                      </p>
                      <p>
                        Priority: <strong>{item.priority}</strong>
                      </p>
                      <p>{item.action}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && healthEngine && (
            <div className="resultBox">
              <p className="sectionLabel">🩺 DOCTOR READY SUMMARY</p>
              <h2>Doctor Brief</h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "14px",
                  marginTop: "18px",
                  textAlign: "left",
                }}
              >
                <div>
                  <strong>Overall Score</strong>
                  <p>{healthEngine.overallScore}/100</p>
                </div>

                <div>
                  <strong>Priority Area</strong>
                  <p>{healthEngine.priorityOrgan || "N/A"}</p>
                </div>

                <div>
                  <strong>Risk Pattern</strong>
                  <p>{healthEngine.riskPattern}</p>
                </div>

                <div>
                  <strong>Main Opportunity</strong>
                  <p>{healthEngine.opportunityTitle}</p>
                </div>
              </div>

              <p style={{ marginTop: "18px", textAlign: "left" }}>
                {healthEngine.bestNextAction}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
"use client";
import { buildActionPlan } from "../../lib/actionPlanEngine";
import { buildHealthStory } from "../../lib/healthStoryEngine";
import { buildHistoricalLabTrends } from "../../lib/historicalLabTrendEngine";
import { buildLongitudinalRisk } from "../../lib/longitudinalRiskEngine";
import { buildHealthTimeline } from "../../lib/healthTimelineEngine";
import { buildPatientDigitalTwin } from "../../lib/patientDigitalTwin";
import { buildCrossSourceIntelligence } from "../../lib/crossSourceIntelligence";
import {
  detectRadiologyFindings,
  buildRadiologySummary,
} from "../../lib/radiologyEngine";
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
import { buildForecast } from "../../lib/forecastEngine";
import ExecutiveSummaryCard from "./components/ExecutiveSummaryCard";
import HealthStoryCard from "./components/HealthStoryCard";
import ActionPlanCard from "./components/ActionPlanCard";
import TimelineCard from "./components/TimelineCard";
import LongitudinalRiskCard from "./components/LongitudinalRiskCard";
import LabTrendsCard from "./components/LabTrendsCard";
import CrossSourceCard from "./components/CrossSourceCard";
import DigitalTwinCard from "./components/DigitalTwinCard";
import ForecastCard from "./components/ForecastCard";
import UnifiedHealthCard from "./components/UnifiedHealthCard";
import MedicalReportCard from "./components/MedicalReportCard";
import MedicalReportList from "./components/MedicalReportList";




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
  const [generatedTimeline, setGeneratedTimeline] = useState<any>(null);
  const [generatedLongitudinalRisk, setGeneratedLongitudinalRisk] = useState<any>(null);
  const [generatedHealthStory, setGeneratedHealthStory] = useState("");
  const [generatedActionPlan, setGeneratedActionPlan] = useState<any>(null);
  const [generatedExecutiveSummary, setGeneratedExecutiveSummary] =
  useState<any>(null);

  const [generatedLabTrends, setGeneratedLabTrends] = useState<any[]>([]);
  const [generatedForecast, setGeneratedForecast] = useState<any>(null);
 const [generatedDigitalTwin, setGeneratedDigitalTwin] = useState<any>(null);

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
    alert("No readable report text was extracted yet.");
    return;
  }

  const detectedMarkers = detectLabMarkers(extractedText);
  const { data: userData } = await supabase.auth.getUser();

if (userData.user && selectedInsight.report_id) {
  const markerRows = detectedMarkers
    .filter((marker) => marker.value !== null)
    .map((marker) => ({
      user_id: userData.user.id,
      report_id: selectedInsight.report_id,
      marker_name: marker.marker,
      marker_value: marker.value,
      marker_unit: marker.unit,
    }));

  if (markerRows.length > 0) {
    await supabase.from("medical_report_markers").insert(markerRows);
  }
}
  const markerSummary = buildLabMarkerSummary(detectedMarkers);

  let historicalMarkerRows: any[] = [];

const { data: userDataForHistory } = await supabase.auth.getUser();

if (userDataForHistory.user) {
  const { data } = await supabase
    .from("medical_report_markers")
    .select("marker_name, marker_value, created_at")
    .eq("user_id", userDataForHistory.user.id)
    .order("created_at", { ascending: true });

  historicalMarkerRows = data || [];
}

const labTrends = buildHistoricalLabTrends(
  historicalMarkerRows
    .filter((row) => row.marker_value !== null)
    .map((row) => ({
      marker: row.marker_name,
      value: Number(row.marker_value),
      date: row.created_at,
    }))
);

  const radiologyFindings = detectRadiologyFindings(extractedText);
  const radiologySummary = buildRadiologySummary(radiologyFindings);
  const isRadiologyReport = selectedInsight.report_type === "radiology";

  const clinicalPatterns = detectClinicalPatterns(detectedMarkers);
  const healthStrategy = buildHealthStrategy(detectedMarkers);

  const unifiedHealth = buildUnifiedHealthIntelligence({
    detectedMarkers,
    healthStrategy,
  });

  const digitalTwin = buildPatientDigitalTwin({
    markers: detectedMarkers,
    radiologyFindings,
  });

  const crossSource = buildCrossSourceIntelligence({
    detectedMarkers,
    assessments: assessmentData,
    dailyCheckIn,
  });

  const timeline = buildHealthTimeline([
    ...assessmentData.map((item) => ({
      source: "assessment" as const,
      label: item.organ_name,
      score: item.score,
      date: item.created_at,
    })),

    ...(dailyCheckIn
      ? [
          {
            source: "checkin" as const,
            label: "Daily Check-In",
            score: dailyCheckIn.wellness_score || 0,
            date: dailyCheckIn.created_at,
          },
        ]
      : []),
  ]);

  const longitudinalRisk = buildLongitudinalRisk(timeline);
  const forecast = buildForecast(detectedMarkers, crossSource.confidenceScore);

  const healthStory = buildHealthStory({
    timeline,
    longitudinalRisk,
    forecast,
    crossSource,
    digitalTwin,
  });
const actionPlan = buildActionPlan({
  digitalTwin,
  forecast,
  longitudinalRisk,
  crossSource,
});
const executiveSummary = {
  currentScore: forecast.currentScore,
  trend: timeline.trendDirection,
  forecastScore: forecast.forecastScore,
  confidenceLevel: crossSource.confidenceLevel,
  confidenceScore: crossSource.confidenceScore,
  prioritySystem: digitalTwin.primarySystem,
  nextBestAction: unifiedHealth.nextBestAction,
};

  setGeneratedStrategy(healthStrategy);
  setGeneratedUnifiedHealth(unifiedHealth);
  setGeneratedDigitalTwin(digitalTwin);
  setGeneratedCrossSource(crossSource);
  setGeneratedTimeline(timeline);
  setGeneratedLongitudinalRisk(longitudinalRisk);
  setGeneratedForecast(forecast);
  setGeneratedHealthStory(healthStory);
  setGeneratedActionPlan(actionPlan);
  setGeneratedExecutiveSummary(executiveSummary);
  setGeneratedLabTrends(labTrends);

  const intelligence = {
    ...generateIntelligenceFromText(extractedText, selectedInsight.report_type),
    ai_status: "Generated",
    summary: isRadiologyReport ? radiologySummary.summary : markerSummary.summary,
    key_findings: isRadiologyReport
      ? radiologySummary.riskSignals
      : markerSummary.keyFindings,
    risk_signals:
      clinicalPatterns.length > 0
        ? clinicalPatterns
            .map(
              (pattern) =>
                `${pattern.title} (${pattern.severity}): ${pattern.summary}`
            )
            .join("\n")
        : markerSummary.riskSignals,
    recommendations: isRadiologyReport
      ? radiologySummary.recommendations
      : clinicalPatterns.length > 0
      ? clinicalPatterns
          .map((pattern) => `${pattern.title}: ${pattern.suggestedFocus}`)
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
  <MedicalReportList hasReports={healthInsights.length > 0}>
    {healthInsights.map((item) => {
      const isGenerated =
        item.ai_status === "Generated" &&
        item.extraction_status === "Completed";

      return (
        <MedicalReportCard
          key={item.id}
          fileName={item.file_name || "Medical report"}
          reportTypeLabel={getReportTypeLabel(item.report_type)}
          uploadedAtText={new Date(
            item.uploaded_at || item.created_at
          ).toLocaleString()}
          extractionStatus={item.extraction_status || "Pending"}
          isGenerated={isGenerated}
          canOpen={Boolean(item.file_path)}
          onOpen={() => openMedicalReport(item.file_path)}
          onGenerate={() => generateReportIntelligence(item.id)}
        >
          <p>
            <strong>Medical Category:</strong> {item.medical_category}
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
            <strong>Recommendations:</strong> {item.recommendations}
          </p>

          <p>
            <strong>Doctor Brief:</strong> {item.doctor_brief}
          </p>

          {generatedExecutiveSummary && (
            <ExecutiveSummaryCard summary={generatedExecutiveSummary} />
          )}

          {generatedStrategy && (
            <div className="resultBox">
              <p className="sectionLabel">Personal Health Strategy</p>

              <h3>Health Risks</h3>
              <p style={{ whiteSpace: "pre-line" }}>
                {generatedStrategy.healthRisks}
              </p>

              <h3>90-Day Action Plan</h3>
              <p style={{ whiteSpace: "pre-line" }}>
                {generatedStrategy.actionPlan90Days}
              </p>

              <h3>Nutrition Strategy</h3>
              <p style={{ whiteSpace: "pre-line" }}>
                {generatedStrategy.nutritionStrategy}
              </p>

              <h3>Follow-Up Plan</h3>
              <p style={{ whiteSpace: "pre-line" }}>
                {generatedStrategy.followUpPlan}
              </p>
            </div>
          )}

          {generatedHealthStory && (
            <HealthStoryCard story={generatedHealthStory} />
          )}

          {generatedActionPlan && (
            <ActionPlanCard actionPlan={generatedActionPlan} />
          )}

          {generatedUnifiedHealth && (
            <UnifiedHealthCard unifiedHealth={generatedUnifiedHealth} />
          )}

          <TimelineCard timeline={generatedTimeline} />

          <LongitudinalRiskCard longitudinalRisk={generatedLongitudinalRisk} />

          <LabTrendsCard labTrends={generatedLabTrends} />

          <CrossSourceCard crossSource={generatedCrossSource} />

          <DigitalTwinCard digitalTwin={generatedDigitalTwin} />

          <ForecastCard forecast={generatedForecast} />
        </MedicalReportCard>
      );
    })}
  </MedicalReportList>
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
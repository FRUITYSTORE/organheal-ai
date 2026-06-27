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
import HealthPassportCard from "./components/HealthPassportCard";
import TopOpportunitiesCard from "./components/TopOpportunitiesCard";
import DoctorReadySummaryCard from "./components/DoctorReadySummaryCard";
import GeneratedReportDetailsCard from "./components/GeneratedReportDetailsCard";
import PersonalHealthStrategyCard from "./components/PersonalHealthStrategyCard";




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
type GeneratedIntelligenceResult = {
  strategy: any;
  unifiedHealth: any;
  digitalTwin: any;
  crossSource: any;
  timeline: any;
  longitudinalRisk: any;
  forecast: any;
  healthStory: string;
  actionPlan: any;
  executiveSummary: any;
  labTrends: any[];
};

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
    const [generatedResult, setGeneratedResult] =
    useState<GeneratedIntelligenceResult | null>(null);
  const [activeGeneratedInsightId, setActiveGeneratedInsightId] =
    useState<number | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null);

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

setGeneratedResult(null);
setActiveGeneratedInsightId(null);
setExpandedReportId(null);

const generatedInsightIds = mergedInsights.map((item) => item.id);

if (generatedInsightIds.length > 0) {
  const { data: savedGeneratedResult, error: savedGeneratedResultError } =
    await supabase
      .from("generated_intelligence_results")
      .select("insight_id, result, updated_at")
      .eq("user_id", userId)
      .in("insight_id", generatedInsightIds)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (!savedGeneratedResultError && savedGeneratedResult?.result) {
    setGeneratedResult(
      savedGeneratedResult.result as GeneratedIntelligenceResult
    );
    setActiveGeneratedInsightId(savedGeneratedResult.insight_id);
  }
}

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
async function openSavedGeneratedResult(insightId: number) {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    alert("User session expired. Please log in again.");
    return;
  }

  const { data: savedGeneratedResult, error } = await supabase
    .from("generated_intelligence_results")
    .select("result")
    .eq("user_id", userData.user.id)
    .eq("insight_id", insightId)
    .maybeSingle();

  if (error) {
    alert("Could not load saved intelligence result: " + error.message);
    return;
  }

  if (!savedGeneratedResult?.result) {
    const shouldRegenerate = window.confirm(
      "No saved intelligence result was found for this report. Generate it now?"
    );

    if (shouldRegenerate) {
      await generateReportIntelligence(insightId);
    }

    return;
  }

   setGeneratedResult(
    savedGeneratedResult.result as GeneratedIntelligenceResult
  );
  setActiveGeneratedInsightId(insightId);
  setExpandedReportId(insightId);
}
 async function generateReportIntelligence(insightId: number) {
  const selectedInsight = healthInsights.find((item) => item.id === insightId);

if (!selectedInsight) return;

setActiveGeneratedInsightId(null);
setGeneratedResult(null);

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

if (!userData.user) {
  alert("User session expired. Please log in again.");
  return;
}

if (selectedInsight.report_id) {
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

 const generatedResultPayload: GeneratedIntelligenceResult = {
  strategy: healthStrategy,
  unifiedHealth,
  digitalTwin,
  crossSource,
  timeline,
  longitudinalRisk,
  forecast,
  healthStory,
  actionPlan,
  executiveSummary,
  labTrends,
};

setGeneratedResult(generatedResultPayload);
setActiveGeneratedInsightId(insightId);
setExpandedReportId(insightId);

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

const { error: saveGeneratedResultError } = await supabase
  .from("generated_intelligence_results")
  .upsert(
    {
      user_id: userData.user.id,
      insight_id: insightId,
      report_id: selectedInsight.report_id,
      result: generatedResultPayload,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,insight_id",
    }
  );

if (saveGeneratedResultError) {
  alert(
    "Generated intelligence was created, but could not be saved: " +
      saveGeneratedResultError.message
  );
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
  <HealthPassportCard
    healthProfile={healthEngine.healthProfile}
    overallScore={healthEngine.overallScore}
    healthAgeStatus={healthEngine.healthAgeStatus}
    priorityOrgan={healthEngine.priorityOrgan}
    potentialScore={healthEngine.potentialScore}
  />
)}

          {!loading && (
  <MedicalReportList hasReports={healthInsights.length > 0}>
    {healthInsights.map((item) => {
      const isGenerated =
  item.ai_status === "Generated" &&
  item.extraction_status === "Completed";

const isActiveGeneratedReport = activeGeneratedInsightId === item.id;
const isExpandedReport = expandedReportId === item.id;

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
isExpanded={isExpandedReport}
canOpen={Boolean(item.file_path)}
onOpen={() => openMedicalReport(item.file_path)}
onGenerate={() => generateReportIntelligence(item.id)}
onViewGenerated={() => openSavedGeneratedResult(item.id)}
onHideGenerated={() => {
  setExpandedReportId(null);

  if (activeGeneratedInsightId === item.id) {
    setGeneratedResult(null);
    setActiveGeneratedInsightId(null);
  }
}}
        >
          {isExpandedReport && (
  <>
    <GeneratedReportDetailsCard
      medicalCategory={item.medical_category}
      summary={item.summary}
      keyFindings={item.key_findings}
      riskSignals={item.risk_signals}
      recommendations={item.recommendations}
      doctorBrief={item.doctor_brief}
    />

    {isActiveGeneratedReport && generatedResult && (
      <>
        {generatedResult.executiveSummary && (
          <ExecutiveSummaryCard summary={generatedResult.executiveSummary} />
        )}

        {generatedResult.strategy && (
          <PersonalHealthStrategyCard strategy={generatedResult.strategy} />
        )}

        {generatedResult.healthStory && (
          <HealthStoryCard story={generatedResult.healthStory} />
        )}

        {generatedResult.actionPlan && (
          <ActionPlanCard actionPlan={generatedResult.actionPlan} />
        )}

        {generatedResult.unifiedHealth && (
          <UnifiedHealthCard unifiedHealth={generatedResult.unifiedHealth} />
        )}

        <TimelineCard timeline={generatedResult.timeline} />

        <LongitudinalRiskCard
          longitudinalRisk={generatedResult.longitudinalRisk}
        />

        <LabTrendsCard labTrends={generatedResult.labTrends} />

        <CrossSourceCard crossSource={generatedResult.crossSource} />

        <DigitalTwinCard digitalTwin={generatedResult.digitalTwin} />

        <ForecastCard forecast={generatedResult.forecast} />
      </>
    )}
  </>
)}
        </MedicalReportCard>
      );
    })}
  </MedicalReportList>
)}
          {!loading && healthEngine && (
  <TopOpportunitiesCard
    strongestOrgan={healthEngine.strongestOrgan}
    riskPattern={healthEngine.riskPattern}
    potentialGain={healthEngine.potentialGain}
    opportunities={healthEngine.opportunities.slice(0, 3)}
  />
)}
          {!loading && healthEngine && (
  <DoctorReadySummaryCard
    overallScore={healthEngine.overallScore}
    priorityOrgan={healthEngine.priorityOrgan}
    riskPattern={healthEngine.riskPattern}
    opportunityTitle={healthEngine.opportunityTitle}
    bestNextAction={healthEngine.bestNextAction}
  />
)}
        </section>
      </div>
    </main>
  );
}
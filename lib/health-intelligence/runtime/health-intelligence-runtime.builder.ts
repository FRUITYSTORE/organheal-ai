import type { PatientSummary } from "@/lib/models/patient";

import { getPatientSummary } from "@/lib/services/shared/patient-summary.service";

import { buildHealthIntelligence } from "@/lib/health-intelligence/health-intelligence.service";

import {
  buildHealthIntelligenceContext,
  type HealthIntelligenceContextAudience,
  type HealthIntelligenceContextLanguage,
} from "@/lib/health-intelligence/context/health-intelligence-context";

import {
  buildHealthJourney,
  type HealthJourneyEngineInput,
} from "@/lib/health-intelligence/engines/health-journey.engine";

import {
  buildHealthIntelligenceRuntime,
  type HealthIntelligenceRuntime,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime";

export type BuildHealthRuntimeInput = {
  userId: string;
    patient?: PatientSummary;

  language?: HealthIntelligenceContextLanguage;
  audience?: HealthIntelligenceContextAudience;

  hasHealthPlan?: boolean;
  hasDoctorBrief?: boolean;
};

function normalizeDate(
  value: string | null | undefined
): string {
  return value ?? new Date(0).toISOString();
}

function buildContextFromPatient(
  patient: PatientSummary,
  input: BuildHealthRuntimeInput
) {
  const assessments = patient.assessments.map(
    (assessment, index) => ({
      id: [
        "assessment",
        assessment.organ_name,
        assessment.created_at ?? index,
      ].join("-"),

      moduleName: assessment.organ_name,
      score: assessment.score,
      status: assessment.risk_level,
      notes: assessment.notes ?? null,
      createdAt: normalizeDate(
        assessment.created_at
      ),
    })
  );

  const checkIns = patient.recentCheckIns.map(
    (checkIn, index) => ({
      id: [
        "checkin",
        checkIn.created_at,
        index,
      ].join("-"),

      mood: checkIn.mood,

      energyLevel: null,
      stressLevel: null,
      sleepQuality: null,
      hydration: null,
      physicalActivity: null,

      wellnessScore:
        checkIn.wellness_score,

      createdAt:
        checkIn.created_at,
    })
  );

  const reports = patient.uploadedReports.map(
    (report) => ({
      id: String(report.id),
      fileName: report.file_name,
      extractionStatus:
        report.extraction_status,
      createdAt: report.created_at,
    })
  );

  const analyses = patient.healthInsights.map(
    (insight) => ({
      id: String(insight.id),

      reportId:
        insight.report_id !== null
          ? String(insight.report_id)
          : null,

      title:
        insight.insight_title,

      status:
        insight.ai_status,

      createdAt:
        insight.created_at,
    })
  );

  return buildHealthIntelligenceContext({
    userId: input.userId,

    language:
      input.language ?? "en",

    audience:
      input.audience ?? "general",

    assessments,
    checkIns,
    reports,
    analyses,

    hasHealthPlan:
      input.hasHealthPlan ?? false,

    hasDoctorBrief:
      input.hasDoctorBrief ??
      patient.healthInsights.some(
        (insight) =>
          typeof insight.doctor_brief ===
            "string" &&
          insight.doctor_brief.trim().length >
            0
      ),
  });
}

function buildJourneyInput({
  patient,
  input,
  timeline,
  passport,
}: {
  patient: PatientSummary;
  input: BuildHealthRuntimeInput;

  timeline: ReturnType<
    typeof buildHealthIntelligence
  >["timeline"]["data"];

  passport: ReturnType<
    typeof buildHealthIntelligence
  >["healthPassport"]["data"];
}): HealthJourneyEngineInput {
  const hasDoctorBrief =
    input.hasDoctorBrief ??
    patient.healthInsights.some(
      (insight) =>
        typeof insight.doctor_brief ===
          "string" &&
        insight.doctor_brief.trim().length >
          0
    );

  return {
    language:
      input.language ?? "en",

    timelineEvents:
      timeline.events.map((event) => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        title: event.title,
        description: event.description,
        date: event.date,
        organ: event.organ,
        score: event.score,
        href: event.href,
      })),

    passport: {
      overallScore:
        passport.overallScore,

      priorityArea:
        passport.priorityArea,

      priorityScore:
        passport.priorityScore,

      availableSourceCount:
        passport.availableSourceCount,

      totalDataPoints:
        passport.totalDataPoints,

      lastUpdated:
        passport.lastUpdated,
    },

    hasHealthPlan:
      input.hasHealthPlan ?? false,

    hasDoctorBrief,
  };
}

export async function buildHealthRuntime(
  input: BuildHealthRuntimeInput
): Promise<HealthIntelligenceRuntime> {
    const patient =
    input.patient ??
    await getPatientSummary(input.userId);

  const intelligence =
    buildHealthIntelligence(patient);

  const context =
    buildContextFromPatient(
      patient,
      input
    );

  const journey =
    buildHealthJourney(
      buildJourneyInput({
        patient,
        input,
        timeline:
          intelligence.timeline.data,
        passport:
          intelligence.healthPassport.data,
      })
    );

  return buildHealthIntelligenceRuntime({
    context,

    passport:
      intelligence.healthPassport.data,

    timeline:
      intelligence.timeline.data,

    journey,
  });
}
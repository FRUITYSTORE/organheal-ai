import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  supabase,
} from "@/lib/supabase";

import type {
  PatientSummary,
} from "@/lib/models/patient";

import {
  getRecentAssessments,
} from "@/lib/repositories/assessment.repository";

import {
  getRecentCheckIns,
} from "@/lib/repositories/checkin.repository";

import {
  getRecentHealthHistory,
} from "@/lib/repositories/history.repository";

import {
  getRecentGeneratedResults,
  getRecentHealthInsights,
} from "@/lib/repositories/insight.repository";

import {
  getUserProfileSummary,
} from "@/lib/repositories/profile.repository";

import {
  getRecentUploadedReports,
} from "@/lib/repositories/reports.repository";

import {
  getMedicalReportMarkersForPatient,
} from "@/lib/repositories/report-markers.repository";

const PATIENT_SUMMARY_ITEM_LIMIT =
  20;

export async function getPatientSummary(
  userId:
    string,
  client:
    SupabaseClient = supabase
): Promise<PatientSummary> {
  const [
  profile,
  assessments,
  recentCheckIns,
  uploadedReports,
  reportMarkers,
  healthInsights,
  generatedResults,
  historyItems,
] =
    await Promise.all([
      getUserProfileSummary(
        userId,
        client
      ),

      getRecentAssessments(
        userId,
        PATIENT_SUMMARY_ITEM_LIMIT,
        client
      ),

      getRecentCheckIns(
        userId,
        PATIENT_SUMMARY_ITEM_LIMIT,
        client
      ),

      getRecentUploadedReports(
        userId,
        PATIENT_SUMMARY_ITEM_LIMIT,
        client
      ),

      getMedicalReportMarkersForPatient(
      userId,
      client
      ),

      getRecentHealthInsights(
        userId,
        PATIENT_SUMMARY_ITEM_LIMIT,
        client
      ),

      getRecentGeneratedResults(
        userId,
        PATIENT_SUMMARY_ITEM_LIMIT,
        client
      ),

      getRecentHealthHistory(
        userId,
        PATIENT_SUMMARY_ITEM_LIMIT,
        client
      ),
    ]);

  const latestCheckIn =
    recentCheckIns[0] ??
    null;

  return {
    profile,

    assessments,

    latestCheckIn,

    recentCheckIns,

    uploadedReports,

    reportMarkers,

    healthInsights,

    generatedResults,

    historyItems,
  };
}
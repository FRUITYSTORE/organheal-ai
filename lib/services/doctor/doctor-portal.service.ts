import { buildHealthIntelligence } from "@/lib/health-intelligence/health-intelligence.service";
import { getPatientSummary } from "@/lib/services/shared/patient-summary.service";

export async function getDoctorPortalSummary(userId: string) {
  const patientSummary = await getPatientSummary(userId);

  const savedAnalysis = patientSummary.generatedResults.map((item) => ({
    insight_id: item.insight_id,
    updated_at: item.updated_at,
  }));

  const healthIntelligence = buildHealthIntelligence(patientSummary);

  return {
    assessments: patientSummary.assessments,
    latestCheckIn: patientSummary.latestCheckIn,
    uploadedReports: patientSummary.uploadedReports.slice(0, 20),
    healthInsights: patientSummary.healthInsights.slice(0, 20),
    savedAnalysis,
    healthHistory: patientSummary.historyItems.slice(0, 10),
    healthIntelligence,
  };
}
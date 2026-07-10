import { buildHealthIntelligence } from "@/lib/health-intelligence/health-intelligence.service";
import { buildHealthPlanViewModel } from "@/lib/services/health-plan/health-plan-view.service";
import { getPatientSummary } from "@/lib/services/shared/patient-summary.service";

export async function getHealthPlanSummary(userId: string) {
  const patientSummary = await getPatientSummary(userId);

  const priorityAssessment =
    patientSummary.assessments.length > 0
      ? [...patientSummary.assessments].sort((a, b) => a.score - b.score)[0]
      : null;

  const intelligence = buildHealthIntelligence(patientSummary);

  const healthPlanView = buildHealthPlanViewModel(
    intelligence.recommendations
  );

  return {
    priorityAssessment,
    latestCheckIn: patientSummary.latestCheckIn,
    uploadedReports: patientSummary.uploadedReports.slice(0, 10),
    healthInsights: patientSummary.healthInsights.slice(0, 10),
    generatedResults: patientSummary.generatedResults.slice(0, 10),
    historyItems: patientSummary.historyItems.slice(0, 10).map((item) => ({
      ...item,
      id: Number(item.id),
    })),
    healthPlanView,
  };
}
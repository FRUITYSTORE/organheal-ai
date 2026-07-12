import { buildHealthIntelligence } from "@/lib/health-intelligence/health-intelligence.service";
import { getPatientSummary } from "@/lib/services/shared/patient-summary.service";

export async function getIntelligenceSummary(userId: string) {
  const patientSummary = await getPatientSummary(userId);

  const healthIntelligence =
    buildHealthIntelligence(patientSummary);

  return {
    assessments: patientSummary.assessments,
    latestCheckIn: patientSummary.latestCheckIn,
    healthIntelligence,
  };
}
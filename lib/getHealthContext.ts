import { buildHealthIntelligence } from "@/lib/health-intelligence/health-intelligence.service";
import { buildHealthRuntime } from "@/lib/health-intelligence/runtime/health-intelligence-runtime.builder";
import { presentDoctorIntelligence } from "@/lib/health-intelligence/presentation/doctor-intelligence.presenter";
import { getPatientSummary } from "@/lib/services/shared/patient-summary.service";
import { supabase } from "@/lib/supabase";

export async function getHealthContext(_isArabic = false) {
  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const patientSummary = await getPatientSummary(
    userData.user.id
  );

  const intelligence =
    buildHealthIntelligence(patientSummary);

  const runtime = await buildHealthRuntime({
    userId: userData.user.id,
    patient: patientSummary,
    language: _isArabic ? "ar" : "en",
  });

  const unifiedSummary =
    runtime.modules.summary.data;

  const doctorPresentation =
    unifiedSummary
      ? presentDoctorIntelligence(
          unifiedSummary,
          _isArabic ? "ar" : "en"
        )
      : null;

  const overview =
    intelligence.intelligenceOverview.data;

  return {
    overallScore: intelligence.healthScore.data.score,
    strongestOrgan: overview.strongestOrgan,
    priorityOrgan:
      intelligence.priority.data.priorityOrgan,
    labScore: null,
    dailyCheckInScore:
      patientSummary.latestCheckIn?.wellness_score ?? null,

    riskPattern:
      intelligence.doctorBrief.data.riskPattern,

    healthAge: null,
    healthAgeStatus: overview.healthAgeStatus,

    doctorBrief:
      doctorPresentation?.brief ??
      intelligence.doctorBrief.data.brief,

    healthScore: {
      score: intelligence.healthScore.data.score,
      level: intelligence.healthScore.data.level,
      confidence: intelligence.healthScore.confidence,
      dataCompleteness:
        intelligence.healthScore.data.dataCompleteness,
    },

    recommendation:
      intelligence.recommendations.data.primaryAction,

    healthEngine: intelligence,
  };
}
import { ClinicalFinding } from "@/lib/health-intelligence/models/clinical-findings";
import { PatientPriorityResult } from "@/lib/health-intelligence/engines/priority.engine";
import { HealthRiskResult } from "@/lib/health-intelligence/engines/risk.engine";
import { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import { RecommendationData } from "@/lib/health-intelligence/engines/recommendation.engine";
import { HealthScoreData } from "@/lib/health-intelligence/engines/health-score.engine";
import { DoctorBriefData } from "@/lib/health-intelligence/engines/doctor-brief.engine";
import { IntelligenceOverviewData } from "@/lib/health-intelligence/engines/intelligence-overview.engine";
import { HealthTrendData } from "@/lib/health-intelligence/engines/trend.engine";
import { TrendSummaryData } from "@/lib/health-intelligence/engines/trend-summary.engine";

export type HealthIntelligenceResult = {
  findings: ClinicalFinding[];
  priority: PatientPriorityResult;
  risk: HealthRiskResult;
  recommendations: EngineResult<RecommendationData>;
  healthScore: EngineResult<HealthScoreData>;
  trend: EngineResult<HealthTrendData>;
  trendSummary: EngineResult<TrendSummaryData>;
  doctorBrief: EngineResult<DoctorBriefData>;
  intelligenceOverview: EngineResult<IntelligenceOverviewData>;
};
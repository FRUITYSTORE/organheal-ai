import { AssessmentSummary } from "@/lib/models/assessment";
import { UserProfileSummary } from "@/lib/repositories/profile.repository";
import { DailyCheckInSummary } from "@/lib/repositories/checkin.repository";
import { UploadedReportSummary } from "@/lib/repositories/reports.repository";
import {
  GeneratedResultSummary,
  HealthInsightSummary,
} from "@/lib/repositories/insight.repository";
import { HealthHistorySummary } from "@/lib/repositories/history.repository";

export type PatientSummary = {
  profile: UserProfileSummary | null;
  assessments: AssessmentSummary[];
  latestCheckIn: DailyCheckInSummary | null;
  recentCheckIns: DailyCheckInSummary[];
  uploadedReports: UploadedReportSummary[];
  healthInsights: HealthInsightSummary[];
  generatedResults: GeneratedResultSummary[];
  historyItems: HealthHistorySummary[];
};
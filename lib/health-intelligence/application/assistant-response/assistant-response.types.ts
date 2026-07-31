export type AssistantResponseHealthContext = {
  overallScore?: number | null;
  strongestOrgan?: string | null;
  priorityOrgan?: string | null;
  labScore?: number | null;
  dailyCheckInScore?: number | null;
  dailyMood?: string | null;

  riskPattern?: string | null;
  healthAge?: number | null;
  healthAgeStatus?: string | null;
  doctorBrief?: string | null;
  recommendation?: string | null;

  healthEngine?: unknown;

  latestReportContext?: {
    reportId: number;
    fileName: string;
    reportType: string;
    uploadedAt: string | null;
    summary: string | null;
    keyFindings: string | null;
    recommendations: string | null;
    doctorBrief: string | null;
    nextBestAction: string | null;
    riskLevel: string | null;
  } | null;

  [key: string]: unknown;
};

export type AssistantResponseConversationMessage = {
  role: "user" | "assistant";
  content: string;
};
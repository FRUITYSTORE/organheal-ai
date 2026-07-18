import { generateIntelligenceFromText } from "@/lib/extractedTextIntelligence";

type BuildHealthInsightUpdateInput = {
  extractedText: string;
  reportType: string | null;
  markerSummary: any;
  radiologySummary: any;
  isRadiologyReport: boolean;
  clinicalPatterns: any[];
  unifiedHealth: any;
};

export function buildHealthInsightUpdate({
  extractedText,
  reportType,
  markerSummary,
  radiologySummary,
  isRadiologyReport,
  clinicalPatterns,
  unifiedHealth,
}: BuildHealthInsightUpdateInput) {
  return {
    ...generateIntelligenceFromText(extractedText, reportType),
    ai_status: "Generated",
    summary: isRadiologyReport
      ? radiologySummary.summary
      : markerSummary.summary,
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

Unified Health Analysis:
${unifiedHealth.healthForecast}

Priority Goal:
${unifiedHealth.priorityGoal}

Next Best Action:
${unifiedHealth.nextBestAction}

Clinical note: This is an educational interpretation and should be reviewed by a licensed healthcare professional.`,
  };
}
import { addHealthHistoryItem } from "@/lib/repositories/history.repository";
import { saveOrganAssessment } from "@/lib/repositories/assessment.repository";

type SaveOrganAssessmentInput = {
  userId: string;
  organName: string;
  score: number;
  riskLevel: string;
  notes?: string | null;
};

export async function saveOrganAssessmentResult({
  userId,
  organName,
  score,
  riskLevel,
  notes,
}: SaveOrganAssessmentInput): Promise<void> {
  await saveOrganAssessment({
    userId,
    organName,
    score,
    riskLevel,
    notes,
  });

  await addHealthHistoryItem({
    userId,
    moduleName: organName,
    score,
    status: riskLevel,
    notes,
  });
}
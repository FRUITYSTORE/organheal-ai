export type AssessmentSummary = {
  organ_name: string;
  score: number;
  risk_level: string | null;
  notes?: string | null;
  created_at?: string;
};
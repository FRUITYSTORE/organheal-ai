import { saveOrganAssessmentResult } from "@/lib/services/organs/organ-assessment.service";
import { supabase } from "@/lib/supabase";

export type SaveAssessmentFlowResult =
  | {
      status: "saved";
    }
  | {
      status: "not-authenticated";
    }
  | {
      status: "error";
      message: string;
    };

type SaveAssessmentFlowInput = {
  organName: string;
  score: number;
  riskLevel: string;
  notes?: string | null;
};

export async function saveAssessmentFlow({
  organName,
  score,
  riskLevel,
  notes,
}: SaveAssessmentFlowInput): Promise<SaveAssessmentFlowResult> {
  const { data, error: userError } =
    await supabase.auth.getUser();

  if (userError) {
    return {
      status: "error",
      message: userError.message,
    };
  }

  if (!data.user) {
    return {
      status: "not-authenticated",
    };
  }

  try {
    await saveOrganAssessmentResult({
      userId: data.user.id,
      organName,
      score,
      riskLevel,
      notes,
    });

    return {
      status: "saved",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not save assessment.",
    };
  }
}
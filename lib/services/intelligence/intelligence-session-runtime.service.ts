import { supabase } from "@/lib/supabase";

export type IntelligenceSessionResult =
  | {
      success: true;
      userId: string;
    }
  | {
      success: false;
      errorMessage: string;
    };

export async function getIntelligenceSession(): Promise<IntelligenceSessionResult> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return {
        success: false,
        errorMessage: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        errorMessage: "User session expired. Please log in again.",
      };
    }

    return {
      success: true,
      userId: data.user.id,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage:
        error instanceof Error ? error.message : String(error),
    };
  }
}
import {
  supabase,
} from "@/lib/supabase";

export type IntelligenceSessionResult =
  | {
      success:
        true;

      userId:
        string;

      accessToken:
        string;
    }
  | {
      success:
        false;

      errorMessage:
        string;
    };

export async function getIntelligenceSession():
  Promise<IntelligenceSessionResult> {
  try {
    const {
      data:
        sessionData,
      error:
        sessionError,
    } =
      await supabase.auth
        .getSession();

    if (sessionError) {
      return {
        success:
          false,

        errorMessage:
          sessionError.message,
      };
    }

    const session =
      sessionData.session;

    if (
      !session ||
      !session.user ||
      !session.access_token
    ) {
      return {
        success:
          false,

        errorMessage:
          "User session expired. Please log in again.",
      };
    }

    /*
     * Validate the current authenticated user rather
     * than trusting session storage alone.
     */
    const {
      data:
        userData,
      error:
        userError,
    } =
      await supabase.auth
        .getUser(
          session.access_token
        );

    if (
      userError ||
      !userData.user
    ) {
      return {
        success:
          false,

        errorMessage:
          userError?.message ??
          "User session expired. Please log in again.",
      };
    }

    return {
      success:
        true,

      userId:
        userData.user.id,

      accessToken:
        session.access_token,
    };
  } catch (error) {
    return {
      success:
        false,

      errorMessage:
        error instanceof Error
          ? error.message
          : String(
              error
            ),
    };
  }
}

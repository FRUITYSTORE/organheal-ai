import {
  supabase,
} from "@/lib/supabase";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

const PROFILE_SUMMARY_SELECT =
  "username,email";

export type UserProfileSummary = {
  username:
    string | null;

  email:
    string | null;
};

export async function getUserProfileSummary(
  userId:
    string,
  client:
    SupabaseClient = supabase
): Promise<
  UserProfileSummary | null
> {
  const {
    data,
    error,
  } =
    await client
      .from(
        "profiles"
      )
      .select(
        PROFILE_SUMMARY_SELECT
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data as
      UserProfileSummary |
      null
  );
}
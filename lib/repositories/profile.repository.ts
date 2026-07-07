import { supabase } from "@/lib/supabase";

export type UserProfileSummary = {
  username: string | null;
};

export async function getUserProfileSummary(
  userId: string
): Promise<UserProfileSummary | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserProfileSummary | null;
}
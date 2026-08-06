import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let cachedAdminClient:
  SupabaseClient | null =
    null;

export function getSupabaseAdminClient():
  SupabaseClient {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL environment variable."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  cachedAdminClient =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession:
            false,

          autoRefreshToken:
            false,

          detectSessionInUrl:
            false,
        },
      }
    );

  return cachedAdminClient;
}

export function resetSupabaseAdminClient():
  void {
  cachedAdminClient =
    null;
}
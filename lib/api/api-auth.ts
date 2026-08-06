import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

export type AuthenticatedApiSession = {
  success: true;

  token: string;

  user: User;

  client: SupabaseClient;
};

export type ApiAuthenticationFailure = {
  success: false;

  status: 401 | 500;

  error: string;
};

export type ApiAuthenticationResult =
  | AuthenticatedApiSession
  | ApiAuthenticationFailure;

function extractBearerToken(
  request: Request
): string {
  const authorizationHeader =
    request.headers.get(
      "authorization"
    ) ?? "";

  if (
    !authorizationHeader.startsWith(
      "Bearer "
    )
  ) {
    return "";
  }

  return authorizationHeader
    .slice(
      "Bearer ".length
    )
    .trim();
}

export async function authenticateApiRequest(
  request: Request
): Promise<ApiAuthenticationResult> {
  const token =
    extractBearerToken(
      request
    );

  if (!token) {
    return {
      success: false,

      status: 401,

      error:
        "Authentication is required.",
    };
  }

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey
  ) {
    return {
      success: false,

      status: 500,

      error:
        "Supabase environment variables are missing.",
    };
  }

  const client =
    createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },

        auth: {
          persistSession:
            false,

          autoRefreshToken:
            false,
        },
      }
    );

  const {
    data:
      authData,
    error:
      authError,
  } =
    await client.auth
      .getUser(
        token
      );

  if (
    authError ||
    !authData.user
  ) {
    return {
      success: false,

      status: 401,

      error:
        "Your session is invalid or has expired.",
    };
  }

  return {
    success: true,

    token,

    user:
      authData.user,

    client,
  };
}
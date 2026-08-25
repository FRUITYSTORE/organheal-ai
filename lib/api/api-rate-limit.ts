import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export type ApiRateLimitPolicy = {
  limit:
    number;

  windowMs:
    number;
};

export type ApiRateLimitResult = {
  allowed:
    boolean;

  limit:
    number;

  remaining:
    number;

  resetAt:
    number;

  retryAfterSeconds:
    number;
};

type ConsumeApiRateLimitRpcRow = {
  allowed:
    boolean;

  request_count:
    number;

  remaining:
    number;

  reset_at:
    string;

  retry_after_seconds:
    number;
};

export type ConsumePersistentApiRateLimitInput = {
  client:
    SupabaseClient;

  key:
    string;

  policy:
    ApiRateLimitPolicy;
};

function validatePolicy(
  policy:
    ApiRateLimitPolicy
) {
  if (
    policy.limit <=
      0 ||
    policy.windowMs <=
      0
  ) {
    throw new Error(
      "Rate limit policy must use positive limit and window values."
    );
  }
}

function toWindowSeconds(
  windowMs:
    number
): number {
  return Math.max(
    1,
    Math.ceil(
      windowMs /
        1000
    )
  );
}

export async function consumePersistentApiRateLimit({
  client,
  key,
  policy,
}: ConsumePersistentApiRateLimitInput): Promise<ApiRateLimitResult> {
  validatePolicy(
    policy
  );

  if (
    !key.trim()
  ) {
    throw new Error(
      "Rate limit key is required."
    );
  }

  const {
    data,
    error,
  } =
    await client.rpc(
      "consume_api_rate_limit",
      {
        p_key:
          key,

        p_limit:
          policy.limit,

        p_window_seconds:
          toWindowSeconds(
            policy.windowMs
          ),
      }
    );

  if (error) {
    throw new Error(
      error.message ||
        "Could not consume API rate limit."
    );
  }

  const row =
    (
      Array.isArray(
        data
      )
        ? data[0]
        : data
    ) as
      | ConsumeApiRateLimitRpcRow
      | null
      | undefined;

  if (!row) {
    throw new Error(
      "Rate limit RPC returned no result."
    );
  }

  const resetAt =
    new Date(
      row.reset_at
    ).getTime();

  if (
    !Number.isFinite(
      resetAt
    )
  ) {
    throw new Error(
      "Rate limit RPC returned an invalid reset time."
    );
  }

  return {
  allowed:
    row.allowed,

  limit:
    policy.limit,

  remaining:
    row.remaining,

  resetAt,

  retryAfterSeconds:
    row.retry_after_seconds,
};
}
export type ApiRateLimitIdentity =
  | {
      type:
        "user";

      value:
        string;
    }
  | {
      type:
        "ip";

      value:
        string;
    }
  | {
      type:
        "anonymous";

      value:
        "unknown";
    };

function getForwardedIp(
  request:
    Request
): string | null {
  const forwardedFor =
    request.headers.get(
      "x-forwarded-for"
    );

  if (!forwardedFor) {
    return null;
  }

  const firstIp =
    forwardedFor
      .split(",")[0]
      ?.trim();

  return firstIp
    ? firstIp
    : null;
}

export function resolveApiRateLimitIdentity({
  request,
  userId,
}: {
  request:
    Request;

  userId?:
    string | null;
}): ApiRateLimitIdentity {
  if (
    userId?.trim()
  ) {
    return {
      type:
        "user",

      value:
        userId.trim(),
    };
  }

  const forwardedIp =
    getForwardedIp(
      request
    );

  if (forwardedIp) {
    return {
      type:
        "ip",

      value:
        forwardedIp,
    };
  }

  return {
    type:
      "anonymous",

    value:
      "unknown",
  };
}
import {
  randomUUID,
} from "node:crypto";

import {
  performance,
} from "node:perf_hooks";

import {
  captureApiException,
} from "@/lib/api/api-error-tracker";

export type ApiLogLevel =
  | "info"
  | "warn"
  | "error";

export type ApiLogDetails = Record<
  string,
  unknown
>;

export type ApiPerformanceTimer = {
  elapsedMs():
    number;
};

export type ApiPerformanceClassification =
  | "normal"
  | "slow"
  | "very_slow"
  | "critical";

export type ApiPerformanceThresholds = {
  slowMs:
    number;

  verySlowMs:
    number;

  criticalMs:
    number;
};

export const DEFAULT_API_PERFORMANCE_THRESHOLDS:
  ApiPerformanceThresholds = {
    slowMs:
      250,

    verySlowMs:
      750,

    criticalMs:
      2000,
  };

const REDACTED_VALUE =
  "[REDACTED]";

const SENSITIVE_KEY_PARTS = [
  "token",
  "authorization",
  "password",
  "secret",
  "apikey",
  "api_key",
  "cookie",
  "userid",
  "user_id",
  "email",
  "filepath",
  "file_path",
  "storagepath",
  "storage_path",
  "medicaltext",
  "medical_text",
  "extractedtext",
  "extracted_text",
  "healthcontext",
  "health_context",
  "doctorbrief",
  "doctor_brief",
  "keyfindings",
  "key_findings",
] as const;

function isSensitiveKey(
  key: string
): boolean {
  const normalizedKey =
    key
      .replace(
        /[^a-zA-Z0-9_]/g,
        ""
      )
      .toLowerCase();

  return SENSITIVE_KEY_PARTS.some(
    (sensitivePart) =>
      normalizedKey.includes(
        sensitivePart
      )
  );
}

function sanitizeValue(
  value: unknown,
  seen: WeakSet<object>
): unknown {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    value instanceof Error
  ) {
    return {
      name:
        value.name,

      message:
        value.message,
    };
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (
    typeof value === "bigint"
  ) {
    return value.toString();
  }

  if (
    typeof value === "function"
  ) {
    return "[FUNCTION]";
  }

  if (
    typeof value !== "object"
  ) {
    return String(
      value
    );
  }

  if (
    seen.has(
      value
    )
  ) {
    return "[CIRCULAR]";
  }

  seen.add(
    value
  );

  if (
    Array.isArray(
      value
    )
  ) {
    return value.map(
      (item) =>
        sanitizeValue(
          item,
          seen
        )
    );
  }

  const sanitizedObject:
    ApiLogDetails = {};

  for (
    const [
      key,
      nestedValue,
    ] of Object.entries(
      value
    )
  ) {
    if (
      isSensitiveKey(
        key
      )
    ) {
      sanitizedObject[key] =
        REDACTED_VALUE;

      continue;
    }

    sanitizedObject[key] =
      sanitizeValue(
        nestedValue,
        seen
      );
  }

  return sanitizedObject;
}

function sanitizeDetails(
  details: ApiLogDetails
): ApiLogDetails {
  return sanitizeValue(
    details,
    new WeakSet<object>()
  ) as ApiLogDetails;
}

function writeApiLog(
  level: ApiLogLevel,
  event: string,
  details: ApiLogDetails = {}
): void {
  const payload = {
    timestamp:
      new Date().toISOString(),

    level,

    event,

    ...sanitizeDetails(
      details
    ),
  };

  const serialized =
    JSON.stringify(
      payload
    );

  if (
    level === "error"
  ) {
    console.error(
      serialized
    );

    return;
  }

  if (
    level === "warn"
  ) {
    console.warn(
      serialized
    );

    return;
  }

  console.info(
    serialized
  );
}

export function createApiRequestId(): string {
  return `req_${randomUUID()}`;
}

export function classifyApiDuration(
  durationMs:
    number,
  thresholds:
    ApiPerformanceThresholds =
      DEFAULT_API_PERFORMANCE_THRESHOLDS
): ApiPerformanceClassification {
  const normalizedDuration =
    Number.isFinite(
      durationMs
    )
      ? Math.max(
          0,
          durationMs
        )
      : 0;

  const normalizedSlowMs =
    Math.max(
      0,
      thresholds.slowMs
    );

  const normalizedVerySlowMs =
    Math.max(
      normalizedSlowMs,
      thresholds.verySlowMs
    );

  const normalizedCriticalMs =
    Math.max(
      normalizedVerySlowMs,
      thresholds.criticalMs
    );

  if (
    normalizedDuration >=
    normalizedCriticalMs
  ) {
    return "critical";
  }

  if (
    normalizedDuration >=
    normalizedVerySlowMs
  ) {
    return "very_slow";
  }

  if (
    normalizedDuration >=
    normalizedSlowMs
  ) {
    return "slow";
  }

  return "normal";
}

export function startApiTimer():
  ApiPerformanceTimer {
  const startedAt =
    performance.now();

  return {
    elapsedMs() {
      const durationMs =
        performance.now() -
        startedAt;

      return Math.max(
        0,
        Math.round(
          durationMs * 100
        ) / 100
      );
    },
  };
}

export function logApiInfo(
  event: string,
  details: ApiLogDetails = {}
): void {
  writeApiLog(
    "info",
    event,
    details
  );
}

export function logApiWarning(
  event: string,
  details: ApiLogDetails = {}
): void {
  writeApiLog(
    "warn",
    event,
    details
  );
}

export function logApiError(
  event: string,
  error: unknown,
  details: ApiLogDetails = {}
): void {
  const sanitizedDetails =
    sanitizeDetails(
      details
    );

  writeApiLog(
    "error",
    event,
    {
      ...sanitizedDetails,

      error:
        error instanceof Error
          ? error
          : String(
              error
            ),
    }
  );

  captureApiException(
    error,
    {
      event,

      route:
        typeof details.route ===
          "string"
          ? details.route
          : undefined,

      requestId:
        typeof details.requestId ===
          "string"
          ? details.requestId
          : undefined,

      details:
        sanitizedDetails,
    }
  );
}
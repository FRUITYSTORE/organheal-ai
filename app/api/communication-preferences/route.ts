import {
  NextResponse,
} from "next/server";

import {
  authenticateApiRequest,
} from "@/lib/api/api-auth";

import {
  createApiRequestId,
  logApiError,
  logApiInfo,
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  getOrCreateCommunicationPreferences,
  updateCommunicationPreferences,
  type CommunicationLanguage,
  type UpdateCommunicationPreferencesInput,
} from "@/lib/repositories/communication-preferences.repository";

type UpdateRequestBody = {
  preferredLanguage?:
    unknown;

  timezone?:
    unknown;

  dashboardEnabled?:
    unknown;

  emailEnabled?:
    unknown;

  whatsappEnabled?:
    unknown;

  pushEnabled?:
    unknown;

  whatsappPhoneE164?:
    unknown;

  emailConsent?:
    unknown;

  whatsappConsent?:
    unknown;

  pushConsent?:
    unknown;
};

function isRecord(
  value:
    unknown
): value is
  Record<
    string,
    unknown
  > {
  return Boolean(
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  );
}

function normalizeLanguage(
  value:
    unknown
):
  CommunicationLanguage |
  undefined {
  if (
    value ===
      undefined
  ) {
    return undefined;
  }

  if (
    value ===
      "en" ||
    value ===
      "ar"
  ) {
    return value;
  }

  throw new Error(
    "Preferred language must be 'en' or 'ar'."
  );
}

function normalizeTimezone(
  value:
    unknown
):
  string |
  undefined {
  if (
    value ===
      undefined
  ) {
    return undefined;
  }

  if (
    typeof value !==
      "string"
  ) {
    throw new Error(
      "Timezone must be a string."
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "Timezone cannot be empty."
    );
  }

  if (
    normalized.length >
      100
  ) {
    throw new Error(
      "Timezone is too long."
    );
  }

  return normalized;
}

function normalizeBoolean(
  value:
    unknown,
  fieldName:
    string
):
  boolean |
  undefined {
  if (
    value ===
      undefined
  ) {
    return undefined;
  }

  if (
    typeof value !==
      "boolean"
  ) {
    throw new Error(
      `${fieldName} must be a boolean.`
    );
  }

  return value;
}

function normalizeConsent(
  value:
    unknown,
  fieldName:
    string
):
  boolean |
  undefined {
  return normalizeBoolean(
    value,
    fieldName
  );
}

function normalizeWhatsAppPhone(
  value:
    unknown
):
  string |
  null |
  undefined {
  if (
    value ===
      undefined
  ) {
    return undefined;
  }

  if (
    value ===
      null
  ) {
    return null;
  }

  if (
    typeof value !==
      "string"
  ) {
    throw new Error(
      "WhatsApp phone number must be a string or null."
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  if (
    !/^\+[1-9][0-9]{7,14}$/.test(
      normalized
    )
  ) {
    throw new Error(
      "WhatsApp phone number must use E.164 format."
    );
  }

  return normalized;
}

function createConsentUpdate({
  granted,
  now,
}: {
  granted:
    boolean;

  now:
    string;
}) {
  if (granted) {
    return {
      grantedAt:
        now,

      revokedAt:
        null,
    };
  }

  return {
    grantedAt:
      null,

    revokedAt:
      now,
  };
}

export async function GET(
  request:
    Request
) {
  const requestId =
    createApiRequestId();

  const timer =
    startApiTimer();

  try {
    const authentication =
      await authenticateApiRequest(
        request
      );

    if (
      !authentication.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            authentication.error,

          requestId,
        },
        {
          status:
            authentication.status,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const preferences =
      await getOrCreateCommunicationPreferences(
        {
          userId:
            authentication
              .user
              .id,
        },
        authentication.client
      );

    logApiInfo(
      "communication_preferences.loaded",
      {
        route:
          "/api/communication-preferences",

        requestId,

        userId:
          authentication
            .user
            .id,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return NextResponse.json(
      {
        success:
          true,

        preferences,

        requestId,
      },
      {
        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  } catch (
    error
  ) {
    logApiError(
      "communication_preferences.load_failed",
      error,
      {
        route:
          "/api/communication-preferences",

        requestId,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Could not load communication preferences.",

        requestId,
      },
      {
        status:
          500,

        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  }
}

export async function PUT(
  request:
    Request
) {
  const requestId =
    createApiRequestId();

  const timer =
    startApiTimer();

  try {
    const authentication =
      await authenticateApiRequest(
        request
      );

    if (
      !authentication.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            authentication.error,

          requestId,
        },
        {
          status:
            authentication.status,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    let rawBody:
      unknown;

    try {
      rawBody =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "A valid JSON request body is required.",

          requestId,
        },
        {
          status:
            400,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    if (
      !isRecord(
        rawBody
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "A valid communication preferences payload is required.",

          requestId,
        },
        {
          status:
            400,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const body =
      rawBody as
        UpdateRequestBody;

    let preferredLanguage:
      CommunicationLanguage |
      undefined;

    let timezone:
      string |
      undefined;

    let dashboardEnabled:
      boolean |
      undefined;

    let emailEnabled:
      boolean |
      undefined;

    let whatsappEnabled:
      boolean |
      undefined;

    let pushEnabled:
      boolean |
      undefined;

    let whatsappPhoneE164:
      string |
      null |
      undefined;

    let emailConsent:
      boolean |
      undefined;

    let whatsappConsent:
      boolean |
      undefined;

    let pushConsent:
      boolean |
      undefined;

    try {
      preferredLanguage =
        normalizeLanguage(
          body.preferredLanguage
        );

      timezone =
        normalizeTimezone(
          body.timezone
        );

      dashboardEnabled =
        normalizeBoolean(
          body.dashboardEnabled,
          "dashboardEnabled"
        );

      emailEnabled =
        normalizeBoolean(
          body.emailEnabled,
          "emailEnabled"
        );

      whatsappEnabled =
        normalizeBoolean(
          body.whatsappEnabled,
          "whatsappEnabled"
        );

      pushEnabled =
        normalizeBoolean(
          body.pushEnabled,
          "pushEnabled"
        );

      whatsappPhoneE164 =
        normalizeWhatsAppPhone(
          body.whatsappPhoneE164
        );

      emailConsent =
        normalizeConsent(
          body.emailConsent,
          "emailConsent"
        );

      whatsappConsent =
        normalizeConsent(
          body.whatsappConsent,
          "whatsappConsent"
        );

      pushConsent =
        normalizeConsent(
          body.pushConsent,
          "pushConsent"
        );
    } catch (
      validationError
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            validationError instanceof
              Error
              ? validationError.message
              : "Invalid communication preferences.",

          requestId,
        },
        {
          status:
            400,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const existing =
      await getOrCreateCommunicationPreferences(
        {
          userId:
            authentication
              .user
              .id,

          preferredLanguage:
            preferredLanguage ??
            "en",

          timezone:
            timezone ??
            "UTC",
        },
        authentication.client
      );

    const now =
      new Date()
        .toISOString();

    const update:
      UpdateCommunicationPreferencesInput = {
        preferredLanguage,

        timezone,

        dashboardEnabled,

        emailEnabled,

        whatsappEnabled,

        pushEnabled,

        whatsappPhoneE164,

        consentSource:
          "communication-settings",

        consentVersion:
          "v1",
      };

    if (
      emailConsent !==
        undefined
    ) {
      const consent =
        createConsentUpdate({
          granted:
            emailConsent,

          now,
        });

      update.emailConsentGrantedAt =
        consent.grantedAt;

      update.emailConsentRevokedAt =
        consent.revokedAt;
    }

    if (
      whatsappConsent !==
        undefined
    ) {
      const consent =
        createConsentUpdate({
          granted:
            whatsappConsent,

          now,
        });

      update.whatsappConsentGrantedAt =
        consent.grantedAt;

      update.whatsappConsentRevokedAt =
        consent.revokedAt;
    }

    if (
      pushConsent !==
        undefined
    ) {
      const consent =
        createConsentUpdate({
          granted:
            pushConsent,

          now,
        });

      update.pushConsentGrantedAt =
        consent.grantedAt;

      update.pushConsentRevokedAt =
        consent.revokedAt;
    }

    /*
     * The user-facing API may store or change the
     * WhatsApp destination, but it must never mark
     * that destination as verified.
     *
     * Verification is a separate server-controlled
     * workflow.
     */
    if (
      whatsappPhoneE164 !==
        undefined &&
      whatsappPhoneE164 !==
        existing
          .whatsapp_phone_e164
    ) {
      update.whatsappPhoneVerifiedAt =
        null;
    }

    /*
     * Enabling WhatsApp is allowed as a preference,
     * but actual delivery remains blocked by the
     * delivery layer unless the number is verified
     * and active consent exists.
     */
    const preferences =
      await updateCommunicationPreferences(
        authentication
          .user
          .id,
        update,
        authentication.client
      );

    logApiInfo(
      "communication_preferences.updated",
      {
        route:
          "/api/communication-preferences",

        requestId,

        userId:
          authentication
            .user
            .id,

        dashboardEnabled:
          preferences
            .dashboard_enabled,

        emailEnabled:
          preferences
            .email_enabled,

        whatsappEnabled:
          preferences
            .whatsapp_enabled,

        pushEnabled:
          preferences
            .push_enabled,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return NextResponse.json(
      {
        success:
          true,

        preferences,

        requestId,
      },
      {
        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  } catch (
    error
  ) {
    logApiError(
      "communication_preferences.update_failed",
      error,
      {
        route:
          "/api/communication-preferences",

        requestId,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Could not update communication preferences.",

        requestId,
      },
      {
        status:
          500,

        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  }
}
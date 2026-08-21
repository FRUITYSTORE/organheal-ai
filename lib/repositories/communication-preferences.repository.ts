import {
  supabase,
} from "@/lib/supabase";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

const COMMUNICATION_PREFERENCES_SELECT =
  [
    "user_id",
    "preferred_language",
    "timezone",
    "dashboard_enabled",
    "email_enabled",
    "whatsapp_enabled",
    "push_enabled",
    "whatsapp_phone_e164",
    "whatsapp_phone_verified_at",
    "email_consent_granted_at",
    "email_consent_revoked_at",
    "whatsapp_consent_granted_at",
    "whatsapp_consent_revoked_at",
    "push_consent_granted_at",
    "push_consent_revoked_at",
    "consent_source",
    "consent_version",
    "created_at",
    "updated_at",
  ].join(",");

export type CommunicationLanguage =
  | "en"
  | "ar";

export type CommunicationPreferences = {
  user_id:
    string;

  preferred_language:
    CommunicationLanguage;

  timezone:
    string;

  dashboard_enabled:
    boolean;

  email_enabled:
    boolean;

  whatsapp_enabled:
    boolean;

  push_enabled:
    boolean;

  whatsapp_phone_e164:
    string | null;

  whatsapp_phone_verified_at:
    string | null;

  email_consent_granted_at:
    string | null;

  email_consent_revoked_at:
    string | null;

  whatsapp_consent_granted_at:
    string | null;

  whatsapp_consent_revoked_at:
    string | null;

  push_consent_granted_at:
    string | null;

  push_consent_revoked_at:
    string | null;

  consent_source:
    string | null;

  consent_version:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

export type CreateCommunicationPreferencesInput = {
  userId:
    string;

  preferredLanguage?:
    CommunicationLanguage;

  timezone?:
    string;
};

export type UpdateCommunicationPreferencesInput = {
  preferredLanguage?:
    CommunicationLanguage;

  timezone?:
    string;

  dashboardEnabled?:
    boolean;

  emailEnabled?:
    boolean;

  whatsappEnabled?:
    boolean;

  pushEnabled?:
    boolean;

  whatsappPhoneE164?:
    string | null;

  whatsappPhoneVerifiedAt?:
    string | null;

  emailConsentGrantedAt?:
    string | null;

  emailConsentRevokedAt?:
    string | null;

  whatsappConsentGrantedAt?:
    string | null;

  whatsappConsentRevokedAt?:
    string | null;

  pushConsentGrantedAt?:
    string | null;

  pushConsentRevokedAt?:
    string | null;

  consentSource?:
    string | null;

  consentVersion?:
    string | null;
};

function normalizeUserId(
  userId:
    string
): string {
  const normalized =
    userId.trim();

  if (!normalized) {
    throw new Error(
      "A valid user ID is required."
    );
  }

  return normalized;
}

export async function getCommunicationPreferences(
  userId:
    string,
  client:
    SupabaseClient = supabase
): Promise<
  CommunicationPreferences | null
> {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  const {
    data,
    error,
  } =
    await client
      .from(
        "communication_preferences"
      )
      .select(
        COMMUNICATION_PREFERENCES_SELECT
      )
      .eq(
        "user_id",
        normalizedUserId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data as
      CommunicationPreferences |
      null
  );
}

export async function createDefaultCommunicationPreferences(
  {
    userId,
    preferredLanguage =
      "en",
    timezone =
      "UTC",
  }:
    CreateCommunicationPreferencesInput,
  client:
    SupabaseClient = supabase
): Promise<
  CommunicationPreferences
> {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  const {
    data,
    error,
  } =
    await client
      .from(
        "communication_preferences"
      )
      .upsert(
        {
          user_id:
            normalizedUserId,

          preferred_language:
            preferredLanguage,

          timezone,

          dashboard_enabled:
            true,
        },
        {
          onConflict:
            "user_id",

          ignoreDuplicates:
            true,
        }
      )
      .select(
        COMMUNICATION_PREFERENCES_SELECT
      )
      .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
  data as unknown as
    CommunicationPreferences
);
}

export async function getOrCreateCommunicationPreferences(
  input:
    CreateCommunicationPreferencesInput,
  client:
    SupabaseClient = supabase
): Promise<
  CommunicationPreferences
> {
  const existing =
    await getCommunicationPreferences(
      input.userId,
      client
    );

  if (existing) {
    return existing;
  }

  return createDefaultCommunicationPreferences(
    input,
    client
  );
}

export async function updateCommunicationPreferences(
  userId:
    string,
  input:
    UpdateCommunicationPreferencesInput,
  client:
    SupabaseClient = supabase
): Promise<
  CommunicationPreferences
> {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  const updates:
    Record<
      string,
      unknown
    > = {};

  if (
    input.preferredLanguage !==
      undefined
  ) {
    updates.preferred_language =
      input.preferredLanguage;
  }

  if (
    input.timezone !==
      undefined
  ) {
    updates.timezone =
      input.timezone;
  }

  if (
    input.dashboardEnabled !==
      undefined
  ) {
    updates.dashboard_enabled =
      input.dashboardEnabled;
  }

  if (
    input.emailEnabled !==
      undefined
  ) {
    updates.email_enabled =
      input.emailEnabled;
  }

  if (
    input.whatsappEnabled !==
      undefined
  ) {
    updates.whatsapp_enabled =
      input.whatsappEnabled;
  }

  if (
    input.pushEnabled !==
      undefined
  ) {
    updates.push_enabled =
      input.pushEnabled;
  }

  if (
    input.whatsappPhoneE164 !==
      undefined
  ) {
    updates.whatsapp_phone_e164 =
      input.whatsappPhoneE164;
  }

  if (
    input.whatsappPhoneVerifiedAt !==
      undefined
  ) {
    updates.whatsapp_phone_verified_at =
      input.whatsappPhoneVerifiedAt;
  }

  if (
    input.emailConsentGrantedAt !==
      undefined
  ) {
    updates.email_consent_granted_at =
      input.emailConsentGrantedAt;
  }

  if (
    input.emailConsentRevokedAt !==
      undefined
  ) {
    updates.email_consent_revoked_at =
      input.emailConsentRevokedAt;
  }

  if (
    input.whatsappConsentGrantedAt !==
      undefined
  ) {
    updates.whatsapp_consent_granted_at =
      input.whatsappConsentGrantedAt;
  }

  if (
    input.whatsappConsentRevokedAt !==
      undefined
  ) {
    updates.whatsapp_consent_revoked_at =
      input.whatsappConsentRevokedAt;
  }

  if (
    input.pushConsentGrantedAt !==
      undefined
  ) {
    updates.push_consent_granted_at =
      input.pushConsentGrantedAt;
  }

  if (
    input.pushConsentRevokedAt !==
      undefined
  ) {
    updates.push_consent_revoked_at =
      input.pushConsentRevokedAt;
  }

  if (
    input.consentSource !==
      undefined
  ) {
    updates.consent_source =
      input.consentSource;
  }

  if (
    input.consentVersion !==
      undefined
  ) {
    updates.consent_version =
      input.consentVersion;
  }

  if (
    Object.keys(
      updates
    ).length ===
      0
  ) {
    const existing =
      await getCommunicationPreferences(
        normalizedUserId,
        client
      );

    if (!existing) {
      throw new Error(
        "Communication preferences were not found."
      );
    }

    return existing;
  }

  const {
    data,
    error,
  } =
    await client
      .from(
        "communication_preferences"
      )
      .update(
        updates
      )
      .eq(
        "user_id",
        normalizedUserId
      )
      .select(
        COMMUNICATION_PREFERENCES_SELECT
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!data) {
    throw new Error(
      "Communication preferences were not found."
    );
  }

  return (
  data as unknown as
    CommunicationPreferences
);
}
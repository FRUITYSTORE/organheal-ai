import {
  supabase,
} from "@/lib/supabase";

export type SexAtBirth =
  | "male"
  | "female"
  | "intersex"
  | "unknown"
  | "prefer_not_to_say";

export type ReportIdentityPreference =
  | "ask"
  | "identified"
  | "deidentified";

export type ReportPatientIdentity = {
  fullName:
    string | null;

  dateOfBirth:
    string | null;

  sexAtBirth:
    SexAtBirth | null;

  preference:
    ReportIdentityPreference;
};

type ProfileRow = {
  full_name:
    string | null;

  date_of_birth:
    string | null;

  sex_at_birth:
    string | null;

  report_identity_preference:
    string | null;
};

function normalizeSexAtBirth(
  value:
    unknown
): SexAtBirth | null {
  if (
    value === "male" ||
    value === "female" ||
    value === "intersex" ||
    value === "unknown" ||
    value === "prefer_not_to_say"
  ) {
    return value;
  }

  return null;
}

function normalizePreference(
  value:
    unknown
): ReportIdentityPreference {
  if (
    value === "identified" ||
    value === "deidentified" ||
    value === "ask"
  ) {
    return value;
  }

  return "ask";
}

export async function loadCurrentReportPatientIdentity():
  Promise<ReportPatientIdentity | null> {
  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser();

  const user =
    userData.user;

  if (
    userError ||
    !user
  ) {
    return null;
  }

  const {
    data,
  } =
    await supabase
      .from("profiles")
      .select(
        "full_name,date_of_birth,sex_at_birth,report_identity_preference"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  const profile =
    data as
      ProfileRow |
      null;

  const metadata =
    user.user_metadata ??
    {};

  const fullName =
    profile?.full_name?.trim() ||
    (
      typeof metadata.full_name ===
      "string"
        ? metadata.full_name.trim()
        : ""
    ) ||
    null;

  const dateOfBirth =
    profile?.date_of_birth ||
    (
      typeof metadata.date_of_birth ===
      "string"
        ? metadata.date_of_birth
        : null
    );

  const sexAtBirth =
    normalizeSexAtBirth(
      profile?.sex_at_birth ??
      metadata.sex_at_birth
    );

  const preference =
    normalizePreference(
      profile
        ?.report_identity_preference ??
      metadata
        .report_identity_preference
    );

  return {
    fullName,
    dateOfBirth,
    sexAtBirth,
    preference,
  };
}

export function calculateAgeFromDateOfBirth(
  dateOfBirth:
    string | null | undefined,
  now =
    new Date()
): number | null {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate =
    new Date(
      `${dateOfBirth}T00:00:00`
    );

  if (
    Number.isNaN(
      birthDate.getTime()
    ) ||
    birthDate > now
  ) {
    return null;
  }

  let age =
    now.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    now.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      now.getDate() <
        birthDate.getDate()
    )
  ) {
    age -= 1;
  }

  return age >= 0
    ? age
    : null;
}

export function presentSexAtBirth(
  value:
    SexAtBirth | null,
  isArabic:
    boolean
): string {
  if (!value) {
    return isArabic
      ? "غير محدد"
      : "Not specified";
  }

  const labels = {
    male: isArabic
      ? "ذكر"
      : "Male",

    female: isArabic
      ? "أنثى"
      : "Female",

    intersex: isArabic
      ? "اختلاف في الخصائص الجنسية"
      : "Intersex",

    unknown: isArabic
      ? "غير معروف"
      : "Unknown",

    prefer_not_to_say:
      isArabic
        ? "أفضل عدم الإفصاح"
        : "Prefer not to say",
  };

  return labels[value];
}
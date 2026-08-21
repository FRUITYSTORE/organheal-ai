"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import PageBackActions from "@/app/components/PageBackActions";

import {
  supabase,
} from "@/lib/supabase";

type Language =
  | "en"
  | "ar";

type CommunicationPreferences = {
  user_id:
    string;

  preferred_language:
    Language;

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

type PreferencesResponse = {
  success?:
    boolean;

  preferences?:
    CommunicationPreferences;

  error?:
    string;

  requestId?:
    string;
};

type FormState = {
  preferredLanguage:
    Language;

  timezone:
    string;

  dashboardEnabled:
    boolean;

  emailEnabled:
    boolean;

  whatsappEnabled:
    boolean;

  pushEnabled:
    boolean;

  whatsappPhoneE164:
    string;

  emailConsent:
    boolean;

  whatsappConsent:
    boolean;

  pushConsent:
    boolean;
};

function hasActiveConsent(
  grantedAt:
    string | null,
  revokedAt:
    string | null
): boolean {
  if (!grantedAt) {
    return false;
  }

  if (!revokedAt) {
    return true;
  }

  const grantedTime =
    new Date(
      grantedAt
    ).getTime();

  const revokedTime =
    new Date(
      revokedAt
    ).getTime();

  if (
    Number.isNaN(
      grantedTime
    ) ||
    Number.isNaN(
      revokedTime
    )
  ) {
    return false;
  }

  return (
    grantedTime >
    revokedTime
  );
}

export default function CommunicationSettingsPage() {
  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "en"
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      ""
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    preferences,
    setPreferences,
  ] =
    useState<
      CommunicationPreferences |
      null
    >(
      null
    );

  const [
    form,
    setForm,
  ] =
    useState<FormState>({
      preferredLanguage:
        "en",

      timezone:
        "UTC",

      dashboardEnabled:
        true,

      emailEnabled:
        false,

      whatsappEnabled:
        false,

      pushEnabled:
        false,

      whatsappPhoneE164:
        "",

      emailConsent:
        false,

      whatsappConsent:
        false,

      pushConsent:
        false,
    });

  const isArabic =
    language ===
    "ar";

  function text(
    en:
      string,
    ar:
      string
  ) {
    return isArabic
      ? ar
      : en;
  }

  useEffect(
    () => {
      function syncLanguage() {
        const storedLanguage =
          localStorage
            .getItem(
              "organheal-language"
            );

        const selectedLanguage:
          Language =
            storedLanguage ===
              "ar"
              ? "ar"
              : "en";

        setLanguage(
          selectedLanguage
        );

        document
          .documentElement
          .lang =
            selectedLanguage;

        document
          .documentElement
          .dir =
            selectedLanguage ===
              "ar"
              ? "rtl"
              : "ltr";
      }

      syncLanguage();

      window.addEventListener(
        "storage",
        syncLanguage
      );

      window.addEventListener(
        "organheal-language-change",
        syncLanguage
      );

      return () => {
        window.removeEventListener(
          "storage",
          syncLanguage
        );

        window.removeEventListener(
          "organheal-language-change",
          syncLanguage
        );
      };
    },
    []
  );

  useEffect(
    () => {
      void loadPreferences();
    },
    []
  );

  async function getAccessToken():
    Promise<
      string
    > {
    const {
      data,
      error:
        sessionError,
    } =
      await supabase
        .auth
        .getSession();

    if (
      sessionError ||
      !data.session
        ?.access_token
    ) {
      throw new Error(
        "Authentication is required."
      );
    }

    return data
      .session
      .access_token;
  }

  function applyPreferences(
    value:
      CommunicationPreferences
  ) {
    setPreferences(
      value
    );

    setForm({
      preferredLanguage:
        value
          .preferred_language,

      timezone:
        value.timezone,

      dashboardEnabled:
        value
          .dashboard_enabled,

      emailEnabled:
        value
          .email_enabled,

      whatsappEnabled:
        value
          .whatsapp_enabled,

      pushEnabled:
        value
          .push_enabled,

      whatsappPhoneE164:
        value
          .whatsapp_phone_e164 ??
        "",

      emailConsent:
        hasActiveConsent(
          value
            .email_consent_granted_at,
          value
            .email_consent_revoked_at
        ),

      whatsappConsent:
        hasActiveConsent(
          value
            .whatsapp_consent_granted_at,
          value
            .whatsapp_consent_revoked_at
        ),

      pushConsent:
        hasActiveConsent(
          value
            .push_consent_granted_at,
          value
            .push_consent_revoked_at
        ),
    });
  }

  async function loadPreferences() {
    setLoading(
      true
    );

    setError(
      ""
    );

    setMessage(
      ""
    );

    try {
      const token =
        await getAccessToken();

      const response =
        await fetch(
          "/api/communication-preferences",
          {
            method:
              "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const payload =
        await response
          .json() as
          PreferencesResponse;

      if (
        !response.ok ||
        !payload
          .preferences
      ) {
        throw new Error(
          payload.error ||
          "Could not load communication preferences."
        );
      }

      applyPreferences(
        payload
          .preferences
      );
    } catch (
      loadError
    ) {
      const message =
        loadError instanceof
          Error
          ? loadError
              .message
          : "Could not load communication preferences.";

      if (
        message ===
        "Authentication is required."
      ) {
        window
          .location
          .href =
            "/login";

        return;
      }

      setError(
        message
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  async function savePreferences() {
    if (
      saving
    ) {
      return;
    }

    setSaving(
      true
    );

    setError(
      ""
    );

    setMessage(
      ""
    );

    try {
      const token =
        await getAccessToken();

      const response =
        await fetch(
          "/api/communication-preferences",
          {
            method:
              "PUT",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                preferredLanguage:
                  form
                    .preferredLanguage,

                timezone:
                  form
                    .timezone,

                dashboardEnabled:
                  form
                    .dashboardEnabled,

                emailEnabled:
                  form
                    .emailEnabled,

                whatsappEnabled:
                  form
                    .whatsappEnabled,

                pushEnabled:
                  form
                    .pushEnabled,

                whatsappPhoneE164:
                  form
                    .whatsappPhoneE164
                    .trim() ||
                  null,

                emailConsent:
                  form
                    .emailConsent,

                whatsappConsent:
                  form
                    .whatsappConsent,

                pushConsent:
                  form
                    .pushConsent,
              }),
          }
        );

      const payload =
        await response
          .json() as
          PreferencesResponse;

      if (
        !response.ok ||
        !payload
          .preferences
      ) {
        throw new Error(
          payload.error ||
          "Could not save communication preferences."
        );
      }

      applyPreferences(
        payload
          .preferences
      );

      setMessage(
        text(
          "Communication preferences saved.",
          "تم حفظ تفضيلات التواصل."
        )
      );
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError
              .message
          : text(
              "Could not save communication preferences.",
              "تعذر حفظ تفضيلات التواصل."
            )
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  const whatsappVerified =
    Boolean(
      preferences
        ?.whatsapp_phone_verified_at
    );

  const timezoneOptions =
    useMemo(
      () => [
        "Asia/Dubai",
        "Asia/Amman",
        "UTC",
        "Europe/London",
        "America/New_York",
      ],
      []
    );

  function renderSwitch({
    checked,
    onChange,
    disabled =
      false,
    label,
  }: {
    checked:
      boolean;

    onChange:
      (
        value:
          boolean
      ) => void;

    disabled?:
      boolean;

    label:
      string;
  }) {
    return (
      <button
        type="button"
        className={`communicationSwitch ${
          checked
            ? "active"
            : ""
        }`}
        aria-label={
          label
        }
        aria-pressed={
          checked
        }
        disabled={
          disabled
        }
        onClick={() =>
          onChange(
            !checked
          )
        }
      >
        <span />
      </button>
    );
  }

  return (
    <main
      className="ohPageShell communicationSettingsPage"
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
    >
      <div
        className="ohContainer ohStack large"
        style={{
          padding:
            "28px 0 64px",
        }}
      >
        <PageBackActions />

        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text(
                  "COMMUNICATION SETTINGS",
                  "إعدادات التواصل"
                )}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Choose how OrganHeal can reach you",
                  "اختر كيف يمكن لـ OrganHeal التواصل معك"
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "Control in-app notifications and your consent for future email, WhatsApp, and push follow-up.",
                  "تحكم في إشعارات التطبيق وموافقتك على التواصل المستقبلي عبر البريد الإلكتروني وواتساب والإشعارات الفورية."
                )}
              </p>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text(
                      "Privacy control",
                      "التحكم بالخصوصية"
                    )}
                  </p>

                  <h2 className="ohCardTitle">
                    {text(
                      "You stay in control",
                      "أنت صاحب القرار"
                    )}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text(
                    "Protected",
                    "محمي"
                  )}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "External channels are used only when the required consent and technical verification are active.",
                  "لا يتم استخدام قنوات التواصل الخارجية إلا عند وجود الموافقة المطلوبة والتحقق التقني اللازم."
                )}
              </p>
            </div>
          </div>
        </section>

        {loading && (
          <section className="ohCard">
            <p className="ohCardText">
              {text(
                "Loading communication preferences...",
                "جارٍ تحميل تفضيلات التواصل..."
              )}
            </p>
          </section>
        )}

        {!loading &&
          error && (
            <section className="ohEmptyState">
              <h2>
                {text(
                  "Could not load settings",
                  "تعذر تحميل الإعدادات"
                )}
              </h2>

              <p>
                {error}
              </p>
            </section>
          )}

        {!loading &&
          !error && (
            <>
              <section className="ohCard">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text(
                        "Preferences",
                        "التفضيلات"
                      )}
                    </p>

                    <h2 className="ohCardTitle">
                      {text(
                        "Language and timezone",
                        "اللغة والمنطقة الزمنية"
                      )}
                    </h2>
                  </div>

                  <span className="ohStatusBadge neutral">
                    {form
                      .preferredLanguage ===
                    "ar"
                      ? "العربية"
                      : "English"}
                  </span>
                </div>

                <div className="communicationFieldGrid">
                  <label className="communicationField">
                    <span>
                      {text(
                        "Preferred communication language",
                        "لغة التواصل المفضلة"
                      )}
                    </span>

                    <select
                      value={
                        form
                          .preferredLanguage
                      }
                      onChange={(
                        event
                      ) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,

                            preferredLanguage:
                              event
                                .target
                                .value as
                                Language,
                          })
                        )
                      }
                    >
                      <option value="en">
                        English
                      </option>

                      <option value="ar">
                        العربية
                      </option>
                    </select>
                  </label>

                  <label className="communicationField">
                    <span>
                      {text(
                        "Timezone",
                        "المنطقة الزمنية"
                      )}
                    </span>

                    <select
                      value={
                        form
                          .timezone
                      }
                      onChange={(
                        event
                      ) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,

                            timezone:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    >
                      {timezoneOptions.map(
                        (
                          timezone
                        ) => (
                          <option
                            key={
                              timezone
                            }
                            value={
                              timezone
                            }
                          >
                            {timezone}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>
              </section>

              <section className="communicationChannelGrid">
                <article className="ohCard communicationChannelCard">
                  <div className="ohCardHeader">
                    <div>
                      <p className="ohMetricLabel">
                        {text(
                          "In-app",
                          "داخل التطبيق"
                        )}
                      </p>

                      <h2 className="ohCardTitle">
                        {text(
                          "Dashboard notifications",
                          "إشعارات لوحة التحكم"
                        )}
                      </h2>
                    </div>

                    {renderSwitch({
                      checked:
                        form
                          .dashboardEnabled,

                      onChange:
                        (
                          value
                        ) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              dashboardEnabled:
                                value,
                            })
                          ),

                      label:
                        "Dashboard notifications",
                    })}
                  </div>

                  <p className="ohCardText">
                    {text(
                      "Receive OrganHeal follow-up notifications inside your account.",
                      "استقبل إشعارات المتابعة من OrganHeal داخل حسابك."
                    )}
                  </p>

                  <span className="ohStatusBadge good">
                    {text(
                      "Available now",
                      "متاح الآن"
                    )}
                  </span>
                </article>

                <article className="ohCard communicationChannelCard">
                  <div className="ohCardHeader">
                    <div>
                      <p className="ohMetricLabel">
                        Email
                      </p>

                      <h2 className="ohCardTitle">
                        {text(
                          "Email follow-up",
                          "المتابعة عبر البريد الإلكتروني"
                        )}
                      </h2>
                    </div>

                    {renderSwitch({
                      checked:
                        form
                          .emailEnabled,

                      onChange:
                        (
                          value
                        ) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              emailEnabled:
                                value,

                              emailConsent:
                                value
                                  ? current
                                      .emailConsent
                                  : false,
                            })
                          ),

                      label:
                        "Email notifications",
                    })}
                  </div>

                  <p className="ohCardText">
                    {text(
                      "Allow future educational and follow-up messages by email.",
                      "اسمح برسائل التثقيف والمتابعة المستقبلية عبر البريد الإلكتروني."
                    )}
                  </p>

                  <label className="communicationConsent">
                    <input
                      type="checkbox"
                      checked={
                        form
                          .emailConsent
                      }
                      disabled={
                        !form
                          .emailEnabled
                      }
                      onChange={(
                        event
                      ) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,

                            emailConsent:
                              event
                                .target
                                .checked,
                          })
                        )
                      }
                    />

                    <span>
                      {text(
                        "I consent to receive OrganHeal email follow-up.",
                        "أوافق على استلام رسائل المتابعة من OrganHeal عبر البريد الإلكتروني."
                      )}
                    </span>
                  </label>
                </article>

                <article className="ohCard communicationChannelCard">
                  <div className="ohCardHeader">
                    <div>
                      <p className="ohMetricLabel">
                        WhatsApp
                      </p>

                      <h2 className="ohCardTitle">
                        {text(
                          "WhatsApp follow-up",
                          "المتابعة عبر واتساب"
                        )}
                      </h2>
                    </div>

                    {renderSwitch({
                      checked:
                        form
                          .whatsappEnabled,

                      onChange:
                        (
                          value
                        ) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              whatsappEnabled:
                                value,

                              whatsappConsent:
                                value
                                  ? current
                                      .whatsappConsent
                                  : false,
                            })
                          ),

                      label:
                        "WhatsApp notifications",
                    })}
                  </div>

                  <p className="ohCardText">
                    {text(
                      "WhatsApp delivery is being prepared. Saving a number here does not activate external delivery until verification and production setup are complete.",
                      "يجري تجهيز التواصل عبر واتساب. حفظ الرقم هنا لا يفعّل الإرسال الخارجي حتى يكتمل التحقق وإعداد الإنتاج."
                    )}
                  </p>

                  <label className="communicationField">
                    <span>
                      {text(
                        "WhatsApp number (E.164)",
                        "رقم واتساب بصيغة E.164"
                      )}
                    </span>

                    <input
                      type="tel"
                      value={
                        form
                          .whatsappPhoneE164
                      }
                      placeholder="+971501234567"
                      onChange={(
                        event
                      ) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,

                            whatsappPhoneE164:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />
                  </label>

                  <div className="communicationStatusRow">
                    <span
                      className={`ohStatusBadge ${
                        whatsappVerified
                          ? "good"
                          : "moderate"
                      }`}
                    >
                      {whatsappVerified
                        ? text(
                            "Number verified",
                            "الرقم موثق"
                          )
                        : text(
                            "Verification pending",
                            "التحقق غير مكتمل"
                          )}
                    </span>

                    <span className="ohStatusBadge neutral">
                      {text(
                        "Production delivery not active",
                        "الإرسال الإنتاجي غير مفعّل"
                      )}
                    </span>
                  </div>

                  <label className="communicationConsent">
                    <input
                      type="checkbox"
                      checked={
                        form
                          .whatsappConsent
                      }
                      disabled={
                        !form
                          .whatsappEnabled
                      }
                      onChange={(
                        event
                      ) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,

                            whatsappConsent:
                              event
                                .target
                                .checked,
                          })
                        )
                      }
                    />

                    <span>
                      {text(
                        "I consent to receive OrganHeal follow-up through WhatsApp once the channel is available.",
                        "أوافق على استلام رسائل المتابعة من OrganHeal عبر واتساب عند توفر القناة."
                      )}
                    </span>
                  </label>
                </article>

                <article className="ohCard communicationChannelCard">
                  <div className="ohCardHeader">
                    <div>
                      <p className="ohMetricLabel">
                        Push
                      </p>

                      <h2 className="ohCardTitle">
                        {text(
                          "Push notifications",
                          "الإشعارات الفورية"
                        )}
                      </h2>
                    </div>

                    {renderSwitch({
                      checked:
                        form
                          .pushEnabled,

                      onChange:
                        (
                          value
                        ) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              pushEnabled:
                                value,

                              pushConsent:
                                value
                                  ? current
                                      .pushConsent
                                  : false,
                            })
                          ),

                      label:
                        "Push notifications",
                    })}
                  </div>

                  <p className="ohCardText">
                    {text(
                      "Control consent for future device notifications when push delivery becomes available.",
                      "تحكم في موافقتك على إشعارات الجهاز المستقبلية عند تفعيل خدمة الإشعارات الفورية."
                    )}
                  </p>

                  <label className="communicationConsent">
                    <input
                      type="checkbox"
                      checked={
                        form
                          .pushConsent
                      }
                      disabled={
                        !form
                          .pushEnabled
                      }
                      onChange={(
                        event
                      ) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,

                            pushConsent:
                              event
                                .target
                                .checked,
                          })
                        )
                      }
                    />

                    <span>
                      {text(
                        "I consent to receive OrganHeal push follow-up when available.",
                        "أوافق على استلام إشعارات المتابعة الفورية من OrganHeal عند توفرها."
                      )}
                    </span>
                  </label>
                </article>
              </section>

              {(message ||
                error) && (
                <section
                  className={`communicationMessage ${
                    error
                      ? "error"
                      : "success"
                  }`}
                >
                  {error ||
                    message}
                </section>
              )}

              <section className="ohCard">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text(
                        "Save settings",
                        "حفظ الإعدادات"
                      )}
                    </p>

                    <h2 className="ohCardTitle">
                      {text(
                        "Keep your communication choices up to date",
                        "حافظ على تحديث خيارات التواصل"
                      )}
                    </h2>
                  </div>
                </div>

                <p className="ohCardText">
                  {text(
                    "You can change or revoke these preferences later.",
                    "يمكنك تعديل هذه التفضيلات أو سحب الموافقة لاحقًا."
                  )}
                </p>

                <div
                  className="ohButtonRow"
                  style={{
                    marginTop:
                      "18px",
                  }}
                >
                  <button
                    type="button"
                    className="primaryBtn"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void savePreferences()
                    }
                  >
                    {saving
                      ? text(
                          "Saving...",
                          "جارٍ الحفظ..."
                        )
                      : text(
                          "Save Communication Settings",
                          "حفظ إعدادات التواصل"
                        )}
                  </button>
                </div>
              </section>
            </>
          )}
      </div>

      <style>{`
        .communicationSettingsPage .communicationChannelGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .communicationSettingsPage .communicationChannelCard {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .communicationSettingsPage .communicationFieldGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 18px;
        }

        .communicationSettingsPage .communicationField {
          display: grid;
          gap: 8px;
          color: #334155;
          font-size: 0.86rem;
          font-weight: 800;
        }

        .communicationSettingsPage .communicationField input,
        .communicationSettingsPage .communicationField select {
          width: 100%;
          min-height: 46px;
          padding: 10px 12px;
          border: 1px solid rgba(148, 163, 184, 0.36);
          border-radius: 13px;
          background: #ffffff;
          color: #0f172a;
          font: inherit;
          outline: none;
        }

        .communicationSettingsPage .communicationField input:focus,
        .communicationSettingsPage .communicationField select:focus {
          border-color: #14b8a6;
          box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
        }

        .communicationSettingsPage .communicationSwitch {
          position: relative;
          width: 50px;
          height: 28px;
          flex: 0 0 auto;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: #cbd5e1;
          cursor: pointer;
          transition: 160ms ease;
        }

        .communicationSettingsPage .communicationSwitch span {
          position: absolute;
          top: 4px;
          left: 4px;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 2px 7px rgba(15, 23, 42, 0.2);
          transition: 160ms ease;
        }

        .communicationSettingsPage .communicationSwitch.active {
          background: #0f766e;
        }

        .communicationSettingsPage .communicationSwitch.active span {
          transform: translateX(22px);
        }

        [dir="rtl"] .communicationSettingsPage .communicationSwitch span {
          left: auto;
          right: 4px;
        }

        [dir="rtl"] .communicationSettingsPage .communicationSwitch.active span {
          transform: translateX(-22px);
        }

        .communicationSettingsPage .communicationSwitch:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .communicationSettingsPage .communicationConsent {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(15, 118, 110, 0.06);
          color: #475569;
          font-size: 0.84rem;
          line-height: 1.6;
        }

        .communicationSettingsPage .communicationConsent input {
          margin-top: 4px;
        }

        .communicationSettingsPage .communicationStatusRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .communicationSettingsPage .communicationMessage {
          padding: 14px 16px;
          border-radius: 14px;
          font-weight: 800;
        }

        .communicationSettingsPage .communicationMessage.success {
          background: rgba(16, 185, 129, 0.1);
          color: #047857;
        }

        .communicationSettingsPage .communicationMessage.error {
          background: rgba(239, 68, 68, 0.09);
          color: #b91c1c;
        }

        @media (max-width: 820px) {
          .communicationSettingsPage .communicationChannelGrid,
          .communicationSettingsPage .communicationFieldGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

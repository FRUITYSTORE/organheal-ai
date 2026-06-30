"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";
type MessageType = "success" | "error" | "info";

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const savedLanguage =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return savedLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export default function ResetPasswordPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("info");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    prepareResetSession();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  function textByLanguage(languageValue: Language, en: string, ar: string) {
    return languageValue === "ar" ? ar : en;
  }

  function showMessage(value: string, type: MessageType) {
    setMessage(value);
    setMessageType(type);
  }

  async function prepareResetSession() {
    const currentLanguage = getStoredLanguage();

    showMessage(
      textByLanguage(
        currentLanguage,
        "Checking reset link...",
        "جاري التحقق من رابط إعادة التعيين..."
      ),
      "info"
    );

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        showMessage(
          textByLanguage(
            currentLanguage,
            error.message || "Could not verify reset link. Please request a new link.",
            "تعذر التحقق من رابط إعادة التعيين. يرجى طلب رابط جديد."
          ),
          "error"
        );
        return;
      }

      setReady(true);
      showMessage(
        textByLanguage(
          currentLanguage,
          "Reset link verified. You can create a new password now.",
          "تم التحقق من الرابط. يمكنك الآن إنشاء كلمة مرور جديدة."
        ),
        "success"
      );
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        showMessage(
          textByLanguage(
            currentLanguage,
            "Could not prepare reset session. Please request a new reset email.",
            "تعذر تجهيز جلسة إعادة التعيين. يرجى طلب بريد جديد لإعادة التعيين."
          ),
          "error"
        );
        return;
      }

      setReady(true);
      showMessage(
        textByLanguage(
          currentLanguage,
          "Reset link verified. You can create a new password now.",
          "تم التحقق من الرابط. يمكنك الآن إنشاء كلمة مرور جديدة."
        ),
        "success"
      );
      return;
    }

    if (accessToken) {
      setReady(true);
      showMessage(
        textByLanguage(
          currentLanguage,
          "Reset link detected. You can try creating a new password now.",
          "تم العثور على رابط إعادة التعيين. يمكنك محاولة إنشاء كلمة مرور جديدة الآن."
        ),
        "info"
      );
      return;
    }

    showMessage(
      textByLanguage(
        currentLanguage,
        "Invalid or expired reset link. Please request a new password reset email.",
        "رابط إعادة تعيين كلمة المرور غير صالح أو منتهي. يرجى طلب بريد جديد لإعادة التعيين."
      ),
      "error"
    );
  }

  const passwordStrong =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /\d/.test(newPassword);

  const strengthScore =
    (newPassword.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(newPassword) ? 1 : 0) +
    (/[a-z]/.test(newPassword) ? 1 : 0) +
    (/[0-9]/.test(newPassword) ? 1 : 0);

  const strengthText =
    strengthScore === 0
      ? ""
      : strengthScore === 1
      ? text("Weak", "ضعيفة")
      : strengthScore === 2
      ? text("Fair", "متوسطة")
      : strengthScore === 3
      ? text("Good", "جيدة")
      : text("Strong", "قوية");

  const strengthTone =
    strengthScore <= 1 ? "risk" : strengthScore <= 3 ? "moderate" : "good";

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ready) {
      showMessage(
        text(
          "Reset session is not ready. Please open the reset link again.",
          "جلسة إعادة التعيين غير جاهزة. يرجى فتح رابط إعادة التعيين مرة أخرى."
        ),
        "error"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage(text("Passwords do not match.", "كلمتا المرور غير متطابقتين."), "error");
      return;
    }

    if (!passwordStrong) {
      showMessage(
        text(
          "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
          "يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم."
        ),
        "error"
      );
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      showMessage(
        text(
          error.message || "Could not update password. Please try again.",
          "تعذر تحديث كلمة المرور الآن. يرجى المحاولة مرة أخرى."
        ),
        "error"
      );
      setLoading(false);
      return;
    }

    showMessage(
      text(
        "Password updated successfully. Redirecting to login...",
        "تم تحديث كلمة المرور بنجاح. سيتم تحويلك إلى تسجيل الدخول..."
      ),
      "success"
    );

    setNewPassword("");
    setConfirmPassword("");

    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  }

  return (
    <main
      className="ohPageShell resetPasswordPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .resetPasswordPage a {
          color: inherit;
          text-decoration: none;
        }

        .resetPasswordPage .resetForm {
          display: grid;
          gap: 16px;
        }

        .resetPasswordPage .resetField {
          display: grid;
          gap: 8px;
        }

        .resetPasswordPage .resetField span {
          font-weight: 800;
          color: var(--oh-text);
          font-size: 0.94rem;
        }

        .resetPasswordPage input[type="password"] {
          width: 100%;
          min-height: 48px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.36);
          background: rgba(255, 255, 255, 0.94);
          color: var(--oh-text);
          padding: 12px 14px;
          font: inherit;
          outline: none;
        }

        .resetPasswordPage input:focus {
          border-color: rgba(20, 184, 166, 0.68);
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
        }

        .resetPasswordPage input:disabled {
          opacity: 0.68;
          cursor: not-allowed;
        }

        .resetPasswordPage .resetStrength {
          display: grid;
          gap: 8px;
          padding: 12px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 16px;
          background: rgba(248, 250, 252, 0.78);
        }

        .resetPasswordPage .resetStrengthBar {
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(148, 163, 184, 0.22);
        }

        .resetPasswordPage .resetStrengthBar span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ef4444, #f59e0b, #14b8a6);
          transition: width 0.2s ease;
        }

        .resetPasswordPage .resetMessage {
          border-radius: 16px;
          padding: 13px 14px;
          line-height: 1.65;
          font-weight: 800;
        }

        .resetPasswordPage .resetMessage.success {
          background: rgba(20, 184, 166, 0.1);
          color: #0f766e;
          border: 1px solid rgba(20, 184, 166, 0.28);
        }

        .resetPasswordPage .resetMessage.error {
          background: rgba(239, 68, 68, 0.08);
          color: #b91c1c;
          border: 1px solid rgba(239, 68, 68, 0.22);
        }

        .resetPasswordPage .resetMessage.info {
          background: rgba(59, 130, 246, 0.08);
          color: #1d4ed8;
          border: 1px solid rgba(59, 130, 246, 0.22);
        }

        .resetPasswordPage .resetSubmit {
          width: 100%;
          justify-content: center;
        }

        .resetPasswordPage .resetSubmit:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Password Reset", "إعادة تعيين كلمة المرور")}
              </p>

              <h1 className="ohTitle">
                {text("Create a new secure password.", "أنشئ كلمة مرور آمنة جديدة.")}
              </h1>

              <p className="ohLead">
                {text(
                  "Use the reset link from your email to create a new password for your OrganHeal account.",
                  "استخدم رابط إعادة التعيين من بريدك الإلكتروني لإنشاء كلمة مرور جديدة لحسابك في OrganHeal."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/login" className="primaryBtn">
                  {text("Back to Login", "العودة لتسجيل الدخول")}
                </Link>

                <Link href="/" className="secondaryBtn">
                  {text("Back Home", "العودة للرئيسية")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Account security", "أمان الحساب")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {ready
                      ? text("Reset link verified", "تم التحقق من الرابط")
                      : text("Waiting for valid reset link", "بانتظار رابط صالح")}
                  </h2>
                </div>

                <span className={`ohStatusBadge ${ready ? "good" : "moderate"}`}>
                  {ready ? text("Ready", "جاهز") : text("Checking", "تحقق")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "For account safety, password changes are only allowed from a valid reset email link.",
                  "لحماية الحساب، تغيير كلمة المرور مسموح فقط من خلال رابط إعادة تعيين صالح من البريد الإلكتروني."
                )}
              </p>

              <div className="ohDivider" />

              <div className="ohTimeline">
                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Open the reset email", "افتح بريد إعادة التعيين")}
                  </p>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Create a strong password", "أنشئ كلمة مرور قوية")}
                  </p>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Return to login", "ارجع لتسجيل الدخول")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ohGrid cols2">
          <form className="ohCard resetForm" onSubmit={handleUpdatePassword}>
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("New password", "كلمة المرور الجديدة")}
                </p>

                <h2 className="ohCardTitle">
                  {text("Update your password", "تحديث كلمة المرور")}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Your new password must be at least 8 characters and include uppercase, lowercase, and a number.",
                    "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم."
                  )}
                </p>
              </div>
            </div>

            <label className="resetField">
              <span>{text("New Password", "كلمة المرور الجديدة")}</span>
              <input
                type="password"
                placeholder={text("Enter new password", "اكتب كلمة المرور الجديدة")}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                disabled={!ready || loading}
                required
              />
            </label>

            <label className="resetField">
              <span>{text("Confirm New Password", "تأكيد كلمة المرور الجديدة")}</span>
              <input
                type="password"
                placeholder={text("Confirm new password", "أعد كتابة كلمة المرور الجديدة")}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                disabled={!ready || loading}
                required
              />
            </label>

            {newPassword && (
              <div className="resetStrength">
                <div className="resetStrengthBar">
                  <span style={{ width: `${strengthScore * 25}%` }} />
                </div>

                <p className="ohMetricHint" style={{ margin: 0 }}>
                  {text("Password strength:", "قوة كلمة المرور:")}{" "}
                  <span className={`ohStatusBadge ${strengthTone}`}>{strengthText}</span>
                </p>
              </div>
            )}

            {message && (
              <p className={`resetMessage ${messageType}`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              className="primaryBtn resetSubmit"
              disabled={loading || !ready}
            >
              {loading
                ? text("Updating...", "جاري التحديث...")
                : text("Update Password", "تحديث كلمة المرور")}
            </button>

            <div className="ohButtonRow">
              <Link href="/login" className="secondaryBtn">
                {text("Login", "تسجيل الدخول")}
              </Link>

              <Link href="/contact" className="secondaryBtn">
                {text("Need Help?", "تحتاج مساعدة؟")}
              </Link>
            </div>
          </form>

          <aside className="ohCard">
            <p className="ohMetricLabel">
              {text("Password safety tips", "نصائح أمان كلمة المرور")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Choose a password you do not use elsewhere.",
                "اختر كلمة مرور لا تستخدمها في مكان آخر."
              )}
            </h2>

            <div className="ohTimeline" style={{ marginTop: "18px" }}>
              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Use at least 8 characters", "استخدم 8 أحرف على الأقل")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "Longer passwords are harder to guess.",
                      "كلمات المرور الأطول أصعب في التخمين."
                    )}
                  </p>
                </div>
              </div>

              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Mix letters and numbers", "امزج الحروف والأرقام")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "Include uppercase, lowercase, and at least one number.",
                      "استخدم حرفًا كبيرًا، حرفًا صغيرًا، ورقمًا واحدًا على الأقل."
                    )}
                  </p>
                </div>
              </div>

              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Avoid reused passwords", "تجنب كلمة مرور مكررة")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "Do not reuse your email, username, or old passwords.",
                      "لا تستخدم بريدك، اسم المستخدم، أو كلمات مرور قديمة."
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="ohDivider" />

            <div className="ohTrustNotice">
              <span aria-hidden="true">🛡️</span>
              <div>
                <strong>
                  {text("Medical safety reminder", "تذكير السلامة الطبية")}
                </strong>
                <br />
                {text(
                  "OrganHeal provides educational and organizational health intelligence only and does not replace licensed medical care.",
                  "OrganHeal يقدم ذكاء صحي تعليمي وتنظيمي فقط ولا يستبدل الرعاية الطبية المرخصة."
                )}
              </div>
            </div>

            <div className="ohButtonRow" style={{ marginTop: "18px" }}>
              <Link href="/privacy" className="secondaryBtn">
                {text("Privacy", "الخصوصية")}
              </Link>

              <Link href="/terms" className="secondaryBtn">
                {text("Terms", "الشروط")}
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

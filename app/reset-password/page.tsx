"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

export default function ResetPasswordPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function syncLanguage() {
      const savedLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
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

  function getCurrentLanguage() {
    return (localStorage.getItem("organheal-language") as Language | null) || "en";
  }

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  async function prepareResetSession() {
    const currentLanguage = getCurrentLanguage();
    const currentIsArabic = currentLanguage === "ar";

    setMessage(
      currentIsArabic ? "جاري التحقق من رابط إعادة التعيين..." : "Checking reset link..."
    );

    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);

    const code = params.get("code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMessage(
          currentIsArabic
            ? "تعذر التحقق من رابط إعادة التعيين. يرجى طلب رابط جديد."
            : error.message
        );
        return;
      }

      setReady(true);
      setMessage("");
      return;
    }

    if (hash.includes("access_token")) {
      setReady(true);
      setMessage("");
      return;
    }

    setMessage(
      currentIsArabic
        ? "رابط إعادة تعيين كلمة المرور غير صالح أو منتهي. يرجى طلب بريد جديد لإعادة التعيين."
        : "Invalid or expired reset link. Please request a new password reset email."
    );
  }

  const passwordStrong =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /\d/.test(newPassword);

  async function handleUpdatePassword() {
    setMessage("");

    if (!ready) {
      setMessage(
        text(
          "Reset session is not ready. Please open the reset link again.",
          "جلسة إعادة التعيين غير جاهزة. يرجى فتح رابط إعادة التعيين مرة أخرى."
        )
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage(text("Passwords do not match.", "كلمتا المرور غير متطابقتين."));
      return;
    }

    if (!passwordStrong) {
      setMessage(
        text(
          "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
          "يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم."
        )
      );
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(
        isArabic
          ? "تعذر تحديث كلمة المرور الآن. يرجى المحاولة مرة أخرى."
          : error.message
      );
      setLoading(false);
      return;
    }

    setMessage(
      text(
        "Password updated successfully. Redirecting to login...",
        "تم تحديث كلمة المرور بنجاح. سيتم تحويلك إلى تسجيل الدخول..."
      )
    );

    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  }

  return (
    <main className="assistantPage" dir={isArabic ? "rtl" : "ltr"}>
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">
            {text("PASSWORD RESET", "إعادة تعيين كلمة المرور")}
          </p>
          <h1>{text("Create a New Password", "إنشاء كلمة مرور جديدة")}</h1>
          <p>
            {text(
              "Enter a new secure password for your OrganHeal account.",
              "أدخل كلمة مرور آمنة جديدة لحسابك في OrganHeal."
            )}
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>{text("New Password", "كلمة المرور الجديدة")}</label>
              <input
                type="password"
                placeholder={text("Enter new password", "اكتب كلمة المرور الجديدة")}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={!ready}
              />
            </div>

            <div className="formGroup">
              <label>
                {text("Confirm New Password", "تأكيد كلمة المرور الجديدة")}
              </label>
              <input
                type="password"
                placeholder={text(
                  "Confirm new password",
                  "أعد كتابة كلمة المرور الجديدة"
                )}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={!ready}
              />
            </div>

            <button
              className="primaryBtn"
              onClick={handleUpdatePassword}
              disabled={loading || !ready}
            >
              {loading
                ? text("Updating...", "جاري التحديث...")
                : text("Update Password", "تحديث كلمة المرور")}
            </button>

            {message && <p>{message}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}

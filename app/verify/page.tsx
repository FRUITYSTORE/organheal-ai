"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";
type Status = "checking" | "success" | "error";

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

export default function VerifyPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [status, setStatus] = useState<Status>("checking");
  const [errorMessage, setErrorMessage] = useState("");

  const isArabic = language === "ar";

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  async function completeVerification() {
    const currentLanguage = getStoredLanguage();
    const isCurrentArabic = currentLanguage === "ar";

    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type") || "signup";

    if (!tokenHash) {
      setStatus("error");
      setErrorMessage(
        isCurrentArabic
          ? "رابط التأكيد غير صالح أو غير مكتمل."
          : "This confirmation link is invalid or incomplete."
      );
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "email" | "email_change" | "invite" | "recovery",
    });

    if (error) {
      setStatus("error");
      setErrorMessage(
        isCurrentArabic
          ? "انتهت صلاحية رابط التأكيد أو تم استخدامه من قبل. يمكنك محاولة تسجيل الدخول، أو إنشاء حساب جديد إذا استمرت المشكلة."
          : "This confirmation link has expired or was already used. Try signing in, or create a new account if the problem continues."
      );
      return;
    }

    // verifyOtp establishes a session for this account, which is what a
    // freshly confirmed user wants next — no separate manual login step.
    setStatus("success");
  }

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    void completeVerification();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  return (
    <main
      className="ohPageShell verifyCommandPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .verifyCommandPage {
          min-height: calc(100vh - 72px);
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .verifyCard {
          width: 100%;
          max-width: 460px;
          padding: clamp(28px, 4vw, 40px);
          text-align: center;
        }

        .verifyIcon {
          display: grid;
          place-items: center;
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          border-radius: 999px;
          font-size: 1.8rem;
        }

        .verifyIcon.checking {
          background: var(--oh-primary-soft);
          color: var(--oh-primary);
        }

        .verifyIcon.success {
          background: var(--oh-good-soft);
          color: var(--oh-good);
        }

        .verifyIcon.error {
          background: var(--oh-risk-soft);
          color: var(--oh-risk);
        }

        .verifyCard h1 {
          margin: 0 0 10px;
          color: var(--oh-text);
          font-size: 1.5rem;
        }

        .verifyCard p {
          margin: 0 0 24px;
          color: var(--oh-soft-text);
          line-height: 1.7;
        }
      `}</style>

      <div className="ohCard verifyCard">
        {status === "checking" && (
          <>
            <div className="verifyIcon checking" aria-hidden="true">
              ⏳
            </div>
            <h1>{text("Confirming your email...", "جاري تأكيد بريدك الإلكتروني...")}</h1>
            <p>
              {text(
                "This will only take a moment.",
                "هذا لن يستغرق سوى لحظات."
              )}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="verifyIcon success" aria-hidden="true">
              ✓
            </div>
            <h1>{text("Email confirmed", "تم تأكيد بريدك الإلكتروني")}</h1>
            <p>
              {text(
                "Your account is active. Let's set up your health profile.",
                "حسابك مفعَّل الآن. لنبدأ بإعداد ملفك الصحي."
              )}
            </p>
            <Link href="/onboarding" className="primaryBtn">
              {text("Continue", "متابعة")}
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="verifyIcon error" aria-hidden="true">
              !
            </div>
            <h1>{text("Confirmation failed", "تعذر التأكيد")}</h1>
            <p>{errorMessage}</p>
            <div className="ohButtonRow" style={{ justifyContent: "center" }}>
              <Link href="/login" className="primaryBtn">
                {text("Sign in", "تسجيل الدخول")}
              </Link>
              <Link href="/signup" className="secondaryBtn">
                {text("Create account", "إنشاء حساب")}
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

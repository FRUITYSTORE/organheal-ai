"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  sendProductAnalyticsEvent,
} from "@/lib/analytics/product-analytics.client";

type Language = "en" | "ar";
type MessageType = "success" | "error" | "";
type LoadingAction = "login" | "forgot" | "resend" | "";

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

const privateReturnPrefixes = [
  "/dashboard",
  "/reports",
  "/intelligence",
  "/health-plan",
  "/history",
  "/profile",
  "/lab-upload",
  "/checkin",
  "/organ-report",
  "/admin",
];

function getSafeNextPath() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  const requestedPath = params.get("next") || "";

  if (!requestedPath) return "";
  if (!requestedPath.startsWith("/") || requestedPath.startsWith("//")) return "";

  const cleanPath = requestedPath.split("?")[0].split("#")[0];

  const isAllowedPrivatePath = privateReturnPrefixes.some(
    (prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`)
  );

  return isAllowedPrivatePath ? requestedPath : "";
}

export default function LoginPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("");
  const [loadingAction, setLoadingAction] = useState<LoadingAction>("");

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();

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

  function showMessage(value: string, type: MessageType) {
    setMessage(value);
    setMessageType(type);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showMessage("", "");

    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier || !password) {
      showMessage(
        text(
          "Please enter your email or username and password.",
          "يرجى إدخال البريد الإلكتروني أو اسم المستخدم وكلمة المرور."
        ),
        "error"
      );
      return;
    }

    setLoadingAction("login");

        let loginResponse: Response;

    try {
      loginResponse =
        await fetch(
          "/api/auth/login",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                identifier:
                  cleanIdentifier,

                password,
              }),
          }
        );
    } catch {
      showMessage(
        text(
          "Unable to sign in right now. Please try again.",
          "تعذر تسجيل الدخول حاليًا. يرجى المحاولة مرة أخرى."
        ),
        "error"
      );

      setLoadingAction("");
      return;
    }

    const loginResult =
      await loginResponse
        .json()
        .catch(
          () => null
        ) as
        | {
            success?: boolean;

            session?: {
              accessToken?: string;

              refreshToken?: string;
            };

            error?: string;
          }
        | null;

    if (
      !loginResponse.ok ||
      !loginResult?.success ||
      !loginResult.session
        ?.accessToken ||
      !loginResult.session
        ?.refreshToken
    ) {
      showMessage(
        loginResponse.status === 429
          ? text(
              "Too many login attempts. Please wait a moment and try again.",
              "عدد محاولات تسجيل الدخول كبير. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى."
            )
          : text(
              "Incorrect email, username, or password. If you forgot your password, use Forgot Password below.",
              "البريد الإلكتروني أو اسم المستخدم أو كلمة المرور غير صحيحة. إذا نسيت كلمة المرور، استخدم خيار إعادة التعيين."
            ),
        "error"
      );

      setLoadingAction("");
      return;
    }

    const {
      data,
      error:
        sessionError,
    } =
      await supabase.auth
        .setSession({
          access_token:
            loginResult.session
              .accessToken,

          refresh_token:
            loginResult.session
              .refreshToken,
        });

    if (
      sessionError ||
      !data.session ||
      !data.user
    ) {
      await supabase.auth
        .signOut();

      showMessage(
        text(
          "Unable to complete sign in. Please try again.",
          "تعذر إكمال تسجيل الدخول. يرجى المحاولة مرة أخرى."
        ),
        "error"
      );

      setLoadingAction("");
      return;
    }

    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();

      showMessage(
        text(
          "Please confirm your email before signing in.",
          "يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول."
        ),
        "error"
      );

      setLoadingAction("");
      return;
    }

    void sendProductAnalyticsEvent({
      name:
        "login_completed",

      language,

      source:
        "login",
    });

    if (!data.user) {
      showMessage(
        text(
          "Unable to sign in. Please try again.",
          "تعذر تسجيل الدخول. حاول مرة أخرى."
        ),
        "error"
      );

      setLoadingAction("");
      return;
    }

    const userId = data.user.id;

    const [{ data: assessments }, { data: reports }, { data: checkins }] =
      await Promise.all([
        supabase
          .from("organ_assessments")
          .select("id")
          .eq("user_id", userId)
          .limit(1),
        supabase
          .from("uploaded_lab_files")
          .select("id")
          .eq("user_id", userId)
          .limit(1),
        supabase
          .from("daily_checkins")
          .select("id")
          .eq("user_id", userId)
          .limit(1),
      ]);

    const hasStarted =
      Boolean(assessments?.length) ||
      Boolean(reports?.length) ||
      Boolean(checkins?.length);

    const safeNextPath = getSafeNextPath();
    const redirectPath = safeNextPath || (hasStarted ? "/dashboard" : "/onboarding");

    showMessage(
      safeNextPath
        ? text(
            "Login successful. Returning you to your requested workspace...",
            "تم تسجيل الدخول. سيتم إعادتك إلى الصفحة المطلوبة..."
          )
        : hasStarted
        ? text(
            "Login successful. Redirecting to your dashboard...",
            "تم تسجيل الدخول. سيتم تحويلك إلى لوحة التحكم..."
          )
        : text(
            "Login successful. Redirecting to onboarding...",
            "تم تسجيل الدخول. سيتم تحويلك إلى صفحة البداية..."
          ),
      "success"
    );

    window.location.href = redirectPath;
  }

  async function handleResendVerification() {
    showMessage("", "");

    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier.includes("@")) {
      showMessage(
        text(
          "Please enter your email address to resend verification.",
          "يرجى إدخال البريد الإلكتروني لإعادة إرسال رسالة التأكيد."
        ),
        "error"
      );
      return;
    }

    setLoadingAction("resend");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: cleanIdentifier,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      showMessage(error.message, "error");
      setLoadingAction("");
      return;
    }

    showMessage(
      text(
        "Verification email sent. Please check your inbox or spam folder.",
        "تم إرسال رسالة التأكيد. يرجى فحص البريد الوارد أو الرسائل غير المرغوب بها."
      ),
      "success"
    );

    setLoadingAction("");
  }

  async function handleForgotPassword() {
    showMessage("", "");

    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier.includes("@")) {
      showMessage(
        text(
          "Please enter your email address to reset your password.",
          "يرجى إدخال البريد الإلكتروني لإعادة تعيين كلمة المرور."
        ),
        "error"
      );
      return;
    }

    setLoadingAction("forgot");

    const { error } = await supabase.auth.resetPasswordForEmail(cleanIdentifier, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      showMessage(error.message, "error");
      setLoadingAction("");
      return;
    }

    showMessage(
      text(
        "Password reset email sent. Please check your inbox or spam folder.",
        "تم إرسال رابط إعادة تعيين كلمة المرور. يرجى فحص البريد الوارد أو الرسائل غير المرغوب بها."
      ),
      "success"
    );

    setLoadingAction("");
  }

  return (
    <main
      className="ohPageShell loginCommandPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .loginCommandPage a {
          color: inherit;
          text-decoration: none;
        }

        .loginCommandPage .loginForm {
          display: grid;
          gap: 16px;
        }

        .loginCommandPage .ohContainer > .loginForm {
          padding: clamp(28px, 4vw, 44px);
          gap: 24px;
        }

        .loginCommandPage .ohContainer > .loginForm .ohTitle {
          font-size: clamp(2.2rem, 4vw, 3.35rem);
          line-height: 1;
        }

        .loginCommandPage .ohContainer > .loginForm .ohLead {
          max-width: 560px;
          font-size: 1.02rem;
          line-height: 1.7;
        }

        .loginCommandPage .loginField {
          display: grid;
          gap: 8px;
        }

        .loginCommandPage .loginField span {
          font-weight: 800;
          color: var(--oh-text);
          font-size: 0.94rem;
        }

        .loginCommandPage input[type="text"],
        .loginCommandPage input[type="password"] {
          width: 100%;
          min-height: 54px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.36);
          background: rgba(255, 255, 255, 0.94);
          color: var(--oh-text);
          padding: 12px 14px;
          font: inherit;
          font-size: 1rem;
          outline: none;
        }

        .loginCommandPage input:focus {
          border-color: rgba(20, 184, 166, 0.68);
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
        }

        .loginCommandPage .loginMessage {
          border-radius: 16px;
          padding: 13px 14px;
          line-height: 1.65;
          font-weight: 800;
        }

        .loginCommandPage .loginMessage.success {
          background: rgba(20, 184, 166, 0.1);
          color: #0f766e;
          border: 1px solid rgba(20, 184, 166, 0.28);
        }

        .loginCommandPage .loginMessage.error {
          background: rgba(239, 68, 68, 0.08);
          color: #b91c1c;
          border: 1px solid rgba(239, 68, 68, 0.22);
        }

        .loginCommandPage .loginSubmit {
          width: 100%;
          justify-content: center;
        }

        .loginCommandPage .loginSubmit {
          min-height: 54px;
          font-size: 1rem;
          font-weight: 900;
        }

        .loginCommandPage .primaryBtn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .loginCommandPage .loginDivider {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--oh-muted);
          font-size: 0.9rem;
          font-weight: 800;
        }

        .loginCommandPage .loginDivider::before,
        .loginCommandPage .loginDivider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: rgba(148, 163, 184, 0.28);
        }

                .loginCommandPage .loginTextAction {
          border: 0;
          background: transparent;
          color: #0f766e;
          font: inherit;
          font-weight: 850;
          cursor: pointer;
          padding: 4px;
          justify-self: center;
        }

        .loginCommandPage .loginTextAction.secondary {
          color: var(--oh-muted);
          font-size: 0.9rem;
        }

        .loginCommandPage .loginTextAction:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loginCommandPage .loginPrivacyNote {
          display: grid;
          gap: 4px;
          padding-top: 18px;
          border-top: 1px solid rgba(148, 163, 184, 0.22);
          color: var(--oh-muted);
          text-align: center;
          line-height: 1.55;
          font-size: 0.9rem;
        }

        .loginCommandPage .loginPrivacyNote strong {
          color: #0f766e;
        }

        @media (max-width: 760px) {
        }
      `}</style>

      <div
        className="ohContainer"
        style={{
          padding: "32px 0 64px",
          maxWidth: "760px",
        }}
      >
        <section className="ohCard loginForm">
          <div>
            <p className="ohEyebrow">
              {text("Sign in to OrganHeal", "تسجيل الدخول إلى OrganHeal")}
            </p>

            <h1 className="ohTitle" style={{ marginTop: "12px" }}>
              {text("Welcome back.", "مرحبًا بعودتك.")}
            </h1>

            <p className="ohLead" style={{ marginBottom: 0 }}>
              {text(
                "Access your private health workspace and continue where you left off.",
                "ادخل إلى مساحتك الصحية الخاصة وتابع من حيث توقفت."
              )}
            </p>
          </div>

          <form className="loginForm" onSubmit={handleLogin}>
            <label className="loginField">
              <span>
                {text(
                  "Email or username",
                  "البريد الإلكتروني أو اسم المستخدم"
                )}
              </span>

              <input
                type="text"
                placeholder={text(
                  "example@email.com or username",
                  "example@email.com أو اسم المستخدم"
                )}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label className="loginField">
              <span>{text("Password", "كلمة المرور")}</span>

              <input
                type="password"
                placeholder={text(
                  "Enter your password",
                  "أدخل كلمة المرور"
                )}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {message && (
              <p
                className={`loginMessage ${
                  messageType === "success" ? "success" : "error"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className="primaryBtn loginSubmit"
              disabled={loadingAction !== ""}
            >
              {loadingAction === "login"
                ? text("Signing in...", "جاري تسجيل الدخول...")
                : text("Sign In", "تسجيل الدخول")}
            </button>

            <button
              type="button"
              className="loginTextAction"
              onClick={handleForgotPassword}
              disabled={loadingAction !== ""}
            >
              {loadingAction === "forgot"
                ? text("Sending...", "جاري الإرسال...")
                : text("Forgot your password?", "نسيت كلمة المرور؟")}
            </button>

            <button
              type="button"
              className="loginTextAction secondary"
              onClick={handleResendVerification}
              disabled={loadingAction !== ""}
            >
              {loadingAction === "resend"
                ? text("Sending...", "جاري الإرسال...")
                : text(
                    "Didn't receive your verification email?",
                    "لم يصلك بريد تأكيد الحساب؟"
                  )}
            </button>

            <div className="loginDivider">
              <span>
                {text("New to OrganHeal?", "جديد على OrganHeal؟")}
              </span>
            </div>

            <Link
              href="/signup"
              className="secondaryBtn"
              style={{ justifyContent: "center" }}
            >
              {text("Create Free Account", "إنشاء حساب مجاني")}
            </Link>

            <p
              className="ohMetricHint"
              style={{
                textAlign: "center",
                margin: 0,
              }}
            >
              <Link href="/" style={{ color: "#0f766e", fontWeight: 850 }}>
                {text("Back to OrganHeal", "العودة إلى OrganHeal")}
              </Link>
            </p>
          </form>

          <div className="loginPrivacyNote">
            <strong>
              {text(
                "Private by design",
                "الخصوصية جزء من التصميم"
              )}
            </strong>

            <span>
              {text(
                "Your health workspace is connected to your account and protected by your sign-in.",
                "مساحتك الصحية مرتبطة بحسابك ومحمية بتسجيل الدخول."
              )}
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}




"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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

  async function resolveLoginEmail(cleanIdentifier: string) {
    if (cleanIdentifier.includes("@")) {
      return cleanIdentifier;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .ilike("username", cleanIdentifier)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (!profile?.email) {
      throw new Error(
        text(
          "Username not found. Please check your username or use your email.",
          "اسم المستخدم غير موجود. جرّب البريد الإلكتروني أو تأكد من الاسم."
        )
      );
    }

    return profile.email as string;
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

    let loginEmail = "";

    try {
      loginEmail = await resolveLoginEmail(cleanIdentifier);
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : text("Unable to find account.", "تعذر العثور على الحساب."),
        "error"
      );
      setLoadingAction("");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      if (error.message === "Invalid login credentials") {
        showMessage(
          text(
            "Incorrect email, username, or password. If you forgot your password, use Forgot Password below.",
            "البريد الإلكتروني أو اسم المستخدم أو كلمة المرور غير صحيحة. إذا نسيت كلمة المرور، استخدم خيار إعادة التعيين."
          ),
          "error"
        );
      } else {
        showMessage(error.message, "error");
      }

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
          min-height: 48px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.36);
          background: rgba(255, 255, 255, 0.94);
          color: var(--oh-text);
          padding: 12px 14px;
          font: inherit;
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

        .loginCommandPage .loginHelpActions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .loginCommandPage .loginHelpActions button {
          min-height: 44px;
          border: 1px solid rgba(148, 163, 184, 0.32);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.82);
          color: var(--oh-text);
          font-weight: 800;
          cursor: pointer;
          padding: 10px 12px;
        }

        .loginCommandPage .loginHelpActions button:hover:not(:disabled) {
          border-color: rgba(20, 184, 166, 0.52);
          color: #0f766e;
        }

        .loginCommandPage .loginHelpActions button:disabled,
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

        @media (max-width: 760px) {
          .loginCommandPage .loginHelpActions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Sign in to OrganHeal", "تسجيل الدخول إلى OrganHeal")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Return to your health analysis journey.",
                  "ارجع إلى رحلتك مع التحليل الصحي."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "Sign in to access your private health workspace. If you were redirected from a protected page, OrganHeal will return you there after login.",
                  "سجّل الدخول للوصول إلى مساحتك الصحية الخاصة. إذا تم تحويلك من صفحة محمية، سيعيدك OrganHeal إليها بعد الدخول."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/" className="secondaryBtn">
                  {text("Back Home", "العودة للرئيسية")}
                </Link>

                <Link href="/signup" className="primaryBtn">
                  {text("Create Free Account", "إنشاء حساب مجاني")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Smart login flow", "مسار دخول ذكي")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text("Email or username", "البريد أو اسم المستخدم")}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text("Secure", "آمن")}
                </span>
              </div>

              <div className="ohTimeline">
                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Login with email or username", "الدخول بالبريد أو اسم المستخدم")}
                  </p>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("New users go to onboarding", "المستخدم الجديد يذهب إلى صفحة البداية")}
                  </p>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Existing users return to dashboard", "المستخدم الحالي يعود إلى لوحة التحكم")}
                  </p>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Email confirmation is required", "تأكيد البريد مطلوب")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ohGrid cols2">
          <form className="ohCard loginForm" onSubmit={handleLogin}>
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Account login", "دخول الحساب")}
                </p>

                <h2 className="ohCardTitle">
                  {text("Access your dashboard", "الدخول إلى لوحة التحكم")}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Use your email or the username you selected during signup.",
                    "استخدم بريدك الإلكتروني أو اسم المستخدم الذي اخترته عند التسجيل."
                  )}
                </p>
              </div>
            </div>

            <label className="loginField">
              <span>{text("Email or username", "البريد الإلكتروني أو اسم المستخدم")}</span>
              <input
                type="text"
                placeholder={text(
                  "example@email.com or username",
                  "example@email.com أو username"
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
                placeholder={text("Enter your password", "اكتب كلمة المرور")}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {message && (
              <p className={`loginMessage ${messageType === "success" ? "success" : "error"}`}>
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
                : text("Login", "تسجيل الدخول")}
            </button>

            <div className="loginHelpActions">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loadingAction !== ""}
              >
                {loadingAction === "forgot"
                  ? text("Sending...", "جاري الإرسال...")
                  : text("Forgot Password?", "نسيت كلمة المرور؟")}
              </button>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={loadingAction !== ""}
              >
                {loadingAction === "resend"
                  ? text("Sending...", "جاري الإرسال...")
                  : text("Resend Verification Email", "إعادة إرسال التأكيد")}
              </button>
            </div>

            <div className="loginDivider">
              <span>{text("New to OrganHeal?", "جديد على OrganHeal؟")}</span>
            </div>

            <Link href="/signup" className="secondaryBtn" style={{ justifyContent: "center" }}>
              {text("Create Free Account", "إنشاء حساب مجاني")}
            </Link>

            <p className="ohMetricHint" style={{ textAlign: "center", margin: 0 }}>
              {text(
                "Need password reset only?",
                "تحتاج فقط إلى إعادة تعيين كلمة المرور؟"
              )}{" "}
              <Link href="/reset-password" style={{ color: "#0f766e", fontWeight: 900 }}>
                {text("Open reset page", "افتح صفحة إعادة التعيين")}
              </Link>
            </p>
          </form>

          <aside className="ohCard">
            <p className="ohMetricLabel">
              {text("What happens after login?", "ماذا يحدث بعد الدخول؟")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "OrganHeal sends you to the right next step.",
                "OrganHeal يوجهك إلى الخطوة المناسبة."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "If you already started with assessments, reports, or check-ins, you will return to the dashboard. If not, onboarding will help you choose your first action.",
                "إذا بدأت سابقًا بتقييمات أو تقارير أو تحديثات صحية، ستعود إلى لوحة التحكم. إذا لم تبدأ بعد، ستساعدك صفحة البداية على اختيار أول خطوة."
              )}
            </p>

            <div className="ohTimeline" style={{ marginTop: "18px" }}>
              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Dashboard", "لوحة التحكم")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "For users with existing health data.",
                      "للمستخدمين الذين لديهم بيانات صحية محفوظة."
                    )}
                  </p>
                </div>
              </div>

              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Onboarding", "صفحة البداية")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "For new users who still need a first step.",
                      "للمستخدمين الجدد الذين يحتاجون إلى أول خطوة."
                    )}
                  </p>
                </div>
              </div>

              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Email verification", "تأكيد البريد")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "Required before accessing the account.",
                      "مطلوب قبل الدخول إلى الحساب."
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
                  "OrganHeal provides educational and organizational health analysis only and does not replace licensed medical care.",
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

              <Link href="/medical-disclaimer" className="secondaryBtn">
                {text("Medical Disclaimer", "إخلاء المسؤولية")}
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}




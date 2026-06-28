"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "./login.css";

type Language = "en" | "ar";
type MessageType = "success" | "error" | "";
type LoadingAction = "login" | "forgot" | "resend" | "";

export default function LoginPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("");
  const [loadingAction, setLoadingAction] = useState<LoadingAction>("");

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";
      setLanguage(currentLanguage);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  function showMessage(text: string, type: MessageType) {
    setMessage(text);
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
        isArabic
          ? "اسم المستخدم غير موجود. جرّب البريد الإلكتروني أو تأكد من الاسم."
          : "Username not found. Please check your username or use your email."
      );
    }

    return profile.email;
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showMessage("", "");

    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier || !password) {
      showMessage(
        isArabic
          ? "يرجى إدخال البريد الإلكتروني أو اسم المستخدم وكلمة المرور."
          : "Please enter your email or username and password.",
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
        error instanceof Error ? error.message : "Unable to find account.",
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
          isArabic
            ? "البريد الإلكتروني أو اسم المستخدم أو كلمة المرور غير صحيحة."
            : "Incorrect email, username, or password. If you forgot your password, use Forgot Password below.",
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
        isArabic
          ? "يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول."
          : "Please confirm your email before signing in.",
        "error"
      );
      setLoadingAction("");
      return;
    }

    if (!data.user) {
      showMessage(
        isArabic
          ? "تعذر تسجيل الدخول. حاول مرة أخرى."
          : "Unable to sign in. Please try again.",
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

    showMessage(
      hasStarted
        ? isArabic
          ? "تم تسجيل الدخول. سيتم تحويلك إلى لوحة التحكم..."
          : "Login successful. Redirecting to your dashboard..."
        : isArabic
        ? "تم تسجيل الدخول. سيتم تحويلك إلى صفحة البداية..."
        : "Login successful. Redirecting to onboarding...",
      "success"
    );

    window.location.href = hasStarted ? "/dashboard" : "/onboarding";
  }

  async function handleResendVerification() {
    showMessage("", "");

    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier.includes("@")) {
      showMessage(
        isArabic
          ? "يرجى إدخال البريد الإلكتروني لإعادة إرسال رسالة التأكيد."
          : "Please enter your email address to resend verification.",
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
      isArabic
        ? "تم إرسال رسالة التأكيد. يرجى فحص البريد الوارد أو الرسائل غير المرغوب بها."
        : "Verification email sent. Please check your inbox or spam folder.",
      "success"
    );

    setLoadingAction("");
  }

  async function handleForgotPassword() {
    showMessage("", "");

    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier.includes("@")) {
      showMessage(
        isArabic
          ? "يرجى إدخال البريد الإلكتروني لإعادة تعيين كلمة المرور."
          : "Please enter your email address to reset your password.",
        "error"
      );
      return;
    }

    setLoadingAction("forgot");

    const { error } = await supabase.auth.resetPasswordForEmail(
      cleanIdentifier,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) {
      showMessage(error.message, "error");
      setLoadingAction("");
      return;
    }

    showMessage(
      isArabic
        ? "تم إرسال رابط إعادة تعيين كلمة المرور. يرجى فحص البريد الوارد أو الرسائل غير المرغوب بها."
        : "Password reset email sent. Please check your inbox or spam folder.",
      "success"
    );

    setLoadingAction("");
  }

  return (
    <main className="loginPage" dir={isArabic ? "rtl" : "ltr"}>
      <section className="loginShell">
        <Link href="/" className="loginClose" aria-label="Back to home">
          ×
        </Link>

        <div className="loginIntro">
          <p className="loginBadge">
            {isArabic ? "تسجيل الدخول" : "Sign in"}
          </p>

          <h1>
            {isArabic
              ? "ارجع إلى رحلتك الصحية"
              : "Return to your health journey"}
          </h1>

          <p>
            {isArabic
              ? "سجّل الدخول للوصول إلى لوحة التحكم، التقارير، مركز الذكاء الصحي، والخطة التالية. إذا كنت مستخدمًا جديدًا، سنوجهك إلى صفحة البداية."
              : "Sign in to access your dashboard, reports, Health Intelligence Center, and next step. New users will be guided to onboarding."}
          </p>

          <div className="loginValueList">
            <span>{isArabic ? "✓ دخول بالبريد أو اسم المستخدم" : "✓ Email or username login"}</span>
            <span>{isArabic ? "✓ المستخدم الجديد يبدأ من Onboarding" : "✓ New users start with onboarding"}</span>
            <span>{isArabic ? "✓ المستخدم الحالي يعود إلى Dashboard" : "✓ Existing users return to dashboard"}</span>
          </div>
        </div>

        <form className="loginFormCard" onSubmit={handleLogin}>
          <div className="loginFormHeader">
            <h2>{isArabic ? "دخول الحساب" : "Account login"}</h2>
            <p>
              {isArabic
                ? "استخدم بريدك الإلكتروني أو اسم المستخدم الذي اخترته عند التسجيل."
                : "Use your email or the username you selected during signup."}
            </p>
          </div>

          <label>
            <span>{isArabic ? "البريد الإلكتروني أو اسم المستخدم" : "Email or username"}</span>
            <input
              type="text"
              placeholder={isArabic ? "example@email.com أو username" : "example@email.com or username"}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            <span>{isArabic ? "كلمة المرور" : "Password"}</span>
            <input
              type="password"
              placeholder={isArabic ? "اكتب كلمة المرور" : "Enter your password"}
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
            className="loginSubmit"
            disabled={loadingAction !== ""}
          >
            {loadingAction === "login"
              ? isArabic
                ? "جاري تسجيل الدخول..."
                : "Signing in..."
              : isArabic
              ? "تسجيل الدخول"
              : "Login"}
          </button>

          <div className="loginHelpActions">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loadingAction !== ""}
            >
              {loadingAction === "forgot"
                ? isArabic
                  ? "جاري الإرسال..."
                  : "Sending..."
                : isArabic
                ? "نسيت كلمة المرور؟"
                : "Forgot Password?"}
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loadingAction !== ""}
            >
              {loadingAction === "resend"
                ? isArabic
                  ? "جاري الإرسال..."
                  : "Sending..."
                : isArabic
                ? "إعادة إرسال التأكيد"
                : "Resend Verification Email"}
            </button>
          </div>

          <div className="loginDivider">
            <span>{isArabic ? "مستخدم جديد؟" : "New to OrganHeal?"}</span>
          </div>

          <Link href="/signup" className="loginCreateAccount">
            {isArabic ? "إنشاء حساب مجاني" : "Create Free Account"}
          </Link>

          <small className="loginMedicalNote">
            {isArabic
              ? "OrganHeal يقدم معلومات تعليمية وتنظيمية فقط ولا يستبدل الطبيب أو الرعاية الطبية المرخصة."
              : "OrganHeal provides educational and organizational health intelligence only and does not replace licensed medical care."}
          </small>
        </form>
      </section>
    </main>
  );
}
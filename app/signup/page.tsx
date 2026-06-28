"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import "./signup.css";

type Language = "en" | "ar";
type MessageType = "success" | "error" | "";

export default function SignupPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("");
  const [loading, setLoading] = useState(false);

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

  const passwordStrong =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password);

  const strengthScore =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[a-z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0);

  const strengthText =
    strengthScore === 0
      ? ""
      : strengthScore === 1
      ? isArabic
        ? "ضعيف"
        : "Weak"
      : strengthScore === 2
      ? isArabic
        ? "متوسط"
        : "Fair"
      : strengthScore === 3
      ? isArabic
        ? "جيد"
        : "Good"
      : isArabic
      ? "قوي"
      : "Strong";

  function showMessage(text: string, type: MessageType) {
    setMessage(text);
    setMessageType(type);
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showMessage("", "");

    const cleanEmail = email.trim().toLowerCase();
    const cleanConfirmEmail = confirmEmail.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    if (cleanEmail !== cleanConfirmEmail) {
      showMessage(
        isArabic ? "البريد الإلكتروني غير متطابق." : "Emails do not match.",
        "error"
      );
      return;
    }

    if (password !== confirmPassword) {
      showMessage(
        isArabic ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.",
        "error"
      );
      return;
    }

    if (!passwordStrong) {
      showMessage(
        isArabic
          ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم."
          : "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
        "error"
      );
      return;
    }

    if (!terms) {
      showMessage(
        isArabic
          ? "يجب الموافقة على الشروط وسياسة الخصوصية قبل إنشاء الحساب."
          : "You must agree to the Terms and Privacy Policy before creating an account.",
        "error"
      );
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

    if (!usernameRegex.test(cleanUsername)) {
      showMessage(
        isArabic
          ? "اسم المستخدم يجب أن يكون من 3 إلى 20 حرفًا ويحتوي فقط على أحرف أو أرقام أو underscore."
          : "Username must be 3-20 characters and can only include letters, numbers, and underscores.",
        "error"
      );
      return;
    }

    setLoading(true);

    const { data: existingEmail, error: emailCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (emailCheckError) {
      showMessage(emailCheckError.message, "error");
      setLoading(false);
      return;
    }

    if (existingEmail) {
      showMessage(
        isArabic
          ? "هذا البريد الإلكتروني مسجل مسبقًا. يرجى تسجيل الدخول."
          : "This email is already registered. Please sign in instead.",
        "error"
      );
      setLoading(false);
      return;
    }

    const { data: existingUsername, error: usernameCheckError } =
      await supabase
        .from("profiles")
        .select("id")
        .ilike("username", cleanUsername)
        .maybeSingle();

    if (usernameCheckError) {
      showMessage(usernameCheckError.message, "error");
      setLoading(false);
      return;
    }

    if (existingUsername) {
      showMessage(
        isArabic ? "اسم المستخدم مستخدم بالفعل." : "This username is already taken.",
        "error"
      );
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          username: cleanUsername,
        },
      },
    });

    if (error) {
      showMessage(error.message, "error");
      setLoading(false);
      return;
    }

    showMessage(
      isArabic
        ? "تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني، ثم سجّل الدخول لبدء رحلة OrganHeal."
        : "Account created. Please confirm your email, then sign in to start your OrganHeal onboarding.",
      "success"
    );

    setEmail("");
    setConfirmEmail("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setTerms(false);
    setLoading(false);
  }

  return (
    <main className="signupPage" dir={isArabic ? "rtl" : "ltr"}>
      <section className="signupShell">
        <Link href="/" className="signupClose" aria-label="Back to home">
          ×
        </Link>

        <div className="signupIntro">
          <p className="signupBadge">
            {isArabic ? "ابدأ مجانًا" : "Start Free"}
          </p>

          <h1>
            {isArabic
              ? "أنشئ حسابك الصحي الذكي"
              : "Create your smart health account"}
          </h1>

          <p>
            {isArabic
              ? "احفظ تقييماتك وتقاريرك وابدأ رحلة OrganHeal بخطوة واضحة. بعد تأكيد البريد الإلكتروني، سنوجهك إلى صفحة البداية لاختيار أول خطوة."
              : "Save your assessments and reports, then begin your OrganHeal journey with a clear first step. After email confirmation, onboarding will guide you forward."}
          </p>

          <div className="signupValueList">
            <span>{isArabic ? "✓ تقييم صحي مجاني" : "✓ Free health assessment"}</span>
            <span>{isArabic ? "✓ رفع تقرير طبي" : "✓ Medical report upload"}</span>
            <span>{isArabic ? "✓ بداية ملفك الصحي" : "✓ Start your health profile"}</span>
          </div>
        </div>

        <form className="signupFormCard" onSubmit={handleSignup}>
          <div className="signupFormHeader">
            <h2>{isArabic ? "بيانات الحساب" : "Account details"}</h2>
            <p>
              {isArabic
                ? "استخدم بريدًا صحيحًا لأن رسالة التأكيد ستصل إليه."
                : "Use a valid email because the confirmation message will be sent there."}
            </p>
          </div>

          <div className="signupGrid">
            <label>
              <span>{isArabic ? "البريد الإلكتروني" : "Email"}</span>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label>
              <span>{isArabic ? "تأكيد البريد الإلكتروني" : "Confirm email"}</span>
              <input
                type="email"
                placeholder="name@example.com"
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
          </div>

          <label>
            <span>{isArabic ? "اسم المستخدم" : "Username"}</span>
            <input
              type="text"
              placeholder={isArabic ? "مثال: organ_user" : "Example: organ_user"}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
            <small>
              {isArabic
                ? "3-20 حرفًا. يمكن استخدام الأحرف والأرقام و underscore فقط."
                : "3-20 characters. Letters, numbers, and underscores only."}
            </small>
          </label>

          <div className="signupGrid">
            <label>
              <span>{isArabic ? "كلمة المرور" : "Password"}</span>
              <input
                type="password"
                placeholder={isArabic ? "كلمة مرور قوية" : "Strong password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            <label>
              <span>{isArabic ? "تأكيد كلمة المرور" : "Confirm password"}</span>
              <input
                type="password"
                placeholder={isArabic ? "أعد كتابة كلمة المرور" : "Repeat password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
          </div>

          {password && (
            <div className="signupStrength">
              <div>
                <span style={{ width: `${strengthScore * 25}%` }}></span>
              </div>
              <p>
                {isArabic ? "قوة كلمة المرور:" : "Password strength:"}{" "}
                <strong>{strengthText}</strong>
              </p>
            </div>
          )}

          <label className="signupTerms">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => setTerms(event.target.checked)}
            />
            <span>
              {isArabic ? "أوافق على " : "I agree to the "}
              <Link href="/terms">{isArabic ? "الشروط" : "Terms"}</Link>
              {isArabic ? " و " : " and "}
              <Link href="/privacy">
                {isArabic ? "سياسة الخصوصية" : "Privacy Policy"}
              </Link>
              .
            </span>
          </label>

          {message && (
            <p className={`signupMessage ${messageType === "success" ? "success" : "error"}`}>
              {message}
            </p>
          )}

          <button type="submit" className="signupSubmit" disabled={loading}>
            {loading
              ? isArabic
                ? "جاري إنشاء الحساب..."
                : "Creating account..."
              : isArabic
              ? "إنشاء حساب مجاني"
              : "Create Free Account"}
          </button>

          <p className="signupLoginLine">
            {isArabic ? "لديك حساب؟" : "Already have an account?"}{" "}
            <Link href="/login">{isArabic ? "تسجيل الدخول" : "Sign in"}</Link>
          </p>

          <small className="signupMedicalNote">
            {isArabic
              ? "OrganHeal يقدم معلومات تعليمية وتنظيمية فقط ولا يستبدل الطبيب أو الرعاية الطبية المرخصة."
              : "OrganHeal provides educational and organizational health intelligence only and does not replace licensed medical care."}
          </small>
        </form>
      </section>
    </main>
  );
}
"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";
type MessageType = "success" | "error" | "";

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
      ? text("Weak", "ضعيفة")
      : strengthScore === 2
      ? text("Fair", "متوسطة")
      : strengthScore === 3
      ? text("Good", "جيدة")
      : text("Strong", "قوية");

  const strengthTone =
    strengthScore <= 1 ? "risk" : strengthScore <= 3 ? "moderate" : "good";

  function showMessage(value: string, type: MessageType) {
    setMessage(value);
    setMessageType(type);
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showMessage("", "");

    const cleanEmail = email.trim().toLowerCase();
    const cleanConfirmEmail = confirmEmail.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    if (cleanEmail !== cleanConfirmEmail) {
      showMessage(text("Emails do not match.", "البريد الإلكتروني غير متطابق."), "error");
      return;
    }

    if (password !== confirmPassword) {
      showMessage(text("Passwords do not match.", "كلمتا المرور غير متطابقتين."), "error");
      return;
    }

    if (!passwordStrong) {
      showMessage(
        text(
          "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
          "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم."
        ),
        "error"
      );
      return;
    }

    if (!terms) {
      showMessage(
        text(
          "You must agree to the Terms and Privacy Policy before creating an account.",
          "يجب الموافقة على الشروط وسياسة الخصوصية قبل إنشاء الحساب."
        ),
        "error"
      );
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

    if (!usernameRegex.test(cleanUsername)) {
      showMessage(
        text(
          "Username must be 3-20 characters and can only include letters, numbers, and underscores.",
          "اسم المستخدم يجب أن يكون من 3 إلى 20 حرفًا ويحتوي فقط على أحرف أو أرقام أو underscore."
        ),
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
        text(
          "This email is already registered. Please sign in instead.",
          "هذا البريد الإلكتروني مسجل مسبقًا. يرجى تسجيل الدخول."
        ),
        "error"
      );
      setLoading(false);
      return;
    }

    const { data: existingUsername, error: usernameCheckError } = await supabase
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
        text("This username is already taken.", "اسم المستخدم مستخدم بالفعل."),
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
      text(
        "Account created. Please confirm your email, then sign in to start your OrganHeal onboarding.",
        "تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني، ثم سجل الدخول لبدء رحلة OrganHeal."
      ),
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
    <main
      className="ohPageShell signupCommandPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .signupCommandPage a {
          color: inherit;
          text-decoration: none;
        }

        .signupCommandPage .signupForm {
          display: grid;
          gap: 16px;
        }

        .signupCommandPage .signupGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .signupCommandPage .signupField {
          display: grid;
          gap: 8px;
        }

        .signupCommandPage .signupField span,
        .signupCommandPage .signupTerms span {
          font-weight: 800;
          color: var(--oh-text);
          font-size: 0.94rem;
        }

        .signupCommandPage input[type="email"],
        .signupCommandPage input[type="text"],
        .signupCommandPage input[type="password"] {
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

        .signupCommandPage input:focus {
          border-color: rgba(20, 184, 166, 0.68);
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
        }

        .signupCommandPage .signupHelp {
          color: var(--oh-muted);
          line-height: 1.55;
        }

        .signupCommandPage .signupStrength {
          display: grid;
          gap: 8px;
          padding: 12px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 16px;
          background: rgba(248, 250, 252, 0.78);
        }

        .signupCommandPage .signupStrengthBar {
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(148, 163, 184, 0.22);
        }

        .signupCommandPage .signupStrengthBar span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ef4444, #f59e0b, #14b8a6);
          transition: width 0.2s ease;
        }

        .signupCommandPage .signupTerms {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(248, 250, 252, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.22);
        }

        .signupCommandPage .signupTerms input {
          margin-top: 4px;
          width: 18px;
          height: 18px;
          accent-color: #14b8a6;
        }

        .signupCommandPage .signupTerms a {
          color: #0f766e;
          font-weight: 900;
        }

        .signupCommandPage .signupMessage {
          border-radius: 16px;
          padding: 13px 14px;
          line-height: 1.65;
          font-weight: 800;
        }

        .signupCommandPage .signupMessage.success {
          background: rgba(20, 184, 166, 0.1);
          color: #0f766e;
          border: 1px solid rgba(20, 184, 166, 0.28);
        }

        .signupCommandPage .signupMessage.error {
          background: rgba(239, 68, 68, 0.08);
          color: #b91c1c;
          border: 1px solid rgba(239, 68, 68, 0.22);
        }

        .signupCommandPage .signupSubmit {
          width: 100%;
          justify-content: center;
        }

        @media (max-width: 760px) {
          .signupCommandPage .signupGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Create your OrganHeal account", "إنشاء حساب OrganHeal")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Start your personal health intelligence journey.",
                  "ابدأ رحلتك مع الذكاء الصحي الشخصي."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "Create a free account to save your assessments, upload reports, and begin building your health profile inside OrganHeal.",
                  "أنشئ حسابًا مجانيًا لحفظ تقييماتك، رفع تقاريرك، وبدء بناء ملفك الصحي داخل OrganHeal."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/" className="secondaryBtn">
                  {text("Back Home", "العودة للرئيسية")}
                </Link>

                <Link href="/login" className="primaryBtn">
                  {text("Already have an account?", "لديك حساب؟")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Free account includes", "الحساب المجاني يشمل")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text("Your first health profile", "ملفك الصحي الأول")}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text("Free", "مجاني")}
                </span>
              </div>

              <div className="ohTimeline">
                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Free health assessment", "تقييم صحي مجاني")}
                  </p>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Medical report upload", "رفع تقرير طبي")}
                  </p>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Start your health profile", "بداية ملفك الصحي")}
                  </p>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Email confirmation for account safety", "تأكيد البريد لحماية الحساب")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ohGrid cols2">
          <form className="ohCard signupForm" onSubmit={handleSignup}>
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Account details", "بيانات الحساب")}
                </p>

                <h2 className="ohCardTitle">
                  {text("Create Free Account", "إنشاء حساب مجاني")}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Use a valid email because the confirmation message will be sent there.",
                    "استخدم بريدًا صحيحًا لأن رسالة التأكيد ستصل إليه."
                  )}
                </p>
              </div>
            </div>

            <div className="signupGrid">
              <label className="signupField">
                <span>{text("Email", "البريد الإلكتروني")}</span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="signupField">
                <span>{text("Confirm email", "تأكيد البريد الإلكتروني")}</span>
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

            <label className="signupField">
              <span>{text("Username", "اسم المستخدم")}</span>
              <input
                type="text"
                placeholder={text("Example: organ_user", "مثال: organ_user")}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
              <small className="signupHelp">
                {text(
                  "3-20 characters. Letters, numbers, and underscores only.",
                  "3-20 حرفًا. يمكن استخدام الأحرف والأرقام و underscore فقط."
                )}
              </small>
            </label>

            <div className="signupGrid">
              <label className="signupField">
                <span>{text("Password", "كلمة المرور")}</span>
                <input
                  type="password"
                  placeholder={text("Strong password", "كلمة مرور قوية")}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="signupField">
                <span>{text("Confirm password", "تأكيد كلمة المرور")}</span>
                <input
                  type="password"
                  placeholder={text("Repeat password", "أعد كتابة كلمة المرور")}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>
            </div>

            {password && (
              <div className="signupStrength">
                <div className="signupStrengthBar">
                  <span style={{ width: `${strengthScore * 25}%` }} />
                </div>

                <p className="ohMetricHint" style={{ margin: 0 }}>
                  {text("Password strength:", "قوة كلمة المرور:")}{" "}
                  <span className={`ohStatusBadge ${strengthTone}`}>{strengthText}</span>
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
                {text("I agree to the ", "أوافق على ")}
                <Link href="/terms">{text("Terms", "الشروط")}</Link>
                {text(" and ", " و ")}
                <Link href="/privacy">{text("Privacy Policy", "سياسة الخصوصية")}</Link>
                .
              </span>
            </label>

            {message && (
              <p className={`signupMessage ${messageType === "success" ? "success" : "error"}`}>
                {message}
              </p>
            )}

            {messageType === "success" && (
              <div className="ohButtonRow">
                <Link href="/login" className="primaryBtn">
                  {text("Go to Login", "اذهب لتسجيل الدخول")}
                </Link>

                <Link href="/" className="secondaryBtn">
                  {text("Back Home", "العودة للرئيسية")}
                </Link>
              </div>
            )}

            <button type="submit" className="primaryBtn signupSubmit" disabled={loading}>
              {loading
                ? text("Creating account...", "جاري إنشاء الحساب...")
                : text("Create Free Account", "إنشاء حساب مجاني")}
            </button>

            <p className="ohMetricHint" style={{ textAlign: "center", margin: 0 }}>
              {text("Already have an account?", "لديك حساب؟")}{" "}
              <Link href="/login" style={{ color: "#0f766e", fontWeight: 900 }}>
                {text("Sign in", "تسجيل الدخول")}
              </Link>
            </p>
          </form>

          <aside className="ohCard">
            <p className="ohMetricLabel">
              {text("What happens next?", "ماذا يحدث بعد التسجيل؟")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Confirm your email, then start onboarding.",
                "أكد بريدك الإلكتروني، ثم ابدأ صفحة البداية."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "After creating your account, check your email for the confirmation link. Once confirmed, sign in and OrganHeal will guide you to the first step.",
                "بعد إنشاء الحساب، افحص بريدك الإلكتروني لرابط التأكيد. بعد التأكيد، سجل الدخول وسيقودك OrganHeal إلى أول خطوة."
              )}
            </p>

            <div className="ohTimeline" style={{ marginTop: "18px" }}>
              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Step 1: Confirm email", "الخطوة 1: تأكيد البريد")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "This protects your account and health information.",
                      "هذا يحمي حسابك ومعلوماتك الصحية."
                    )}
                  </p>
                </div>
              </div>

              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Step 2: Sign in", "الخطوة 2: تسجيل الدخول")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "Use your email and password to access your dashboard.",
                      "استخدم بريدك وكلمة المرور للوصول إلى لوحة التحكم."
                    )}
                  </p>
                </div>
              </div>

              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Step 3: Start onboarding", "الخطوة 3: بدء صفحة البداية")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "Choose whether to start with assessment, report upload, or dashboard.",
                      "اختر البدء بالتقييم، رفع تقرير، أو لوحة التحكم."
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
              <Link href="/terms" className="secondaryBtn">
                {text("Terms", "الشروط")}
              </Link>

              <Link href="/privacy" className="secondaryBtn">
                {text("Privacy", "الخصوصية")}
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

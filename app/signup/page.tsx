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

        .signupCommandPage .ohContainer > .signupForm {
          width: min(100%, 720px);
          max-width: 100%;
          box-sizing: border-box;
          margin-inline: auto;
          padding: clamp(30px, 4vw, 46px);
          gap: 26px;
        }

        .signupCommandPage .ohContainer > .signupForm > div:first-child {
          display: grid;
          gap: 12px;
        }

        .signupCommandPage .ohContainer > .signupForm .ohTitle {
          font-size: clamp(2.25rem, 4vw, 3.4rem);
          line-height: 1.02;
          letter-spacing: -0.035em;
        }

        .signupCommandPage .ohContainer > .signupForm .ohLead {
          max-width: 590px;
          font-size: 1.02rem;
          line-height: 1.7;
        }

        .signupCommandPage .ohContainer > .signupForm > form {
          gap: 20px;
        }

        .signupCommandPage .signupGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .signupCommandPage .signupField {
          display: grid;
          gap: 8px;
          min-width: 0;
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
          box-sizing: border-box;
          min-width: 0;
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
          min-height: 54px;
          justify-content: center;
          font-size: 1rem;
          font-weight: 900;
        }

        @media (max-width: 760px) {
        .signupCommandPage .signupGrid {
          grid-template-columns: 1fr;
        }

        .signupCommandPage .ohContainer > .signupForm {
          padding: 24px 20px;
          gap: 22px;
        }

        .signupCommandPage .ohContainer > .signupForm .ohTitle {
          font-size: clamp(2rem, 10vw, 2.7rem);
        }
      }
      `}</style>

      <div
        className="ohContainer"
        style={{
          maxWidth: "760px",
          padding: "32px 0 64px",
        }}
      >
        <section className="ohCard signupForm">
          <div>
            <p className="ohEyebrow">
              {text(
                "CREATE YOUR ORGANHEAL ACCOUNT",
                "إنشاء حساب OrganHeal"
              )}
            </p>

            <h1 className="ohTitle">
              {text(
                "Start your health journey.",
                "ابدأ رحلتك الصحية."
              )}
            </h1>

            <p className="ohLead">
              {text(
                "Create your private account to save reports, health insights, and continue your journey over time.",
                "أنشئ حسابك الخاص لحفظ تقاريرك ورؤيتك الصحية ومواصلة رحلتك مع مرور الوقت."
              )}
            </p>
          </div>

          <form className="signupForm" onSubmit={handleSignup}>
            <div className="signupGrid">
              <label className="signupField">
                <span>
                  {text("Email", "البريد الإلكتروني")}
                </span>

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
                <span>
                  {text("Confirm email", "تأكيد البريد الإلكتروني")}
                </span>

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
              <span>
                {text("Username", "اسم المستخدم")}
              </span>

              <input
                type="text"
                placeholder={text(
                  "Example: organ_user",
                  "مثال: organ_user"
                )}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />

              <small className="signupHelp">
                {text(
                  "3-20 characters. Letters, numbers, and underscores only.",
                  "من 3 إلى 20 حرفًا. استخدم الأحرف والأرقام والشرطة السفلية فقط."
                )}
              </small>
            </label>

            <div className="signupGrid">
              <label className="signupField">
                <span>
                  {text("Password", "كلمة المرور")}
                </span>

                <input
                  type="password"
                  placeholder={text(
                    "Strong password",
                    "كلمة مرور قوية"
                  )}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="signupField">
                <span>
                  {text("Confirm password", "تأكيد كلمة المرور")}
                </span>

                <input
                  type="password"
                  placeholder={text(
                    "Repeat password",
                    "أعد كتابة كلمة المرور"
                  )}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  required
                />
              </label>
            </div>

            {password && (
              <div className="signupStrength">
                <div className="signupStrengthBar">
                  <span
                    style={{
                      width: `${strengthScore * 25}%`,
                    }}
                  />
                </div>

                <p
                  className="ohMetricHint"
                  style={{ margin: 0 }}
                >
                  {text(
                    "Password strength:",
                    "قوة كلمة المرور:"
                  )}{" "}
                  <span
                    className={`ohStatusBadge ${strengthTone}`}
                  >
                    {strengthText}
                  </span>
                </p>
              </div>
            )}

            <label className="signupTerms">
              <input
                type="checkbox"
                checked={terms}
                onChange={(event) =>
                  setTerms(event.target.checked)
                }
              />

              <span>
                {text("I agree to the ", "أوافق على ")}
                <Link href="/terms">
                  {text("Terms", "الشروط")}
                </Link>
                {text(" and ", " و")}
                <Link href="/privacy">
                  {text(
                    "Privacy Policy",
                    "سياسة الخصوصية"
                  )}
                </Link>
                .
              </span>
            </label>

            {message && (
              <p
                className={`signupMessage ${
                  messageType === "success"
                    ? "success"
                    : "error"
                }`}
              >
                {message}
              </p>
            )}

            {messageType === "success" && (
              <Link href="/login" className="primaryBtn">
                {text(
                  "Continue to Sign In",
                  "المتابعة إلى تسجيل الدخول"
                )}
              </Link>
            )}

            <button
              type="submit"
              className="primaryBtn signupSubmit"
              disabled={loading}
            >
              {loading
                ? text(
                    "Creating account...",
                    "جاري إنشاء الحساب..."
                  )
                : text(
                    "Create Free Account",
                    "إنشاء حساب مجاني"
                  )}
            </button>

            <p
              className="ohMetricHint"
              style={{
                textAlign: "center",
                margin: 0,
              }}
            >
              {text(
                "Already have an account?",
                "لديك حساب بالفعل؟"
              )}{" "}
              <Link
                href="/login"
                style={{
                  color: "#0f766e",
                  fontWeight: 900,
                }}
              >
                {text("Sign in", "تسجيل الدخول")}
              </Link>
            </p>

            <p
              className="ohMetricHint"
              style={{
                textAlign: "center",
                margin: 0,
              }}
            >
              <Link
                href="/"
                style={{
                  color: "#0f766e",
                  fontWeight: 850,
                }}
              >
                {text(
                  "Back to OrganHeal",
                  "العودة إلى OrganHeal"
                )}
              </Link>
            </p>
          </form>

          <div className="signupPrivacyNote">
            <strong>
              {text(
                "Private by design",
                "الخصوصية جزء من التصميم"
              )}
            </strong>

            <span>
              {text(
                "Your health workspace stays connected to your account. Email verification is required after signup to help protect access.",
                "تبقى مساحتك الصحية مرتبطة بحسابك. ويُطلب تأكيد البريد الإلكتروني بعد التسجيل للمساعدة في حماية الوصول إلى الحساب."
              )}
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}



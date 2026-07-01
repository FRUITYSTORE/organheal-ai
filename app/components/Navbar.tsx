"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import LanguageToggle from "./LanguageToggle";

type Language = "en" | "ar";

function OrganHealLogo() {
  return (
    <svg
      width={46}
      height={46}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OrganHeal logo"
    >
      <defs>
        <linearGradient id="ohGradient" x1="90" y1="380" x2="420" y2="110">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="50%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>

      <path
        d="M126 338 L126 190 L205 116 L282 91 L393 154"
        fill="none"
        stroke="url(#ohGradient)"
        strokeWidth={28}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M394 354 L302 406 L217 399 L126 338"
        fill="none"
        stroke="url(#ohGradient)"
        strokeWidth={28}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="393" cy="154" r="18" fill="#3B82F6" />
      <circle cx="126" cy="338" r="18" fill="#22C55E" />
      <circle cx="394" cy="354" r="18" fill="#3B82F6" />

      <text
        x="256"
        y="295"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="120"
        fontWeight="900"
        fill="#0F172A"
      >
        OH
      </text>
    </svg>
  );
}

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  const isArabic = language === "ar";

  const labels = {
    home: isArabic ? "الرئيسية" : "Home",
    features: isArabic ? "الميزات" : "Features",
    education: isArabic ? "مركز التعلّم" : "Learning Hub",
    about: isArabic ? "عن المنصة" : "About",
    dashboard: isArabic ? "لوحة التحكم" : "Dashboard",
    reports: isArabic ? "التقارير" : "Reports",
    intelligence: isArabic ? "تحليل التقارير" : "Analysis",
    healthPlan: isArabic ? "الخطة الصحية" : "Health Plan",
    history: isArabic ? "التاريخ الصحي" : "History",
    doctorPortal: isArabic ? "بوابة الطبيب" : "Doctor Portal",
    profile: isArabic ? "الملف الشخصي" : "Profile",
    more: isArabic ? "المزيد" : "More",
    createAccount: isArabic ? "إنشاء حساب" : "Create Account",
    signIn: isArabic ? "تسجيل الدخول" : "Sign In",
    signOut: isArabic ? "تسجيل الخروج" : "Sign Out",
    tagline: isArabic ? "ذكاء صحي مدعوم بالذكاء الاصطناعي" : "AI HEALTH INTELLIGENCE",
  };

  useEffect(() => {
    checkUser();

    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language | null) || "en";

    setLanguage(savedLanguage);
    document.documentElement.lang = savedLanguage;
    document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";

    function syncLanguage() {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(currentLanguage);
      document.documentElement.lang = currentLanguage;
      document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
    }

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  useEffect(() => {
    function closeMoreOnOutsideClick(event: MouseEvent) {
      if (!moreMenuRef.current) return;

      if (!moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }

    function closeMoreOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMoreOnOutsideClick);
    document.addEventListener("keydown", closeMoreOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeMoreOnOutsideClick);
      document.removeEventListener("keydown", closeMoreOnEscape);
    };
  }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    setIsLoggedIn(Boolean(data.user));
  }

  async function signOut() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsMoreOpen(false);
    window.location.href = "/";
  }

  function closeMore() {
    setIsMoreOpen(false);
  }

  return (
    <nav className="navbar" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .navMoreMenu {
          position: relative;
        }

        .navMoreTrigger {
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font: inherit;
          font-weight: 900;
          padding: 0;
        }

        .navMoreTrigger::after {
          content: "▾";
          margin-inline-start: 6px;
          font-size: 0.72rem;
          opacity: 0.78;
        }

        .navMorePanel {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          z-index: 80;
          min-width: 210px;
          display: grid;
          gap: 6px;
          padding: 10px;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.26);
          background: rgba(2, 6, 23, 0.96);
          box-shadow: 0 20px 50px rgba(2, 6, 23, 0.32);
        }

        [dir="rtl"] .navMorePanel {
          right: auto;
          left: 0;
        }

        .navMorePanel a {
          padding: 10px 12px;
          border-radius: 12px;
          white-space: nowrap;
        }

        .navMorePanel a:hover {
          background: rgba(20, 184, 166, 0.14);
        }

        @media (max-width: 900px) {
          .navMoreMenu {
            width: 100%;
          }

          .navMorePanel {
            position: static;
            min-width: 0;
            margin-top: 8px;
          }
        }
      `}</style>

      <Link href="/" className="logo" aria-label="OrganHeal home">
        <OrganHealLogo />

        <div className="logoText">
          <span>OrganHeal</span>
          <small>{labels.tagline}</small>
        </div>
      </Link>

      <div className="navLinks">
        {isLoggedIn ? (
          <>
            <Link href="/dashboard">{labels.dashboard}</Link>
            <Link href="/reports">{labels.reports}</Link>
            <Link href="/reports">{labels.intelligence}</Link>
            <Link href="/health-plan">{labels.healthPlan}</Link>
            <Link href="/library">{labels.education}</Link>

            <div className="navMoreMenu" ref={moreMenuRef}>
              <button
                type="button"
                className="navMoreTrigger"
                aria-expanded={isMoreOpen}
                aria-haspopup="menu"
                onClick={() => setIsMoreOpen((current) => !current)}
              >
                {labels.more}
              </button>

              {isMoreOpen && (
                <div className="navMorePanel" role="menu">
                  <Link href="/" onClick={closeMore}>
                    {labels.home}
                  </Link>

                  <Link href="/history" onClick={closeMore}>
                    {labels.history}
                  </Link>

                  <Link href="/doctor-portal" onClick={closeMore}>
                    {labels.doctorPortal}
                  </Link>

                  <Link href="/profile" onClick={closeMore}>
                    {labels.profile}
                  </Link>
                </div>
              )}
            </div>

            <LanguageToggle />

            <button type="button" className="navLogoutBtn" onClick={signOut}>
              {labels.signOut}
            </button>
          </>
        ) : (
          <>
            <Link href="/">{labels.home}</Link>
            <Link href="/features">{labels.features}</Link>
            <Link href="/library">{labels.education}</Link>
            <Link href="/about">{labels.about}</Link>

            <LanguageToggle />

            <Link href="/signup" className="navPrimaryBtn">
              {labels.createAccount}
            </Link>

            <Link href="/login" className="navSigninBtn">
              {labels.signIn}
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}




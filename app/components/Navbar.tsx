"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";
import LanguageToggle from "./LanguageToggle";
import NotificationBell from "./notifications/NotificationBell";

type Language =
  | "en"
  | "ar";

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
        <linearGradient
          id="ohGradient"
          x1="90"
          y1="380"
          x2="420"
          y2="110"
        >
          <stop
            offset="0%"
            stopColor="#22C55E"
          />

          <stop
            offset="50%"
            stopColor="#14B8A6"
          />

          <stop
            offset="100%"
            stopColor="#3B82F6"
          />
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

      <circle
        cx="393"
        cy="154"
        r="18"
        fill="#3B82F6"
      />

      <circle
        cx="126"
        cy="338"
        r="18"
        fill="#22C55E"
      />

      <circle
        cx="394"
        cy="354"
        r="18"
        fill="#3B82F6"
      />

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
  const pathname =
    usePathname();

  const [
    isLoggedIn,
    setIsLoggedIn,
  ] =
    useState(false);

  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "en"
    );

  const [
    isMoreOpen,
    setIsMoreOpen,
  ] =
    useState(false);

  const [
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  ] =
    useState(false);

  const moreMenuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const isArabic =
    language ===
    "ar";

  const text = (
    en: string,
    ar: string
  ) =>
    isArabic
      ? ar
      : en;

  const labels = {
    home:
      text(
        "Home",
        "الرئيسية"
      ),

    ask:
      text(
        "Ask AI",
        "اسأل AI"
      ),

    myHealth:
      text(
        "My Health",
        "صحتي"
      ),

    reports:
      text(
        "Reports",
        "تقاريري"
      ),

    learn:
      text(
        "Learn",
        "تعلّم"
      ),

    howItWorks:
      text(
        "How It Works",
        "كيف يعمل"
      ),

    about:
      text(
        "About",
        "عن OrganHeal"
      ),

    pricing:
      text(
        "Pricing",
        "الأسعار"
      ),

    more:
      text(
        "More",
        "المزيد"
      ),

    healthPlan:
      text(
        "Health Plan",
        "الخطة الصحية"
      ),

    history:
      text(
        "Health History",
        "السجل الصحي"
      ),

    doctorPrep:
      text(
        "Doctor Preparation",
        "التحضير للطبيب"
      ),

    profile:
      text(
        "Profile",
        "الملف الشخصي"
      ),

    communications:
      text(
        "Communication Settings",
        "إعدادات التواصل"
      ),

    signIn:
      text(
        "Sign In",
        "تسجيل الدخول"
      ),

    startFree:
      text(
        "Start Free",
        "ابدأ مجانًا"
      ),

    signOut:
      text(
        "Sign Out",
        "تسجيل الخروج"
      ),

    tagline:
      text(
        "AI HEALTH INTELLIGENCE",
        "ذكاء صحي مدعوم بالذكاء الاصطناعي"
      ),

    openMenu:
      text(
        "Open navigation menu",
        "فتح قائمة التنقل"
      ),
  };

  useEffect(
    () => {
      void checkUser();

      const savedLanguage =
        (
          localStorage.getItem(
            "organheal-language"
          ) as
            | Language
            | null
        ) ??
        "en";

      setLanguage(
        savedLanguage
      );

      document.documentElement.lang =
        savedLanguage;

      document.documentElement.dir =
        savedLanguage ===
        "ar"
          ? "rtl"
          : "ltr";

      function syncLanguage() {
        const currentLanguage =
          (
            localStorage.getItem(
              "organheal-language"
            ) as
              | Language
              | null
          ) ??
          "en";

        setLanguage(
          currentLanguage
        );

        document.documentElement.lang =
          currentLanguage;

        document.documentElement.dir =
          currentLanguage ===
          "ar"
            ? "rtl"
            : "ltr";
      }

      window.addEventListener(
        "storage",
        syncLanguage
      );

      window.addEventListener(
        "organheal-language-change",
        syncLanguage
      );

      const {
        data: {
          subscription,
        },
      } =
        supabase.auth
          .onAuthStateChange(
            (
              _event,
              session
            ) => {
              setIsLoggedIn(
                Boolean(
                  session
                    ?.user
                )
              );
            }
          );

      return () => {
        subscription
          .unsubscribe();

        window.removeEventListener(
          "storage",
          syncLanguage
        );

        window.removeEventListener(
          "organheal-language-change",
          syncLanguage
        );
      };
    },
    []
  );

  useEffect(
    () => {
      function closeOnOutsideClick(
        event: MouseEvent
      ) {
        if (
          moreMenuRef
            .current &&
          !moreMenuRef
            .current
            .contains(
              event.target as Node
            )
        ) {
          setIsMoreOpen(
            false
          );
        }
      }

      function closeOnEscape(
        event: KeyboardEvent
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          setIsMoreOpen(
            false
          );

          setIsMobileMenuOpen(
            false
          );
        }
      }

      document.addEventListener(
        "mousedown",
        closeOnOutsideClick
      );

      document.addEventListener(
        "keydown",
        closeOnEscape
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          closeOnOutsideClick
        );

        document.removeEventListener(
          "keydown",
          closeOnEscape
        );
      };
    },
    []
  );

  useEffect(
    () => {
      setIsMobileMenuOpen(
        false
      );

      setIsMoreOpen(
        false
      );
    },
    [
      pathname,
    ]
  );

  async function checkUser() {
    const {
      data,
    } =
      await supabase.auth
        .getUser();

    setIsLoggedIn(
      Boolean(
        data.user
      )
    );
  }

  async function signOut() {
    await supabase.auth
      .signOut();

    setIsLoggedIn(
      false
    );

    setIsMoreOpen(
      false
    );

    setIsMobileMenuOpen(
      false
    );

    window.location.href =
      "/";
  }

  function closeMenus() {
    setIsMoreOpen(
      false
    );

    setIsMobileMenuOpen(
      false
    );
  }

  function routeClass(
    href: string
  ) {
    if (
      href ===
      "/"
    ) {
      return pathname ===
        "/"
        ? "navRouteActive"
        : "";
    }

    return pathname
      ?.startsWith(
        href
      )
      ? "navRouteActive"
      : "";
  }

  return (
    <nav
      className="navbar organHealNavbar"
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
    >
      <style>{`
        .organHealNavbar {
          gap: 18px;
        }

        .organHealNavbar .navLinks {
          flex-wrap: nowrap;
          gap: 12px;
        }

        .organHealNavbar .navLinks > a,
        .organHealNavbar .navMoreTrigger {
          position: relative;
          white-space: nowrap;
        }

        .organHealNavbar .navRouteActive {
          color: #ffffff !important;
        }

        .organHealNavbar .navRouteActive::after {
          content: "";
          position: absolute;
          inset-inline: 18%;
          bottom: -8px;
          height: 2px;
          border-radius: 999px;
          background: #5eead4;
        }

        .organHealNavbar .navAskLink {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(135deg, #22d3ee, #0ea5e9);
          color: #01111e;
          font-weight: 900;
          box-shadow: 0 6px 20px rgba(34, 211, 238, 0.32);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .organHealNavbar .navAskLink:hover {
          transform: translateY(-1px);
          color: #01111e;
          box-shadow: 0 10px 28px rgba(34, 211, 238, 0.44);
        }

        .organHealNavbar .navAskLink.navRouteActive {
          color: #01111e !important;
        }

        .organHealNavbar .navAskLink.navRouteActive::after {
          display: none;
        }

        @media (max-width: 900px) {
          .organHealNavbar .navLinks .navAskLink {
            display: none;
          }
        }

        .organHealNavbar .navMoreMenu {
          position: relative;
        }

        .organHealNavbar .navMoreTrigger {
          appearance: none;
          border: 0;
          background: transparent;
          color: #67e8f9;
          cursor: pointer;
          font: inherit;
          font-size: 0.92rem;
          font-weight: 700;
          padding: 0;
        }

        .organHealNavbar .navMoreTrigger:hover {
          color: white;
        }

        .organHealNavbar .navMoreTrigger::after {
          content: "▾";
          margin-inline-start: 6px;
          font-size: 0.72rem;
          opacity: 0.78;
        }

        .organHealNavbar .navMorePanel {
          position: absolute;
          top: calc(100% + 16px);
          inset-inline-end: 0;
          z-index: 80;
          min-width: 230px;
          display: grid;
          gap: 5px;
          padding: 10px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 18px;
          background: rgba(2, 6, 23, 0.98);
          box-shadow: 0 22px 56px rgba(2, 6, 23, 0.42);
        }

        .organHealNavbar .navMorePanel a,
        .organHealNavbar .navMorePanel button {
          width: 100%;
          padding: 10px 12px;
          border-radius: 11px;
          background: transparent;
          color: #cbd5e1;
          text-align: start;
          white-space: nowrap;
          font-size: 0.88rem;
          font-weight: 750;
        }

        .organHealNavbar .navMorePanel a:hover,
        .organHealNavbar .navMorePanel button:hover {
          background: rgba(20, 184, 166, 0.14);
          color: white;
          transform: none;
          box-shadow: none;
        }

        .organHealNavbar .navMoreDivider {
          height: 1px;
          margin: 4px 6px;
          background: rgba(148, 163, 184, 0.18);
        }

        .organHealNavbar .navSignOutMenu {
          border: 0;
          cursor: pointer;
        }

        .organHealNavbar .navMobileCta,
        .organHealNavbar .navMobileTrigger {
          display: none;
        }

        .organHealNavbar .navMobileTrigger {
          width: 44px;
          height: 44px;
          padding: 10px;
          border: 1px solid rgba(94, 234, 212, 0.32);
          border-radius: 13px;
          background: rgba(15, 23, 42, 0.75);
          color: #67e8f9;
        }

        .organHealNavbar .navMobileTrigger span {
          display: block;
          width: 100%;
          height: 2px;
          margin: 5px 0;
          border-radius: 999px;
          background: currentColor;
        }

        @media (max-width: 1080px) {
          .organHealNavbar .logoText small {
            display: none;
          }

          .organHealNavbar .navLinks {
            gap: 10px;
          }
        }

        @media (max-width: 900px) {
          .organHealNavbar {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
          }

          .organHealNavbar .navMobileCta {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 42px;
            margin-inline-start: auto;
            padding: 0 14px;
            border-radius: 13px;
            background: linear-gradient(
              135deg,
              #22d3ee,
              #38bdf8
            );
            color: #07111f;
            font-size: 0.84rem;
            font-weight: 900;
            text-decoration: none;
            white-space: nowrap;
          }

          .organHealNavbar .navMobileTrigger {
            display: block;
          }

          .organHealNavbar .navLinks {
            display: none;
            width: 100%;
          }

          .organHealNavbar .navLinks.navLinksOpen {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
            padding-top: 12px;
          }

          .organHealNavbar .navLinks.navLinksOpen > a {
            width: 100%;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px 12px;
            border-radius: 12px;
            text-align: center;
          }

          .organHealNavbar .navRouteActive::after {
            display: none;
          }

          .organHealNavbar .navMoreMenu {
            width: 100%;
          }

          .organHealNavbar .navMoreTrigger {
            width: 100%;
            min-height: 44px;
            text-align: center;
          }

          .organHealNavbar .navMorePanel {
            position: static;
            min-width: 0;
            margin-top: 6px;
          }

          .organHealNavbar .languageToggleBtn {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .organHealNavbar .logoText {
            display: none;
          }

          .organHealNavbar .navMobileCta {
            padding-inline: 11px;
          }
        }
      `}</style>

      <Link
        href="/"
        className="logo"
        aria-label="OrganHeal home"
        onClick={
          closeMenus
        }
      >
        <OrganHealLogo />

        <div className="logoText">
          <span>
            OrganHeal
          </span>

          <small>
            {
              labels.tagline
            }
          </small>
        </div>
      </Link>

      <Link
        href={
          isLoggedIn
            ? "/assistant"
            : "/#ask-organheal"
        }
        className="navMobileCta"
        onClick={
          closeMenus
        }
      >
        {
          labels.ask
        }
      </Link>

      <button
        type="button"
        className="navMobileTrigger"
        aria-label={
          labels.openMenu
        }
        aria-expanded={
          isMobileMenuOpen
        }
        onClick={
          () =>
            setIsMobileMenuOpen(
              current =>
                !current
            )
        }
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={
          `navLinks ${
            isMobileMenuOpen
              ? "navLinksOpen"
              : ""
          }`
        }
      >
        {isLoggedIn
          ? (
            <>
              <Link
                href="/assistant"
                className={
                  `navAskLink ${
                    routeClass(
                      "/assistant"
                    )
                  }`
                }
                onClick={
                  closeMenus
                }
              >
                {
                  labels.ask
                }
              </Link>

              <Link
                href="/dashboard"
                className={
                  routeClass(
                    "/dashboard"
                  )
                }
                onClick={
                  closeMenus
                }
              >
                {
                  labels.myHealth
                }
              </Link>

              <Link
                href="/reports"
                className={
                  routeClass(
                    "/reports"
                  )
                }
                onClick={
                  closeMenus
                }
              >
                {
                  labels.reports
                }
              </Link>

              <Link
                href="/library"
                className={
                  routeClass(
                    "/library"
                  )
                }
                onClick={
                  closeMenus
                }
              >
                {
                  labels.learn
                }
              </Link>

              <div
                className="navMoreMenu"
                ref={
                  moreMenuRef
                }
              >
                <button
                  type="button"
                  className="navMoreTrigger"
                  aria-expanded={
                    isMoreOpen
                  }
                  aria-haspopup="menu"
                  onClick={
                    () =>
                      setIsMoreOpen(
                        current =>
                          !current
                      )
                  }
                >
                  {
                    labels.more
                  }
                </button>

                {isMoreOpen && (
                  <div
                    className="navMorePanel"
                    role="menu"
                  >
                    <Link
                      href="/health-plan"
                      onClick={
                        closeMenus
                      }
                    >
                      {
                        labels.healthPlan
                      }
                    </Link>

                    <Link
                      href="/history"
                      onClick={
                        closeMenus
                      }
                    >
                      {
                        labels.history
                      }
                    </Link>

                    <Link
                      href="/library/doctor-prep"
                      onClick={
                        closeMenus
                      }
                    >
                      {
                        labels.doctorPrep
                      }
                    </Link>

                    <Link
                      href="/profile"
                      onClick={
                        closeMenus
                      }
                    >
                      {
                        labels.profile
                      }
                    </Link>

                    <Link
                      href="/pricing"
                      onClick={
                        closeMenus
                      }
                    >
                      {
                        labels.pricing
                      }
                    </Link>

                    <Link
                      href="/settings/communications"
                      onClick={
                        closeMenus
                      }
                    >
                      {
                        labels.communications
                      }
                    </Link>

                    <div className="navMoreDivider" />

                    <button
                      type="button"
                      className="navSignOutMenu"
                      onClick={
                        signOut
                      }
                    >
                      {
                        labels.signOut
                      }
                    </button>
                  </div>
                )}
              </div>

              <NotificationBell
                isArabic={
                  isArabic
                }
              />

              <LanguageToggle />
            </>
          )
          : (
            <>
              <Link
                href="/#ask-organheal"
                className="navAskLink"
                onClick={
                  closeMenus
                }
              >
                {
                  text(
                    "Ask OrganHeal AI",
                    "اسأل OrganHeal AI"
                  )
                }
              </Link>

              <Link
                href="/library"
                className={
                  routeClass(
                    "/library"
                  )
                }
                onClick={
                  closeMenus
                }
              >
                {
                  labels.learn
                }
              </Link>

              <Link
                href="/features"
                className={
                  routeClass(
                    "/features"
                  )
                }
                onClick={
                  closeMenus
                }
              >
                {
                  labels.howItWorks
                }
              </Link>

              <Link
                href="/about"
                className={
                  routeClass(
                    "/about"
                  )
                }
                onClick={
                  closeMenus
                }
              >
                {
                  labels.about
                }
              </Link>

              <Link
                href="/pricing"
                className={
                  routeClass(
                    "/pricing"
                  )
                }
                onClick={
                  closeMenus
                }
              >
                {
                  labels.pricing
                }
              </Link>

              <LanguageToggle />

              <Link
                href="/login"
                className="navSigninBtn"
                onClick={
                  closeMenus
                }
              >
                {
                  labels.signIn
                }
              </Link>

              <Link
                href="/signup"
                className="navPrimaryBtn"
                onClick={
                  closeMenus
                }
              >
                {
                  labels.startFree
                }
              </Link>
            </>
          )}
      </div>
    </nav>
  );
}
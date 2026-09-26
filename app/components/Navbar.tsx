"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { supabase } from "../../lib/supabase";
import LanguageToggle from "./LanguageToggle";
import NotificationBell from "./notifications/NotificationBell";
import NavIcon, { type NavIconName } from "./navigation/NavIcons";
import ThemeToggle from "./theme/ThemeToggle";

import "./navigation/navbar.css";

type Language = "en" | "ar";

type NavItem = {
  href: string;
  label: string;
  subtitle: string;
  icon: NavIconName;
};

function OrganHealLogo({ size = 44 }: { size?: number }) {
  const gradientId = `ohGradient${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OrganHeal logo"
      role="img"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="90"
          y1="380"
          x2="420"
          y2="110"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="50%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>

      <path
        d="M126 338 L126 190 L205 116 L282 91 L393 154"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={28}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M394 354 L302 406 L217 399 L126 338"
        fill="none"
        stroke={`url(#${gradientId})`}
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
        style={{ fill: "var(--nav-logo-ink, #0F172A)" }}
      >
        OH
      </text>
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsMobileMenuOpen(false);
    setIsMoreOpen(false);
  }

  const isArabic = language === "ar";

  const text = (en: string, ar: string) => (isArabic ? ar : en);

  const askLabel = text("Ask OrganHeal AI", "اسأل OrganHeal AI");
  const askHref = isLoggedIn ? "/assistant" : "/#ask-organheal";

  const homeItem: NavItem = {

    href: "/",

    label: text("Home", "الرئيسية"),

    subtitle: text("Ask, upload and explore", "اسأل وارفع واستكشف"),

    icon: "home",

  };


  const visitorItems: NavItem[] = [
    {
      href: "/library",
      label: text("Learn", "تعلّم"),
      subtitle: text(
        "Health education for a better you",
        "تثقيف صحي لحياة أفضل"
      ),
      icon: "learn",
    },
    {
      href: "/features",
      label: text("How It Works", "كيف يعمل"),
      subtitle: text("Simple. Secure. Personal.", "بسيط. آمن. شخصي."),
      icon: "gear",
    },
    {
      href: "/about",
      label: text("About", "عن OrganHeal"),
      subtitle: text("Our mission and story", "رسالتنا وقصتنا"),
      icon: "users",
    },
    {
      href: "/pricing",
      label: text("Pricing", "الأسعار"),
      subtitle: text("Choose the right plan", "اختر الخطة المناسبة"),
      icon: "tag",
    },
  ];

  const memberItems: NavItem[] = [
    {
      href: "/dashboard",
      label: text("My Health", "صحتي"),
      subtitle: text("Your health overview", "نظرة عامة على صحتك"),
      icon: "dashboard",
    },
    {
      href: "/reports",
      label: text("Reports", "تقاريري"),
      subtitle: text("Upload and analyze reports", "ارفع تقاريرك وحلّلها"),
      icon: "reports",
    },
    {
      href: "/library",
      label: text("Learn", "تعلّم"),
      subtitle: text(
        "Health education for a better you",
        "تثقيف صحي لحياة أفضل"
      ),
      icon: "learn",
    },
    {
      href: "/health-plan",
      label: text("Health Plan", "الخطة الصحية"),
      subtitle: text("Your personal follow-up plan", "خطة متابعتك الشخصية"),
      icon: "plan",
    },
  ];

  const memberMoreItems: NavItem[] = [
    {
      href: "/history",
      label: text("Health History", "السجل الصحي"),
      subtitle: "",
      icon: "history",
    },
    {
      href: "/library/doctor-prep",
      label: text("Doctor Preparation", "التحضير للطبيب"),
      subtitle: "",
      icon: "stethoscope",
    },
    {
      href: "/doctor-portal",
      label: text("Doctor Brief & Visit Notes", "ملخص الطبيب وملاحظات الزيارة"),
      subtitle: "",
      icon: "notes",
    },
    {
      href: "/profile",
      label: text("Profile", "الملف الشخصي"),
      subtitle: "",
      icon: "user",
    },
    {
      href: "/pricing",
      label: text("Pricing", "الأسعار"),
      subtitle: "",
      icon: "tag",
    },
    {
      href: "/settings/communications",
      label: text("Communication Settings", "إعدادات التواصل"),
      subtitle: "",
      icon: "bell",
    },
  ];

  // The desktop bar keeps the first three member items inline; Health Plan
  // and everything else lives in the More menu, as before.
  const desktopMemberItems = memberItems.slice(0, 3);
  const desktopMoreItems = [memberItems[3], ...memberMoreItems];

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(Boolean(data.user));
    });

    function syncLanguage() {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language | null) ??
        "en";

      setLanguage(currentLanguage);

      document.documentElement.lang = currentLanguage;
      document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();

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
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", trapFocus);

    return () => {
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [isMobileMenuOpen]);

  async function signOut() {
    await supabase.auth.signOut();

    setIsLoggedIn(false);
    setIsMoreOpen(false);
    setIsMobileMenuOpen(false);

    window.location.href = "/";
  }

  function closeMenus() {
    setIsMoreOpen(false);
    setIsMobileMenuOpen(false);
  }

  function isActive(href: string) {
    return pathname === href;
  }

  function linkProps(href: string) {
    return {
      href,
      onClick: closeMenus,
      "aria-current": isActive(href) ? ("page" as const) : undefined,
    };
  }

  function renderRow(item: NavItem, compact = false) {
    return (
      <Link
        key={`${item.href}-${item.label}`}
        {...linkProps(item.href)}
        className={`ohNavRow${compact ? " ohNavRowCompact" : ""}`}
      >
        <span className="ohNavRowIcon">
          <NavIcon name={item.icon} size={compact ? 20 : 24} />
        </span>

        <span className="ohNavRowText">
          <span className="ohNavRowTitle">{item.label}</span>
          {item.subtitle && (
            <span className="ohNavRowSubtitle">{item.subtitle}</span>
          )}
        </span>

        <NavIcon name="chevron" size={18} className="ohNavDirectional" />
      </Link>
    );
  }

  const wordmark = (
    <span className="ohNavWordmark">
      Organ<span>Heal</span>
    </span>
  );

  return (
    <header className="ohNav" dir={isArabic ? "rtl" : "ltr"}>
      <nav className={`ohNavInner${isLoggedIn ? " ohNavLoggedIn" : ""}`} aria-label={text("Main navigation", "التنقل الرئيسي")}>
        <Link
          href="/"
          className="ohNavBrand"
          aria-label={text("OrganHeal home", "OrganHeal الصفحة الرئيسية")}
          onClick={closeMenus}
        >
          <OrganHealLogo />
          {wordmark}
        </Link>

        <div className="ohNavCenter">
          <Link {...linkProps(homeItem.href)} className="ohNavLink">
            {homeItem.label}
          </Link>

          {isLoggedIn ? (
            <>
              {desktopMemberItems.map((item) => (
                <Link
                  key={item.href}
                  {...linkProps(item.href)}
                  className="ohNavLink"
                >
                  {item.label}
                </Link>
              ))}

              <div className="ohNavMore" ref={moreMenuRef}>
                <button
                  type="button"
                  className="ohNavLink ohNavMoreTrigger"
                  aria-expanded={isMoreOpen}
                  aria-controls="oh-nav-more-panel"
                  onClick={() => setIsMoreOpen((current) => !current)}
                >
                  {text("More", "المزيد")}
                  <NavIcon name="chevronDown" size={14} />
                </button>

                {isMoreOpen && (
                  <div className="ohNavPopover" id="oh-nav-more-panel">
                    {desktopMoreItems.map((item) => (
                      <Link
                        key={`${item.href}-${item.label}`}
                        {...linkProps(item.href)}
                        className="ohNavPopoverItem"
                      >
                        <NavIcon name={item.icon} size={18} />
                        <span>{item.label}</span>
                      </Link>
                    ))}

                    <div className="ohNavPopoverDivider" />

                    <button
                      type="button"
                      className="ohNavPopoverItem"
                      onClick={signOut}
                    >
                      <NavIcon name="logout" size={18} />
                      <span>{text("Sign Out", "تسجيل الخروج")}</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            visitorItems.map((item) => (
              <Link
                key={item.href}
                {...linkProps(item.href)}
                className="ohNavLink"
              >
                {item.label}
              </Link>
            ))
          )}
        </div>

        <div className="ohNavActions">
          <Link href={askHref} className="ohNavAsk" onClick={closeMenus}>
            <NavIcon name="sparkle" size={18} />
            <span className="ohNavAskLong">{askLabel}</span>
            <span className="ohNavAskShort">{text("Ask AI", "اسأل AI")}</span>
          </Link>

          {isLoggedIn && <NotificationBell isArabic={isArabic} />}

          <LanguageToggle variant="compact" />
          <ThemeToggle isArabic={isArabic} variant="menu" />

          {!isLoggedIn && (
            <>
              <Link href="/login" className="ohNavSignIn" onClick={closeMenus}>
                {text("Sign In", "تسجيل الدخول")}
              </Link>

              <Link href="/signup" className="ohNavStart" onClick={closeMenus}>
                {text("Start Free", "ابدأ مجانًا")}
              </Link>
            </>
          )}
        </div>

        <div className="ohNavMobileBar">
          <Link href={askHref} className="ohNavAsk ohNavAskCompact" onClick={closeMenus}>
            <NavIcon name="sparkle" size={18} />
            <span>{text("Ask AI", "اسأل AI")}</span>
          </Link>

          {isLoggedIn && <NotificationBell isArabic={isArabic} />}

          <button
            ref={menuButtonRef}
            type="button"
            className="ohNavMenuButton"
            aria-label={text("Open navigation menu", "فتح قائمة التنقل")}
            aria-expanded={isMobileMenuOpen}
            aria-controls="oh-nav-mobile-panel"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <NavIcon name="menu" size={22} />
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="ohNavOverlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsMobileMenuOpen(false);
            }
          }}
        >
          <div
            className="ohNavPanel"
            id="oh-nav-mobile-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={text("Navigation menu", "قائمة التنقل")}
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="ohNavPanelHeader">
              <Link
                href="/"
                className="ohNavBrand ohNavBrandPanel"
                onClick={closeMenus}
                aria-label={text("OrganHeal home", "OrganHeal الصفحة الرئيسية")}
              >
                <OrganHealLogo size={48} />
                <span className="ohNavBrandText">
                  {wordmark}
                  <span className="ohNavTagline">
                    {text(
                      "Healthier Today. Brighter Tomorrow.",
                      "صحة أفضل اليوم. غدٌ أكثر إشراقًا."
                    )}
                  </span>
                </span>
              </Link>

              <button
                ref={closeButtonRef}
                type="button"
                className="ohNavCloseButton"
                aria-label={text("Close navigation menu", "إغلاق قائمة التنقل")}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <NavIcon name="close" size={22} />
              </button>
            </div>

            <Link href={askHref} className="ohNavPanelAsk" onClick={closeMenus}>
              <span className="ohNavPanelAskIcon">
                <NavIcon name="sparkle" size={28} />
              </span>

              <span className="ohNavRowText">
                <span className="ohNavRowTitle">{askLabel}</span>
                <span className="ohNavRowSubtitle">
                  {text(
                    "Get personalized health insights",
                    "احصل على رؤى صحية مخصصة"
                  )}
                </span>
              </span>

              <NavIcon name="arrow" size={22} className="ohNavDirectional" />
            </Link>

            <div className="ohNavPanelList">
              {[homeItem, ...(isLoggedIn ? memberItems : visitorItems)].map((item) =>
                renderRow(item)
              )}
            </div>

            {isLoggedIn && (
              <>
                <p className="ohNavPanelLabel">{text("More", "المزيد")}</p>

                <div className="ohNavPanelList ohNavPanelListCompact">
                  {memberMoreItems.map((item) => renderRow(item, true))}
                </div>
              </>
            )}

            <div className="ohNavPanelDivider" />

            <LanguageToggle variant="row" />

            <div className="ohNavPanelTheme">
              <span className="ohNavPanelThemeLabel">
                {text("Appearance", "المظهر")}
              </span>
              <ThemeToggle isArabic={isArabic} variant="segmented" />
            </div>

            {isLoggedIn ? (
              <button type="button" className="ohNavPanelSecondary" onClick={signOut}>
                <NavIcon name="logout" size={20} />
                <span>{text("Sign Out", "تسجيل الخروج")}</span>
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="ohNavPanelSecondary"
                  onClick={closeMenus}
                >
                  <NavIcon name="user" size={20} />
                  <span>{text("Sign In", "تسجيل الدخول")}</span>
                </Link>

                <Link
                  href="/signup"
                  className="ohNavPanelPrimary"
                  onClick={closeMenus}
                >
                  <NavIcon name="userPlus" size={22} />
                  <span>{text("Start Free", "ابدأ مجانًا")}</span>
                  <NavIcon name="arrow" size={20} className="ohNavDirectional" />
                </Link>

                <p className="ohNavPanelNote">
                  {text(
                    "Your health journey starts here",
                    "رحلتك الصحية تبدأ من هنا"
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

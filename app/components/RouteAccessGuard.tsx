"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";

type Language =
  | "en"
  | "ar";

const protectedPrefixes = [
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

function isProtectedRoute(
  pathname: string
) {
  return protectedPrefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(
        `${prefix}/`
      )
  );
}

function getStoredLanguage(): Language {
  if (
    typeof window ===
    "undefined"
  ) {
    return "en";
  }

  const value =
    localStorage.getItem(
      "organheal-language"
    );

  return value === "ar"
    ? "ar"
    : "en";
}

export default function RouteAccessGuard({
  children,
}: {
  children:
    ReactNode;
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    language,
    setLanguage,
  ] =
    useState<Language>("en");

  const [
    languageReady,
    setLanguageReady,
  ] =
    useState(false);

  const [
    isChecking,
    setIsChecking,
  ] =
    useState(true);

  const [
    isAllowed,
    setIsAllowed,
  ] =
    useState(false);

  const isArabic =
    language === "ar";

  function text(
    en: string,
    ar: string
  ) {
    return isArabic
      ? ar
      : en;
  }

  const protectedRoute =
    useMemo(() => {
      return isProtectedRoute(
        pathname || "/"
      );
    }, [
      pathname,
    ]);

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage =
        getStoredLanguage();

      setLanguage(
        selectedLanguage
      );

      setLanguageReady(
        true
      );
    }

    syncLanguage();

    window.addEventListener(
      "storage",
      syncLanguage
    );

    window.addEventListener(
      "organheal-language-change",
      syncLanguage
    );

    return () => {
      window.removeEventListener(
        "storage",
        syncLanguage
      );

      window.removeEventListener(
        "organheal-language-change",
        syncLanguage
      );
    };
  }, []);

  useEffect(() => {
    let isMounted =
      true;

    async function checkAccess() {
      if (
        !protectedRoute
      ) {
        if (
          !isMounted
        ) {
          return;
        }

        setIsAllowed(
          true
        );

        setIsChecking(
          false
        );

        return;
      }

      setIsChecking(
        true
      );

      const {
        data,
        error,
      } =
        await supabase.auth
          .getUser();

      if (
        !isMounted
      ) {
        return;
      }

      if (
        error ||
        !data.user
      ) {
        setIsAllowed(
          false
        );

        setIsChecking(
          false
        );

        const nextPath =
          pathname
            ? `?next=${encodeURIComponent(
                pathname
              )}`
            : "";

        router.replace(
          `/login${nextPath}`
        );

        return;
      }

      setIsAllowed(
        true
      );

      setIsChecking(
        false
      );
    }

    checkAccess();

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
            if (
              !protectedRoute
            ) {
              return;
            }

            if (
              !session?.user
            ) {
              setIsAllowed(
                false
              );

              router.replace(
                "/login"
              );

              return;
            }

            setIsAllowed(
              true
            );
          }
        );

    return () => {
      isMounted =
        false;

      subscription.unsubscribe();
    };
  }, [
    pathname,
    protectedRoute,
    router,
  ]);

  if (
    !protectedRoute
  ) {
    return (
      <>
        {children}
      </>
    );
  }

  if (
    !languageReady
  ) {
    return (
      <main
        className="ohPageShell"
        style={{
          minHeight:
            "70vh",
        }}
      />
    );
  }

  if (
    isChecking
  ) {
    return (
      <main
        className="ohPageShell"
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
        lang={
          isArabic
            ? "ar"
            : "en"
        }
        style={{
          minHeight:
            "70vh",
        }}
      >
        <div
          className="ohContainer"
          style={{
            padding:
              "64px 0",
          }}
        >
          <section
            className="ohCard"
            style={{
              maxWidth:
                760,

              margin:
                "0 auto",

              textAlign:
                "center",
            }}
          >
            <p className="ohMetricLabel">
              {text(
                "Protected workspace",
                "مساحة صحية محمية"
              )}
            </p>

            <h1
              className="ohCardTitle"
              style={{
                fontSize:
                  "2rem",
              }}
            >
              {text(
                "Checking your access...",
                "جارٍ التحقق من صلاحية الوصول..."
              )}
            </h1>

            <p className="ohCardText">
              {text(
                "Please wait while OrganHeal confirms your signed-in session.",
                "يرجى الانتظار بينما يتحقق OrganHeal من جلسة تسجيل الدخول."
              )}
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (
    !isAllowed
  ) {
    return (
      <main
        className="ohPageShell"
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
        lang={
          isArabic
            ? "ar"
            : "en"
        }
        style={{
          minHeight:
            "70vh",
        }}
      >
        <div
          className="ohContainer"
          style={{
            padding:
              "64px 0",
          }}
        >
          <section
            className="ohCard"
            style={{
              maxWidth:
                760,

              margin:
                "0 auto",

              textAlign:
                "center",
            }}
          >
            <p className="ohMetricLabel">
              {text(
                "Private health workspace",
                "مساحة صحية خاصة"
              )}
            </p>

            <h1
              className="ohCardTitle"
              style={{
                fontSize:
                  "2rem",
              }}
            >
              {text(
                "Sign in to continue",
                "سجّل الدخول للمتابعة"
              )}
            </h1>

            <p className="ohCardText">
              {text(
                "This area belongs to your private OrganHeal workspace. Sign in or create an account to access it.",
                "هذه المنطقة جزء من مساحة OrganHeal الصحية الخاصة بك. سجّل الدخول أو أنشئ حسابًا للوصول إليها."
              )}
            </p>

            <div
              className="ohButtonRow"
              style={{
                justifyContent:
                  "center",

                marginTop:
                  "22px",
              }}
            >
              <Link
                href="/login"
                className="primaryBtn"
              >
                {text(
                  "Sign In",
                  "تسجيل الدخول"
                )}
              </Link>

              <Link
                href="/signup"
                className="secondaryBtn"
              >
                {text(
                  "Create Account",
                  "إنشاء حساب"
                )}
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      {children}
    </>
  );
}
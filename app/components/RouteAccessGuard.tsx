"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

function isProtectedRoute(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function RouteAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  const protectedRoute = useMemo(() => {
    return isProtectedRoute(pathname || "/");
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      if (!protectedRoute) {
        if (!isMounted) return;
        setIsAllowed(true);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);

      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !data.user) {
        setIsAllowed(false);
        setIsChecking(false);

        const nextPath = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
        router.replace(`/login${nextPath}`);
        return;
      }

      setIsAllowed(true);
      setIsChecking(false);
    }

    checkAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!protectedRoute) return;

      if (!session?.user) {
        setIsAllowed(false);
        router.replace("/login");
        return;
      }

      setIsAllowed(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, protectedRoute, router]);

  if (!protectedRoute) {
    return <>{children}</>;
  }

  if (isChecking) {
    return (
      <main className="ohPageShell" style={{ minHeight: "70vh" }}>
        <div className="ohContainer" style={{ padding: "64px 0" }}>
          <section className="ohCard" style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
            <p className="ohMetricLabel">Protected workspace</p>
            <h1 className="ohCardTitle" style={{ fontSize: "2rem" }}>
              Checking your access...
            </h1>
            <p className="ohCardText">
              Please wait while OrganHeal confirms your signed-in session.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="ohPageShell" style={{ minHeight: "70vh" }}>
        <div className="ohContainer" style={{ padding: "64px 0" }}>
          <section className="ohCard" style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
            <p className="ohMetricLabel">Private health workspace</p>
            <h1 className="ohCardTitle" style={{ fontSize: "2rem" }}>
              Sign in to continue
            </h1>
            <p className="ohCardText">
              This area belongs to your private OrganHeal workspace. Sign in or create an account to access it.
            </p>

            <div className="ohButtonRow" style={{ justifyContent: "center", marginTop: "22px" }}>
              <Link href="/login" className="primaryBtn">
                Sign In
              </Link>

              <Link href="/signup" className="secondaryBtn">
                Create Account
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

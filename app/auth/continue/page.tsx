"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

// Landing point after Google sign-in: send returning members to their
// dashboard and brand-new ones to onboarding, like the password login does.
export default function AuthContinuePage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function route() {
      // The client exchanges the code in the URL for a session; give it a
      // moment before deciding there is none.
      let userId: string | undefined;

      for (let attempt = 0; attempt < 10 && !userId; attempt += 1) {
        const { data } = await supabase.auth.getSession();

        userId = data.session?.user.id;

        if (!userId) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (cancelled) return;

      if (!userId) {
        setFailed(true);
        router.replace("/login");
        return;
      }

      const [{ data: assessments }, { data: reports }, { data: checkins }] = await Promise.all([
        supabase.from("organ_assessments").select("id").eq("user_id", userId).limit(1),
        supabase.from("uploaded_lab_files").select("id").eq("user_id", userId).limit(1),
        supabase.from("daily_checkins").select("id").eq("user_id", userId).limit(1),
      ]);

      const hasStarted =
        Boolean(assessments?.length) || Boolean(reports?.length) || Boolean(checkins?.length);

      router.replace(hasStarted ? "/dashboard" : "/onboarding");
    }

    void route();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="ohPageShell" style={{ display: "grid", placeItems: "center", minHeight: "60vh", padding: 24 }}>
      <p style={{ color: "var(--oh-muted)", fontWeight: 700 }}>
        {failed ? "Redirecting to sign in..." : "Signing you in..."}
      </p>
    </main>
  );
}

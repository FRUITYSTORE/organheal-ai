"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { computeHealthPulse, type HealthPulse } from "@/lib/health-pulse";
import { buildMarkerTrends, pickHeadlineMarkerTrend, type MarkerTrend } from "@/lib/health-marker-trends";
import { getMedicalReportMarkersForPatient } from "@/lib/repositories/report-markers.repository";
import { presentLabMarkerName } from "@/lib/presentation/intelligence/lab-marker-presentation";

import ChatVideos from "@/app/components/chat/ChatVideos";
import MarkerTrendChart from "@/app/components/charts/MarkerTrendChart";

import "./home-today.css";

// The member's week at a glance: a reason to come back every day, built only
// from their own check-ins and the date of their latest report.
export default function HomeMemberPulse({ isArabic }: { isArabic: boolean }) {
  const [pulse, setPulse] = useState<HealthPulse | null>(null);
  const [reportText, setReportText] = useState("");
  const [headlineTrend, setHeadlineTrend] = useState<MarkerTrend | null>(null);
  const text = (en: string, ar: string) => (isArabic ? ar : en);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) return;

      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

      const [{ data: checkins }, { data: reports }] = await Promise.all([
        supabase
          .from("daily_checkins")
          .select("created_at, wellness_score")
          .eq("user_id", userId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("uploaded_lab_files")
          .select("created_at, extracted_text")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (cancelled) return;

      // Topics mentioned in the latest report, matched here in the browser
      // (the text never leaves the device for this) to suggest videos.
      setReportText(
        typeof reports?.[0]?.extracted_text === "string"
          ? reports[0].extracted_text.slice(0, 20000)
          : ""
      );

      setPulse(
        computeHealthPulse(
          (checkins ?? []) as { created_at: string; wellness_score: number | null }[],
          (reports?.[0] as { created_at: string } | undefined)?.created_at ?? null
        )
      );

      // A trend needs two or more comparable readings of the same marker, so
      // most members simply won't have one yet — that's expected, not an error.
      try {
        const markerRows = await getMedicalReportMarkersForPatient(userId);

        if (!cancelled) {
          setHeadlineTrend(pickHeadlineMarkerTrend(buildMarkerTrends(markerRows)));
        }
      } catch {
        // No chart shown; everything else on the card still works.
      }
    }

    void load().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  if (!pulse) {
    return null;
  }

  const hasActivity = pulse.checkinsThisWeek > 0 || pulse.streak > 0;
  const score = pulse.averageScore ?? 0;

  const trendLabel =
    pulse.trend === "up"
      ? text("Up from last week", "أفضل من الأسبوع الماضي")
      : pulse.trend === "down"
        ? text("Lower than last week", "أقل من الأسبوع الماضي")
        : pulse.trend === "steady"
          ? text("Steady vs last week", "ثابت مقارنة بالأسبوع الماضي")
          : text("Check in a few days to see your trend", "سجّل بضعة أيام لتظهر لك المقارنة");

  return (
    <section className="ohPulse" aria-label={text("Your week", "أسبوعك الصحي")}>
      <div
        className="ohPulseRing"
        style={{ ["--ohPulseScore" as string]: `${score}%` }}
        role="img"
        aria-label={
          pulse.averageScore === null
            ? text("No score yet", "لا توجد نتيجة بعد")
            : text(`Weekly wellness ${score} out of 100`, `مؤشر الأسبوع ${score} من 100`)
        }
      >
        <span>
          <strong>{pulse.averageScore ?? "–"}</strong>
          <small>{text("this week", "هذا الأسبوع")}</small>
        </span>
      </div>

      <div className="ohPulseBody">
        <p className="ohEyebrow">{text("Your health pulse", "نبض صحتك")}</p>
        <h2>
          {hasActivity
            ? text("Your week at a glance", "أسبوعك في لمحة")
            : text("Start your daily pulse in one minute", "ابدأ نبضك اليومي في دقيقة")}
        </h2>

        {hasActivity ? (
          <ul className="ohPulseStats">
            <li>
              <strong>{pulse.streak}</strong>
              <span>{text("day streak", "أيام متتالية")}</span>
            </li>
            <li>
              <strong>{pulse.checkinsThisWeek}/7</strong>
              <span>{text("check-ins", "تسجيلات")}</span>
            </li>
            <li className="ohPulseTrend" data-trend={pulse.trend ?? "none"}>
              <span>{trendLabel}</span>
            </li>
          </ul>
        ) : (
          <p className="ohPulseHint">
            {text(
              "Log how you feel each day. OrganHeal turns it into a weekly score and shows what is changing.",
              "سجّل شعورك كل يوم. يحوّله OrganHeal إلى مؤشر أسبوعي ويُظهر ما الذي يتغيّر."
            )}
          </p>
        )}

        {pulse.recheckDue && (
          <p className="ohPulseRecheck">
            {text(
              `Your last report was ${pulse.daysSinceReport} days ago. It may be time for a re-check.`,
              `مرّ ${pulse.daysSinceReport} يومًا على آخر تقرير لك. قد يكون الوقت مناسبًا لإعادة الفحص.`
            )}{" "}
            <Link href="/lab-upload">{text("Upload a new report", "ارفع تقريرًا جديدًا")}</Link>
          </p>
        )}
      </div>

      <div className="ohPulseActions">
        <Link href="/checkin" className="primaryBtn">
          {pulse.checkedInToday
            ? text("Update today's check-in", "حدّث تسجيل اليوم")
            : text("Check in today", "سجّل يومك")}
        </Link>
      </div>

      {headlineTrend && (
        <div className="ohPulseTrendCard">
          <div className="ohPulseTrendHeader">
            <span>
              {text("Tracking over time", "التتبع عبر الزمن")}: {" "}
              {presentLabMarkerName(headlineTrend.trend.marker, isArabic ? "ar" : "en")}
            </span>
            <span
              className="ohPulseTrendPill"
              data-direction={headlineTrend.trend.trendDirection}
            >
              {headlineTrend.trend.trendDirection === "Improving"
                ? text("Improved", "تحسّنت")
                : headlineTrend.trend.trendDirection === "Worsening"
                  ? text("Needs attention", "تحتاج انتباهاً")
                  : text("Stable", "مستقرة")}
            </span>
          </div>

          <MarkerTrendChart trend={headlineTrend} isArabic={isArabic} height={100} />

          <p className="ohPulseTrendNote">
            {text(
              "Educational only, based on your own uploaded reports — not a diagnosis.",
              "للتثقيف فقط، ومبني على تقاريرك المرفوعة، وليس تشخيصاً."
            )}
          </p>
        </div>
      )}

      {reportText && (
        <div className="ohPulseVideos">
          <ChatVideos
            question=""
            answer={reportText}
            isArabic={isArabic}
            label={{
              en: "Videos about topics in your latest report",
              ar: "فيديوهات عن مواضيع في آخر تقرير لك",
            }}
          />
        </div>
      )}
    </section>
  );
}

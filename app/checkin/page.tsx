"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

type DailyCheckIn = {
  mood: string;
  energy_level: number;
  stress_level: number;
  sleep_quality: number;
  hydration: number;
  physical_activity: number;
  wellness_score: number;
  notes: string | null;
  created_at: string;
};

type MoodOption = {
  value: string;
  en: string;
  ar: string;
};

const moodOptions: MoodOption[] = [
  { value: "Excellent", en: "Excellent", ar: "ممتاز" },
  { value: "Good", en: "Good", ar: "جيد" },
  { value: "Average", en: "Average", ar: "متوسط" },
  { value: "Poor", en: "Poor", ar: "ضعيف" },
];

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

function localizeMood(value: string | null | undefined, isArabic: boolean) {
  if (!isArabic) return value || "Not recorded";

  const option = moodOptions.find((item) => item.value === value);
  return option?.ar || "غير مسجل";
}

function getScoreStatus(score: number, isArabic: boolean) {
  if (score >= 80) return isArabic ? "قوي" : "Strong";
  if (score >= 60) return isArabic ? "مستقر" : "Stable";
  if (score >= 40) return isArabic ? "يحتاج انتباه" : "Needs Attention";
  return isArabic ? "يحتاج تعافي" : "Recovery Needed";
}

function getScoreClass(score: number) {
  if (score >= 80) return "goodScore";
  if (score >= 60) return "moderateScore";
  return "riskScore";
}

function getScoreGuidance(score: number, isArabic: boolean) {
  if (score >= 80) {
    return isArabic
      ? "وضعك اليوم جيد. حافظ على نفس العادات وكرر التحديث الصحي خلال الأسبوع."
      : "Your status looks strong today. Keep the same habits and continue check-ins this week.";
  }

  if (score >= 60) {
    return isArabic
      ? "وضعك مستقر. اختر عادة واحدة لتحسين النوم أو النشاط أو الترطيب اليوم."
      : "Your status looks stable. Choose one habit to improve sleep, activity, or hydration today.";
  }

  if (score >= 40) {
    return isArabic
      ? "يوجد مؤشرات تحتاج انتباه. راقب النوم، الضغط، والطاقة، ولا تضغط على نفسك اليوم."
      : "Some areas need attention. Monitor sleep, stress, and energy, and avoid overloading yourself today.";
  }

  return isArabic
    ? "اليوم يحتاج رعاية أكثر. ركز على الراحة، الترطيب، وتواصل مع مقدم رعاية صحية إذا توجد أعراض مقلقة."
    : "Today needs more recovery support. Focus on rest and hydration, and seek medical care for concerning symptoms.";
}

function getRangeText(value: number, isArabic: boolean) {
  if (value <= 1) return isArabic ? "منخفض جدًا" : "Very low";
  if (value === 2) return isArabic ? "منخفض" : "Low";
  if (value === 3) return isArabic ? "متوسط" : "Moderate";
  if (value === 4) return isArabic ? "جيد" : "Good";
  return isArabic ? "ممتاز" : "Excellent";
}

function formatDate(value: string, isArabic: boolean) {
  try {
    return new Date(value).toLocaleString(isArabic ? "ar" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function CheckInPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [mood, setMood] = useState("Good");
  const [energyLevel, setEnergyLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [hydration, setHydration] = useState(3);
  const [physicalActivity, setPhysicalActivity] = useState(3);
  const [notes, setNotes] = useState("");

  const [latestCheckIn, setLatestCheckIn] = useState<DailyCheckIn | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<DailyCheckIn[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedToday, setSavedToday] = useState(false);

  useEffect(() => {
    function syncLanguage() {
      setLanguage(getStoredLanguage());
    }

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("focus", syncLanguage);
    window.addEventListener("click", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("focus", syncLanguage);
      window.removeEventListener("click", syncLanguage);
    };
  }, []);

  useEffect(() => {
    loadCheckInHistory();
  }, []);

  const isArabic = language === "ar";

  function calculateWellnessScore() {
    return Math.round(
      ((energyLevel +
        sleepQuality +
        hydration +
        physicalActivity +
        (6 - stressLevel)) /
        25) *
        100
    );
  }

  async function loadCheckInHistory() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("daily_checkins")
      .select(
        "mood, energy_level, stress_level, sleep_quality, hydration, physical_activity, wellness_score, notes, created_at"
      )
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(7);

    if (error) {
      setMessage(
        isArabic
          ? "خطأ في قاعدة البيانات: " + error.message
          : "Database error: " + error.message
      );
      setLoading(false);
      return;
    }

    const checkIns = (data || []) as DailyCheckIn[];

    setRecentCheckIns(checkIns);
    setLatestCheckIn(checkIns[0] || null);

    if (checkIns[0]) {
      const latestDate = new Date(checkIns[0].created_at).toDateString();
      const today = new Date().toDateString();
      setSavedToday(latestDate === today);
    } else {
      setSavedToday(false);
    }

    setLoading(false);
  }

  async function saveCheckIn() {
    setSaving(true);
    setMessage(isArabic ? "جاري حفظ التحديث الصحي..." : "Saving daily check-in...");

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user) {
      setMessage(
        isArabic
          ? "يرجى تسجيل الدخول لحفظ التحديث الصحي."
          : "Please login to save your daily check-in."
      );
      setSaving(false);
      return;
    }

    const wellnessScore = calculateWellnessScore();

    const { error } = await supabase.from("daily_checkins").insert({
      user_id: data.user.id,
      mood,
      energy_level: energyLevel,
      stress_level: stressLevel,
      sleep_quality: sleepQuality,
      hydration,
      physical_activity: physicalActivity,
      wellness_score: wellnessScore,
      notes,
    });

    if (error) {
      setMessage(
        isArabic
          ? "خطأ في قاعدة البيانات: " + error.message
          : "Database error: " + error.message
      );
      setSaving(false);
      return;
    }

    setMessage(
      isArabic
        ? "تم حفظ التحديث الصحي بنجاح. النتيجة: " + wellnessScore + "/100"
        : "Check-in saved successfully. Wellness Score: " + wellnessScore + "/100"
    );

    setSavedToday(true);
    setSaving(false);

    await loadCheckInHistory();
  }

  const wellnessScore = calculateWellnessScore();
  const scoreStatus = getScoreStatus(wellnessScore, isArabic);
  const scoreGuidance = getScoreGuidance(wellnessScore, isArabic);

  const averageRecentScore = useMemo(() => {
    if (recentCheckIns.length === 0) return null;

    return Math.round(
      recentCheckIns.reduce((sum, item) => sum + item.wellness_score, 0) /
        recentCheckIns.length
    );
  }, [recentCheckIns]);

  const trendText = useMemo(() => {
    if (recentCheckIns.length < 2) {
      return isArabic ? "بانتظار نمط أوضح" : "Waiting for clearer pattern";
    }

    const latest = recentCheckIns[0].wellness_score;
    const previous = recentCheckIns[1].wellness_score;

    if (latest > previous) return isArabic ? "تحسن عن آخر تحديث" : "Improved since last check-in";
    if (latest < previous) return isArabic ? "انخفاض عن آخر تحديث" : "Lower than last check-in";

    return isArabic ? "مستقر مقارنة بآخر تحديث" : "Stable compared with last check-in";
  }, [recentCheckIns, isArabic]);

  function RangeControl({
    label,
    value,
    onChange,
    reverseMeaning,
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    reverseMeaning?: boolean;
  }) {
    const displayText = reverseMeaning
      ? value <= 1
        ? isArabic
          ? "منخفض"
          : "Low"
        : value >= 5
        ? isArabic
          ? "مرتفع"
          : "High"
        : getRangeText(value, isArabic)
      : getRangeText(value, isArabic);

    return (
      <div className="formGroup">
        <label>
          {label}: {value}/5 · {displayText}
        </label>

        <input
          type="range"
          min="1"
          max="5"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    );
  }

  return (
    <main
      className="assistantPage checkinReadablePage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <div className="assistantContainer">
        <style>{`
          .checkinHeroGrid {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
            gap: 18px;
            margin-bottom: 22px;
          }

          .checkinScoreCard {
            text-align: center;
          }

          .checkinScoreCard h2 {
            font-size: clamp(2.8rem, 7vw, 5rem);
            margin: 10px 0;
          }

          .checkinStatusPill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 8px 12px;
            background: rgba(20, 184, 166, 0.12);
            border: 1px solid rgba(20, 184, 166, 0.24);
            margin-bottom: 12px;
            font-weight: 800;
          }

          .checkinInsightGrid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
            margin-top: 18px;
          }

          .checkinInsightGrid article,
          .checkinMiniCard {
            border: 1px solid rgba(148, 163, 184, 0.22);
            border-radius: 18px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.78);
          }

          .checkinInsightGrid span,
          .checkinMiniCard span {
            display: block;
            font-size: 0.78rem;
            opacity: 0.7;
            margin-bottom: 6px;
          }

          .checkinInsightGrid strong,
          .checkinMiniCard strong {
            display: block;
            font-size: 1.05rem;
            line-height: 1.45;
          }

          .checkinActionRow {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 16px;
            justify-content: center;
          }

          .checkinFormGrid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .checkinTextarea {
            min-height: 110px;
            resize: vertical;
          }

          .checkinRecentList {
            display: grid;
            gap: 12px;
            margin-top: 16px;
          }

          .checkinRecentItem {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            padding: 14px;
            border-radius: 16px;
            border: 1px solid rgba(148, 163, 184, 0.22);
            background: rgba(255, 255, 255, 0.72);
          }

          .checkinRecentItem p {
            margin: 4px 0 0;
            opacity: 0.75;
          }

          .assistantPage[dir="rtl"] .checkinRecentItem {
            text-align: right;
          }

          @media (max-width: 900px) {
            .checkinHeroGrid,
            .checkinInsightGrid,
            .checkinFormGrid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        
        <style>{`
          /* ORGANHEAL_CHECKIN_READABILITY_POLISH */
          .checkinReadablePage {
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(34, 211, 238, 0.22), transparent 34%),
              linear-gradient(180deg, #ecfeff 0%, #f8fafc 45%, #ffffff 100%) !important;
            color: #0f172a !important;
          }

          .checkinReadablePage .assistantContainer {
            max-width: 1120px;
            padding-top: 28px;
            padding-bottom: 56px;
          }

          .checkinReadablePage .assistantHeader {
            background: rgba(255, 255, 255, 0.88);
            border: 1px solid rgba(148, 163, 184, 0.22);
            border-radius: 28px;
            padding: 28px;
            margin-bottom: 24px;
            box-shadow: 0 22px 55px rgba(15, 23, 42, 0.08);
            color: #0f172a !important;
          }

          .checkinReadablePage[dir="rtl"] .assistantHeader {
            text-align: right;
          }

          .checkinReadablePage .assistantHeader h1 {
            color: #0f172a !important;
            font-size: clamp(2.1rem, 5vw, 4rem);
            line-height: 1.15;
            margin: 10px 0 12px;
          }

          .checkinReadablePage .assistantHeader p {
            color: #475569 !important;
            font-size: 1rem;
            line-height: 1.85;
          }

          .checkinReadablePage .assistantBadge,
          .checkinReadablePage .sectionLabel {
            color: #0891b2 !important;
            font-weight: 900;
            letter-spacing: 0.08em;
          }

          .checkinReadablePage[dir="rtl"] .assistantBadge,
          .checkinReadablePage[dir="rtl"] .sectionLabel {
            letter-spacing: normal;
          }

          .checkinReadablePage .chatWindow {
            display: grid;
            gap: 22px;
          }

          .checkinReadablePage .resultBox,
          .checkinReadablePage .assessmentForm {
            background: rgba(255, 255, 255, 0.94) !important;
            color: #0f172a !important;
            border: 1px solid rgba(148, 163, 184, 0.24) !important;
            box-shadow: 0 24px 65px rgba(15, 23, 42, 0.08);
          }

          .checkinReadablePage .resultBox h2,
          .checkinReadablePage .resultBox h3,
          .checkinReadablePage .resultBox strong,
          .checkinReadablePage .resultBox p,
          .checkinReadablePage .assessmentForm label {
            color: #0f172a !important;
          }

          .checkinReadablePage .resultBox p,
          .checkinReadablePage .assessmentForm label {
            font-size: 0.98rem;
            line-height: 1.8;
          }

          .checkinReadablePage .goodScore {
            color: #0891b2 !important;
          }

          .checkinReadablePage .moderateScore {
            color: #0f766e !important;
          }

          .checkinReadablePage .riskScore {
            color: #b45309 !important;
          }

          .checkinReadablePage .checkinHeroGrid {
            align-items: stretch;
          }

          .checkinReadablePage .checkinScoreCard {
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 330px;
          }

          .checkinReadablePage .checkinScoreCard h2 {
            color: #0891b2 !important;
            text-shadow: none !important;
          }

          .checkinReadablePage .checkinStatusPill {
            background: #ccfbf1 !important;
            color: #0f766e !important;
            border: 1px solid #99f6e4 !important;
          }

          .checkinReadablePage .checkinInsightGrid article,
          .checkinReadablePage .checkinMiniCard,
          .checkinReadablePage .checkinRecentItem {
            background: #f8fafc !important;
            color: #0f172a !important;
            border: 1px solid #e2e8f0 !important;
          }

          .checkinReadablePage .checkinInsightGrid span,
          .checkinReadablePage .checkinMiniCard span,
          .checkinReadablePage .checkinRecentItem p {
            color: #64748b !important;
            opacity: 1 !important;
          }

          .checkinReadablePage .checkinInsightGrid strong,
          .checkinReadablePage .checkinMiniCard strong,
          .checkinReadablePage .checkinRecentItem strong {
            color: #0f172a !important;
          }

          .checkinReadablePage .assessmentForm {
            padding: 26px !important;
            border-radius: 28px !important;
          }

          .checkinReadablePage .formGroup {
            margin-bottom: 18px;
          }

          .checkinReadablePage select,
          .checkinReadablePage textarea,
          .checkinReadablePage input:not([type="range"]) {
            background: #ffffff !important;
            color: #0f172a !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 14px !important;
            padding: 12px 14px !important;
            width: 100%;
          }

          .checkinReadablePage textarea::placeholder {
            color: #94a3b8 !important;
          }

          .checkinReadablePage input[type="range"] {
            width: 100%;
            accent-color: #0891b2;
          }

          .checkinReadablePage .primaryBtn,
          .checkinReadablePage .secondaryBtn {
            border-radius: 999px !important;
            font-weight: 900 !important;
          }

          .checkinReadablePage .primaryBtn {
            background: linear-gradient(135deg, #06b6d4, #14b8a6) !important;
            color: #ffffff !important;
            border: 0 !important;
            box-shadow: 0 18px 38px rgba(20, 184, 166, 0.28);
          }

          .checkinReadablePage .secondaryBtn {
            background: #ffffff !important;
            color: #0f766e !important;
            border: 1px solid #99f6e4 !important;
          }

          .checkinReadablePage .checkinActionRow {
            justify-content: center;
          }

          .checkinReadablePage[dir="rtl"] .checkinActionRow {
            direction: rtl;
          }

          @media (max-width: 900px) {
            .checkinReadablePage .assistantContainer {
              padding-inline: 14px;
            }

            .checkinReadablePage .assistantHeader,
            .checkinReadablePage .resultBox,
            .checkinReadablePage .assessmentForm {
              border-radius: 22px;
              padding: 20px !important;
            }

            .checkinReadablePage .checkinScoreCard {
              min-height: auto;
            }
          }
        `}</style>


        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">
            {isArabic ? "التحديث الصحي اليومي" : "DAILY HEALTH CHECK-IN"}
          </p>

          <h1>
            {isArabic ? "كيف تشعر اليوم؟" : "How Are You Feeling Today?"}
          </h1>

          <p>
            {isArabic
              ? "تحديث سريع للنوم، الضغط النفسي، الترطيب، الطاقة، النشاط، والمزاج حتى تبقى خطة المتابعة واقعية ومتصلة بحالتك."
              : "Track sleep, stress, hydration, energy, activity, and mood so your dashboard, profile, and follow-up plan stay realistic."}
          </p>
        </div>

        <div className="chatWindow">
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">
                {isArabic ? "تحميل التحديثات" : "Loading Check-In"}
              </p>
              <h2>
                {isArabic
                  ? "جاري تحضير متتبع الحالة اليومية..."
                  : "Preparing your wellness tracker..."}
              </h2>
            </div>
          )}

          {!loading && (
            <>
              <section className="checkinHeroGrid">
                <div className="resultBox checkinScoreCard">
                  <p className="sectionLabel">
                    {isArabic ? "معاينة نتيجة اليوم" : "Today Wellness Preview"}
                  </p>

                  <h2 className={getScoreClass(wellnessScore)}>
                    {wellnessScore}/100
                  </h2>

                  <div className="checkinStatusPill">{scoreStatus}</div>

                  <p
                    style={{
                      opacity: 0.84,
                      lineHeight: 1.8,
                      maxWidth: "720px",
                      margin: "0 auto",
                    }}
                  >
                    {scoreGuidance}
                  </p>

                  <div className="checkinActionRow">
                    <Link href="/health-plan" className="secondaryBtn">
                      {isArabic ? "خطة المتابعة" : "Health Plan"}
                    </Link>

                    <Link href="/history" className="secondaryBtn">
                      {isArabic ? "التاريخ الصحي" : "Health History"}
                    </Link>
                  </div>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic ? "حالة اليوم" : "Today status"}
                  </p>

                  <h2>{savedToday ? (isArabic ? "تم الحفظ اليوم" : "Saved today") : isArabic ? "جاهز للحفظ" : "Ready to save"}</h2>

                  <div className="checkinInsightGrid" style={{ gridTemplateColumns: "1fr" }}>
                    <article>
                      <span>{isArabic ? "متوسط آخر التحديثات" : "Recent average"}</span>
                      <strong>{averageRecentScore === null ? "--" : averageRecentScore + "/100"}</strong>
                    </article>

                    <article>
                      <span>{isArabic ? "الاتجاه" : "Trend"}</span>
                      <strong>{trendText}</strong>
                    </article>

                    <article>
                      <span>{isArabic ? "عدد التحديثات" : "Saved check-ins"}</span>
                      <strong>{recentCheckIns.length}</strong>
                    </article>
                  </div>
                </div>
              </section>

              {latestCheckIn && (
                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic ? "آخر تحديث محفوظ" : "Latest Saved Check-In"}
                  </p>

                  <h2 className={getScoreClass(latestCheckIn.wellness_score)}>
                    {latestCheckIn.wellness_score}/100
                  </h2>

                  <p>
                    {localizeMood(latestCheckIn.mood, isArabic)} ·{" "}
                    {formatDate(latestCheckIn.created_at, isArabic)}
                  </p>

                  <div className="checkinInsightGrid">
                    <article>
                      <span>{isArabic ? "الطاقة" : "Energy"}</span>
                      <strong>{latestCheckIn.energy_level}/5</strong>
                    </article>

                    <article>
                      <span>{isArabic ? "الضغط النفسي" : "Stress"}</span>
                      <strong>{latestCheckIn.stress_level}/5</strong>
                    </article>

                    <article>
                      <span>{isArabic ? "النوم" : "Sleep"}</span>
                      <strong>{latestCheckIn.sleep_quality}/5</strong>
                    </article>

                    <article>
                      <span>{isArabic ? "الترطيب" : "Hydration"}</span>
                      <strong>{latestCheckIn.hydration}/5</strong>
                    </article>

                    <article>
                      <span>{isArabic ? "النشاط" : "Activity"}</span>
                      <strong>{latestCheckIn.physical_activity}/5</strong>
                    </article>

                    <article>
                      <span>{isArabic ? "المزاج" : "Mood"}</span>
                      <strong>{localizeMood(latestCheckIn.mood, isArabic)}</strong>
                    </article>
                  </div>
                </div>
              )}

              <div className="assessmentForm">
                <div className="formGroup">
                  <label>{isArabic ? "المزاج" : "Mood"}</label>
                  <select value={mood} onChange={(event) => setMood(event.target.value)}>
                    {moodOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {isArabic ? item.ar : item.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="checkinFormGrid">
                  <RangeControl
                    label={isArabic ? "مستوى الطاقة" : "Energy Level"}
                    value={energyLevel}
                    onChange={setEnergyLevel}
                  />

                  <RangeControl
                    label={isArabic ? "مستوى الضغط النفسي" : "Stress Level"}
                    value={stressLevel}
                    onChange={setStressLevel}
                    reverseMeaning
                  />

                  <RangeControl
                    label={isArabic ? "جودة النوم" : "Sleep Quality"}
                    value={sleepQuality}
                    onChange={setSleepQuality}
                  />

                  <RangeControl
                    label={isArabic ? "الترطيب" : "Hydration"}
                    value={hydration}
                    onChange={setHydration}
                  />

                  <RangeControl
                    label={isArabic ? "النشاط البدني" : "Physical Activity"}
                    value={physicalActivity}
                    onChange={setPhysicalActivity}
                  />
                </div>

                <div className="formGroup">
                  <label>
                    {isArabic ? "ملاحظات اختيارية" : "Optional notes"}
                  </label>

                  <textarea
                    className="checkinTextarea"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={
                      isArabic
                        ? "مثال: نوم قليل، صداع، ضغط عالي، نشاط ممتاز..."
                        : "Example: poor sleep, headache, high stress, strong activity..."
                    }
                  />
                </div>

                <button
                  className="primaryBtn"
                  onClick={saveCheckIn}
                  disabled={saving}
                >
                  {saving
                    ? isArabic
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : savedToday
                    ? isArabic
                      ? "حفظ تحديث إضافي اليوم"
                      : "Save Another Check-In Today"
                    : isArabic
                    ? "حفظ التحديث الصحي"
                    : "Save Daily Check-In"}
                </button>

                {message && (
                  <div className="resultBox" style={{ marginTop: "18px" }}>
                    <p>{message}</p>
                  </div>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "نمط آخر التحديثات" : "Recent Check-In Pattern"}
                </p>

                <h2>
                  {recentCheckIns.length}{" "}
                  {isArabic ? "تحديثات محفوظة حديثًا" : "recent saved check-ins"}
                </h2>

                {recentCheckIns.length === 0 ? (
                  <p>
                    {isArabic
                      ? "احفظ أول تحديث صحي حتى يبدأ OrganHeal ببناء نمط المتابعة."
                      : "Save your first daily check-in to start building a wellness pattern."}
                  </p>
                ) : (
                  <div className="checkinRecentList">
                    {recentCheckIns.slice(0, 5).map((item, index) => (
                      <div
                        className="checkinRecentItem"
                        key={item.created_at + "-" + index}
                      >
                        <div>
                          <strong>
                            {item.wellness_score}/100 · {localizeMood(item.mood, isArabic)}
                          </strong>
                          <p>{formatDate(item.created_at, isArabic)}</p>
                        </div>

                        <span className={getScoreClass(item.wellness_score)}>
                          {getScoreStatus(item.wellness_score, isArabic)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "رحلة التحديث الصحي" : "Check-In Journey"}
                </p>

                <h2>
                  {isArabic
                    ? "اجعل خطة المتابعة أكثر واقعية"
                    : "Keep your health plan realistic"}
                </h2>

                <p style={{ lineHeight: 1.8, opacity: 0.84 }}>
                  {isArabic
                    ? "التحديثات الصحية تساعد OrganHeal على ربط حالتك اليومية بلوحة التحكم، الملف الصحي، مركز الذكاء، وخطة المتابعة."
                    : "Your daily check-ins help OrganHeal connect your current wellness status with your dashboard, profile, intelligence, and follow-up plan."}
                </p>

                <div className="checkinActionRow">
                  <Link href="/dashboard" className="secondaryBtn">
                    {isArabic ? "لوحة التحكم" : "Dashboard"}
                  </Link>

                  <Link href="/health-plan" className="primaryBtn">
                    {isArabic ? "فتح خطة المتابعة" : "Open Health Plan"}
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

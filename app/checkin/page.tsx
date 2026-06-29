"use client";

import PageBackActions from "../components/PageBackActions";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
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

function getTodayIsoRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function formatDate(value: string, isArabic: boolean) {
  try {
    return new Date(value).toLocaleString(isArabic ? "ar-AE" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function localizeMood(value: string | null | undefined, isArabic: boolean) {
  if (!isArabic) return value || "Not recorded";

  const option = moodOptions.find((item) => item.value === value);
  return option?.ar || "غير مسجل";
}

function getRangeText(value: number, isArabic: boolean) {
  if (value <= 1) return isArabic ? "منخفض جدًا" : "Very low";
  if (value === 2) return isArabic ? "منخفض" : "Low";
  if (value === 3) return isArabic ? "متوسط" : "Moderate";
  if (value === 4) return isArabic ? "جيد" : "Good";
  return isArabic ? "ممتاز" : "Excellent";
}

function getStressRangeText(value: number, isArabic: boolean) {
  if (value <= 1) return isArabic ? "منخفض جدًا" : "Very low";
  if (value === 2) return isArabic ? "منخفض" : "Low";
  if (value === 3) return isArabic ? "متوسط" : "Moderate";
  if (value === 4) return isArabic ? "مرتفع" : "High";
  return isArabic ? "مرتفع جدًا" : "Very high";
}

function getScoreStatus(score: number, isArabic: boolean) {
  if (score >= 80) return isArabic ? "قوي" : "Strong";
  if (score >= 60) return isArabic ? "مستقر" : "Stable";
  if (score >= 40) return isArabic ? "يحتاج انتباه" : "Needs Attention";
  return isArabic ? "يحتاج تعافي" : "Recovery Needed";
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
    ? "اليوم يحتاج رعاية أكثر. ركز على الراحة والترطيب، واطلب رعاية طبية إذا ظهرت أعراض مقلقة."
    : "Today needs more recovery support. Focus on rest and hydration, and seek medical care for concerning symptoms.";
}

function getTone(score: number) {
  if (score >= 80) return "good";
  if (score >= 60) return "moderate";
  if (score >= 40) return "moderate";
  return "risk";
}

export default function CheckInPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

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

  useEffect(() => {
    loadCheckInHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

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
      setMessage(text("Database error: ", "خطأ في قاعدة البيانات: ") + error.message);
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

    setMessage(
      savedToday
        ? text("Updating today check-in...", "جاري تحديث Check-In لهذا اليوم...")
        : text("Saving daily check-in...", "جاري حفظ التحديث الصحي...")
    );

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user) {
      setMessage(
        text(
          "Please login to save your daily check-in.",
          "يرجى تسجيل الدخول لحفظ التحديث الصحي."
        )
      );
      setSaving(false);
      return;
    }

    const wellnessScore = calculateWellnessScore();

    const checkInPayload = {
      mood,
      energy_level: energyLevel,
      stress_level: stressLevel,
      sleep_quality: sleepQuality,
      hydration,
      physical_activity: physicalActivity,
      wellness_score: wellnessScore,
      notes: notes.trim() ? notes.trim() : null,
    };

    const { startIso, endIso } = getTodayIsoRange();

    const { error } = savedToday
      ? await supabase
          .from("daily_checkins")
          .update(checkInPayload)
          .eq("user_id", data.user.id)
          .gte("created_at", startIso)
          .lt("created_at", endIso)
      : await supabase.from("daily_checkins").insert({
          user_id: data.user.id,
          ...checkInPayload,
        });

    if (error) {
      setMessage(text("Database error: ", "خطأ في قاعدة البيانات: ") + error.message);
      setSaving(false);
      return;
    }

    setMessage(
      savedToday
        ? text(
            `Today check-in updated successfully. Wellness Score: ${wellnessScore}/100`,
            `تم تحديث Check-In اليوم بنجاح. النتيجة: ${wellnessScore}/100`
          )
        : text(
            `Check-in saved successfully. Wellness Score: ${wellnessScore}/100`,
            `تم حفظ التحديث الصحي بنجاح. النتيجة: ${wellnessScore}/100`
          )
    );

    setSavedToday(true);
    setSaving(false);

    await loadCheckInHistory();
  }

  const wellnessScore = calculateWellnessScore();
  const scoreStatus = getScoreStatus(wellnessScore, isArabic);
  const scoreGuidance = getScoreGuidance(wellnessScore, isArabic);
  const scoreTone = getTone(wellnessScore);

  const scoreRingStyle = {
    "--score": Math.max(0, Math.min(100, wellnessScore)),
  } as CSSProperties;

  const averageRecentScore = useMemo(() => {
    if (recentCheckIns.length === 0) return null;

    return Math.round(
      recentCheckIns.reduce((sum, item) => sum + item.wellness_score, 0) /
        recentCheckIns.length
    );
  }, [recentCheckIns]);

  const recentScores = recentCheckIns.map((item) => item.wellness_score);
  const highestRecentScore =
    recentScores.length > 0 ? Math.max(...recentScores) : null;
  const lowestRecentScore =
    recentScores.length > 0 ? Math.min(...recentScores) : null;

  const trendText = useMemo(() => {
    if (recentCheckIns.length < 2) {
      return text("Waiting for clearer pattern", "بانتظار نمط أوضح");
    }

    const latest = recentCheckIns[0].wellness_score;
    const previous = recentCheckIns[1].wellness_score;

    if (latest > previous) return text("Improved since last check-in", "تحسن عن آخر تحديث");
    if (latest < previous) return text("Lower than last check-in", "انخفاض عن آخر تحديث");

    return text("Stable compared with last check-in", "مستقر مقارنة بآخر تحديث");
  }, [recentCheckIns, isArabic]);

  const repeatedMood = useMemo(() => {
    if (recentCheckIns.length === 0) {
      return text("Not available", "غير متاح");
    }

    const counts = new Map<string, number>();

    recentCheckIns.forEach((item) => {
      counts.set(item.mood, (counts.get(item.mood) || 0) + 1);
    });

    const topMood = Array.from(counts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    return localizeMood(topMood, isArabic);
  }, [recentCheckIns, isArabic]);

  const consistencyText =
    recentCheckIns.length >= 5
      ? text("Strong consistency", "متابعة قوية")
      : recentCheckIns.length >= 3
      ? text("Good consistency", "متابعة جيدة")
      : recentCheckIns.length >= 1
      ? text("Starting consistency", "بداية المتابعة")
      : text("Not started yet", "لم تبدأ بعد");

  const focusItems = [
    stressLevel >= 4
      ? text(
          "Reduce stress today: take a short break, breathe slowly, and avoid adding too many tasks.",
          "خفف الضغط اليوم: خذ راحة قصيرة، تنفس ببطء، وتجنب إضافة مهام كثيرة."
        )
      : null,
    sleepQuality <= 2
      ? text(
          "Sleep needs support: keep a stable bedtime and reduce screen time before sleep.",
          "النوم يحتاج دعمًا: حاول تثبيت وقت النوم وتقليل الشاشة قبل النوم."
        )
      : null,
    hydration <= 2
      ? text(
          "Hydration is low: start with one glass of water and spread intake through the day.",
          "الترطيب منخفض: ابدأ بكوب ماء الآن ووزع الشرب خلال اليوم."
        )
      : null,
    energyLevel <= 2
      ? text(
          "Energy is low: choose light activity and focus on rest and nutrition.",
          "الطاقة منخفضة: اختر نشاطًا خفيفًا وركز على الراحة والتغذية."
        )
      : null,
    physicalActivity <= 2
      ? text(
          "Activity is low: try a light 10-minute walk if appropriate for your condition.",
          "النشاط منخفض: جرّب مشيًا خفيفًا 10 دقائق إذا كان مناسبًا لحالتك."
        )
      : null,
  ].filter(Boolean) as string[];

  const todaysPrimaryFocus =
    focusItems[0] ||
    text(
      "Today looks stable. Keep your good habits and check in again later.",
      "الوضع اليوم مستقر. حافظ على العادات الجيدة وكرر التحديث لاحقًا."
    );

  const nextAfterSaveHref = wellnessScore < 60 ? "/health-plan" : "/history";
  const nextAfterSaveLabel =
    wellnessScore < 60
      ? text("Open Health Plan", "فتح خطة المتابعة")
      : text("Open Health History", "فتح التاريخ الصحي");

  const planImpact =
    wellnessScore >= 80
      ? text("Supports preventive plan", "يدعم الخطة الوقائية")
      : wellnessScore >= 60
      ? text("Keeps a stable follow-up plan", "يحافظ على خطة متابعة مستقرة")
      : wellnessScore >= 40
      ? text("Needs extra focus in the plan", "يحتاج تركيزًا إضافيًا في الخطة")
      : text("Needs recovery support and closer review", "يحتاج دعم تعافٍ ومراجعة أقرب");

  const weeklyPatternCards = [
    {
      label: text("Recent average", "متوسط آخر التحديثات"),
      value: averageRecentScore === null ? "—" : `${averageRecentScore}/100`,
      note: text("Reflects your recent pattern", "يعكس الاتجاه العام مؤخرًا"),
    },
    {
      label: text("Highest score", "أعلى نتيجة"),
      value: highestRecentScore === null ? "—" : `${highestRecentScore}/100`,
      note: text("Best point in this period", "أفضل نقطة خلال الفترة"),
    },
    {
      label: text("Lowest score", "أقل نتيجة"),
      value: lowestRecentScore === null ? "—" : `${lowestRecentScore}/100`,
      note: text("A point worth understanding", "نقطة تحتاج فهم السبب"),
    },
    {
      label: text("Most common mood", "المزاج الأكثر تكرارًا"),
      value: repeatedMood,
      note: text("Helps understand your baseline", "يساعد على فهم الحالة العامة"),
    },
    {
      label: text("Consistency", "الاستمرارية"),
      value: consistencyText,
      note: text(
        `${recentCheckIns.length} of last 7 check-ins`,
        `${recentCheckIns.length} من آخر 7 تحديثات`
      ),
    },
    {
      label: text("Trend", "الاتجاه"),
      value: trendText,
      note: text("Compared with the latest saved check-in", "مقارنة بآخر تحديث محفوظ"),
    },
  ];

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
      ? getStressRangeText(value, isArabic)
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
          style={{ width: "100%", accentColor: "var(--oh-primary)" }}
        />
      </div>
    );
  }

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        {loading ? (
          <section className="ohHero">
            <p className="ohEyebrow">
              {text("Loading Check-In", "تحميل Check-In")}
            </p>
            <h1 className="ohTitle">
              {text("Preparing your daily wellness view...", "جاري تحضير متابعة العافية اليومية...")}
            </h1>
            <p className="ohLead">
              {text(
                "OrganHeal is loading your recent wellness signals and check-in pattern.",
                "يقوم OrganHeal بتحميل إشارات العافية الأخيرة ونمط المتابعة."
              )}
            </p>
          </section>
        ) : (
          <>
            <section className="ohHero">
              <div className="ohHeroGrid">
                <div>
                  <p className="ohEyebrow">
                    {text("Daily Wellness Command Check-In", "مركز التحديث الصحي اليومي")}
                  </p>

                  <h1 className="ohTitle">
                    {text("How are you today?", "كيف حالك اليوم؟")}
                  </h1>

                  <p className="ohLead">
                    {text(
                      "Track mood, energy, stress, sleep, hydration, and activity. OrganHeal turns these daily signals into a clear wellness score and follow-up direction.",
                      "تابع المزاج، الطاقة، التوتر، النوم، الترطيب، والنشاط. يحوّل OrganHeal هذه الإشارات اليومية إلى مؤشر عافية واضح واتجاه متابعة."
                    )}
                  </p>

                  <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                    <a href="#daily-checkin-form" className="primaryBtn">
                      {savedToday
                        ? text("Update Today", "تحديث اليوم")
                        : text("Start Check-In", "ابدأ Check-In")}
                    </a>

                    <Link href="/history" className="secondaryBtn">
                      {text("View History", "عرض التاريخ")}
                    </Link>
                  </div>
                </div>

                <div className="ohCard">
                  <div className="ohCardHeader">
                    <div>
                      <p className="ohMetricLabel">
                        {text("Live Wellness Score", "مؤشر العافية الحالي")}
                      </p>
                      <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                        {scoreStatus}
                      </h2>
                    </div>

                    <span className={`ohStatusBadge ${scoreTone}`}>
                      {wellnessScore}/100
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      placeItems: "center",
                      margin: "20px 0",
                    }}
                  >
                    <div className="ohScoreRing" style={scoreRingStyle}>
                      <div>
                        <strong>{wellnessScore}</strong>
                        <span>{text("wellness", "العافية")}</span>
                      </div>
                    </div>
                  </div>

                  <p className="ohCardText">{scoreGuidance}</p>
                </div>
              </div>
            </section>

            <section className="ohMetricGrid">
              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Energy", "الطاقة")}
                </span>
                <span className="ohMetricValue">{energyLevel}/5</span>
                <span className="ohMetricHint">
                  {getRangeText(energyLevel, isArabic)}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Stress", "التوتر")}
                </span>
                <span className="ohMetricValue">{stressLevel}/5</span>
                <span className="ohMetricHint">
                  {getStressRangeText(stressLevel, isArabic)}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Sleep", "النوم")}
                </span>
                <span className="ohMetricValue">{sleepQuality}/5</span>
                <span className="ohMetricHint">
                  {getRangeText(sleepQuality, isArabic)}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Hydration", "الترطيب")}
                </span>
                <span className="ohMetricValue">{hydration}/5</span>
                <span className="ohMetricHint">
                  {getRangeText(hydration, isArabic)}
                </span>
              </article>
            </section>

            <section className="ohActionPanel">
              <div className="ohCardHeader" style={{ marginBottom: 0 }}>
                <div>
                  <p className="ohMetricLabel">
                    {text("Today's Primary Focus", "تركيز اليوم الأساسي")}
                  </p>

                  <h2 className="ohCardTitle" style={{ fontSize: "1.55rem" }}>
                    {planImpact}
                  </h2>

                  <p className="ohCardText">{todaysPrimaryFocus}</p>
                </div>

                <Link href={nextAfterSaveHref} className="primaryBtn">
                  {nextAfterSaveLabel}
                </Link>
              </div>
            </section>

            <section className="ohGrid cols2" id="daily-checkin-form">
              <article className="ohCard">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text("Daily Check-In Form", "نموذج التحديث اليومي")}
                    </p>

                    <h2 className="ohCardTitle">
                      {text("Update today's wellness signals", "حدّث إشارات العافية اليوم")}
                    </h2>

                    <p className="ohCardText">
                      {text(
                        "Move each slider from 1 to 5. For stress, higher means more stress.",
                        "حرّك كل مؤشر من 1 إلى 5. بالنسبة للتوتر، الرقم الأعلى يعني توترًا أعلى."
                      )}
                    </p>
                  </div>

                  <span className={`ohStatusBadge ${savedToday ? "good" : "neutral"}`}>
                    {savedToday ? text("Saved today", "محفوظ اليوم") : text("Not saved", "غير محفوظ")}
                  </span>
                </div>

                <div className="ohStack">
                  <div className="formGroup">
                    <label>{text("Mood", "المزاج")}</label>
                    <select
                      value={mood}
                      onChange={(event) => setMood(event.target.value)}
                    >
                      {moodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {isArabic ? option.ar : option.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    <RangeControl
                      label={text("Energy Level", "مستوى الطاقة")}
                      value={energyLevel}
                      onChange={setEnergyLevel}
                    />

                    <RangeControl
                      label={text("Stress Level", "مستوى التوتر")}
                      value={stressLevel}
                      onChange={setStressLevel}
                      reverseMeaning
                    />

                    <RangeControl
                      label={text("Sleep Quality", "جودة النوم")}
                      value={sleepQuality}
                      onChange={setSleepQuality}
                    />

                    <RangeControl
                      label={text("Hydration", "الترطيب")}
                      value={hydration}
                      onChange={setHydration}
                    />

                    <RangeControl
                      label={text("Physical Activity", "النشاط البدني")}
                      value={physicalActivity}
                      onChange={setPhysicalActivity}
                    />
                  </div>

                  <div className="formGroup">
                    <label>{text("Notes", "ملاحظات")}</label>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder={text(
                        "Optional: What affected your day?",
                        "اختياري: ما الذي أثّر على يومك؟"
                      )}
                      style={{
                        minHeight: "110px",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div className="ohButtonRow">
                    <button
                      className="primaryBtn"
                      onClick={saveCheckIn}
                      disabled={saving}
                    >
                      {saving
                        ? text("Saving...", "جاري الحفظ...")
                        : savedToday
                        ? text("Update Today's Check-In", "تحديث Check-In اليوم")
                        : text("Save Daily Check-In", "حفظ Check-In اليوم")}
                    </button>

                    <Link href="/history" className="secondaryBtn">
                      {text("View History", "عرض التاريخ")}
                    </Link>
                  </div>

                  {message && (
                    <div className="ohTrustNotice">
                      <span aria-hidden="true">ℹ️</span>
                      <div>{message}</div>
                    </div>
                  )}
                </div>
              </article>

              <article className="ohCard">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text("After Saving", "بعد الحفظ")}
                    </p>

                    <h2 className="ohCardTitle">
                      {text("What should you do next?", "ما الخطوة التالية؟")}
                    </h2>
                  </div>

                  <span className={`ohStatusBadge ${scoreTone}`}>
                    {scoreStatus}
                  </span>
                </div>

                <div className="ohStack">
                  <div className="ohMetricCard">
                    <span className="ohMetricLabel">
                      {text("Plan Impact Today", "تأثير اليوم على الخطة")}
                    </span>
                    <span className="ohMetricValue" style={{ fontSize: "1.25rem" }}>
                      {planImpact}
                    </span>
                    <span className="ohMetricHint">{scoreGuidance}</span>
                  </div>

                  <div className="ohMetricCard">
                    <span className="ohMetricLabel">
                      {text("Main Factor Today", "العامل الأهم اليوم")}
                    </span>
                    <span className="ohMetricValue" style={{ fontSize: "1.25rem" }}>
                      {stressLevel >= 4
                        ? text("Stress", "التوتر")
                        : sleepQuality <= 2
                        ? text("Sleep", "النوم")
                        : energyLevel <= 2
                        ? text("Energy", "الطاقة")
                        : hydration <= 2
                        ? text("Hydration", "الترطيب")
                        : physicalActivity <= 2
                        ? text("Activity", "النشاط")
                        : text("Stable pattern", "نمط مستقر")}
                    </span>
                    <span className="ohMetricHint">{todaysPrimaryFocus}</span>
                  </div>

                  <Link href={nextAfterSaveHref} className="primaryBtn">
                    {nextAfterSaveLabel}
                  </Link>
                </div>
              </article>
            </section>

            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Recent Wellness Pattern", "نمط العافية الأخير")}
                  </p>

                  <h2 className="ohCardTitle">
                    {text("Last 7 check-ins", "آخر 7 تحديثات")}
                  </h2>

                  <p className="ohCardText">
                    {text(
                      "These cards summarize your recent trend and help identify what needs attention.",
                      "هذه البطاقات تلخص اتجاهك الأخير وتساعد على تحديد ما يحتاج انتباهًا."
                    )}
                  </p>
                </div>

                <span className="ohStatusBadge neutral">
                  {recentCheckIns.length}/7
                </span>
              </div>

              <div className="ohGrid cols3">
                {weeklyPatternCards.map((card) => (
                  <article className="ohMetricCard" key={card.label}>
                    <span className="ohMetricLabel">{card.label}</span>
                    <span className="ohMetricValue" style={{ fontSize: "1.35rem" }}>
                      {card.value}
                    </span>
                    <span className="ohMetricHint">{card.note}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Recent Check-Ins", "آخر التحديثات")}
                  </p>

                  <h2 className="ohCardTitle">
                    {latestCheckIn
                      ? text("Your latest saved wellness records", "آخر سجلات العافية المحفوظة")
                      : text("No saved check-ins yet", "لا توجد تحديثات محفوظة بعد")}
                  </h2>
                </div>

                <Link href="/history" className="secondaryBtn">
                  {text("Open Full Timeline", "فتح المسار الكامل")}
                </Link>
              </div>

              {recentCheckIns.length === 0 ? (
                <div className="ohEmptyState">
                  <h2>{text("Start your first check-in", "ابدأ أول Check-In")}</h2>
                  <p>
                    {text(
                      "Save today's wellness signals to begin building your personal pattern.",
                      "احفظ إشارات العافية اليوم لتبدأ بناء نمطك الشخصي."
                    )}
                  </p>
                </div>
              ) : (
                <div className="ohTimeline">
                  {recentCheckIns.map((item) => (
                    <div className="ohTimelineItem" key={item.created_at}>
                      <span className="ohTimelineDot" />

                      <div>
                        <p className="ohTimelineTitle">
                          {localizeMood(item.mood, isArabic)} · {item.wellness_score}/100
                        </p>

                        <p className="ohTimelineMeta">
                          {text("Energy", "الطاقة")} {item.energy_level}/5 ·{" "}
                          {text("Stress", "التوتر")} {item.stress_level}/5 ·{" "}
                          {text("Sleep", "النوم")} {item.sleep_quality}/5
                        </p>

                        <p className="ohTimelineMeta">
                          {formatDate(item.created_at, isArabic)}
                        </p>
                      </div>

                      <span className={`ohStatusBadge ${getTone(item.wellness_score)}`}>
                        {getScoreStatus(item.wellness_score, isArabic)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="ohTrustNotice">
              <span aria-hidden="true">🛡️</span>
              <div>
                <strong>
                  {text("Medical safety reminder", "تذكير السلامة الطبية")}
                </strong>
                <br />
                {text(
                  "Daily check-ins help organize wellness patterns for education and follow-up preparation. They do not diagnose disease or replace urgent care. Seek medical help for severe symptoms, chest pain, shortness of breath, fainting, confusion, or thoughts of self-harm.",
                  "تساعد تحديثات Check-In على تنظيم نمط العافية للتعليم والتحضير للمتابعة. لا تشخّص المرض ولا تستبدل الرعاية العاجلة. اطلب مساعدة طبية عند وجود أعراض شديدة، ألم صدر، ضيق نفس، إغماء، تشوش، أو أفكار لإيذاء النفس."
                )}
              </div>
            </section>

            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Continue your journey", "تابع رحلتك")}
                  </p>

                  <h2 className="ohCardTitle">
                    {text("Connect check-ins to your health plan", "اربط Check-Ins بخطتك الصحية")}
                  </h2>

                  <p className="ohCardText">
                    {text(
                      "After saving your daily check-in, compare your trend, open the health plan, or connect your pattern with reports and intelligence.",
                      "بعد حفظ Check-In اليومي، قارن الاتجاه، افتح الخطة الصحية، أو اربط نمطك بالتقارير والذكاء الصحي."
                    )}
                  </p>
                </div>
              </div>

              <div className="ohButtonRow">
                <Link href="/history" className="primaryBtn">
                  {text("Progress Timeline", "مسار التقدم")}
                </Link>

                <Link href="/health-plan" className="secondaryBtn">
                  {text("Health Plan", "الخطة الصحية")}
                </Link>

                <Link href="/profile" className="secondaryBtn">
                  {text("Profile", "الملف الشخصي")}
                </Link>

                <Link href="/intelligence" className="secondaryBtn">
                  {text("Intelligence", "مركز الذكاء")}
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageBackLink from "@/app/components/navigation/PageBackLink";
import LearningProgress from "@/app/components/education/LearningProgress";
import LearningPath from "@/app/components/education/LearningPath";
import VideoLessonCard from "@/app/components/education/VideoLessonCard";
import InfoListCard from "@/app/components/education/InfoListCard";

type Language = "en" | "ar";

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const savedLanguage =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return savedLanguage === "ar" ? "ar" : "en";
}

export default function HeartLearningWorkspacePage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  useEffect(() => {
    function syncLanguage() {
      setLanguage(getStoredLanguage());
    }

    syncLanguage();
    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  const learningPath = [
    {
      step: "01",
      title: text("LDL Cholesterol", "كوليسترول LDL"),
      text: text(
        "Understand what LDL means and why it matters for heart risk.",
        "تعرّف على معنى LDL ولماذا يعد مهمًا لصحة القلب."
      ),
      href: "/blog?marker=LDL&from=/library/organs/heart",
      status: text("Start here", "ابدأ هنا"),
    },
    {
      step: "02",
      title: text("HDL and Triglycerides", "HDL والدهون الثلاثية"),
      text: text(
        "Learn how cholesterol numbers work together.",
        "تعلّم كيف تعمل مؤشرات الكوليسترول معًا."
      ),
      href: "/blog",
      status: text("Next", "التالي"),
    },
    {
      step: "03",
      title: text("Blood Pressure", "ضغط الدم"),
      text: text(
        "Understand how blood pressure affects your heart.",
        "افهم كيف يؤثر ضغط الدم على القلب."
      ),
      href: "/blog",
      status: text("Next", "التالي"),
    },
    {
      step: "04",
      title: text("Daily Habits", "العادات اليومية"),
      text: text(
        "Small daily habits that improve heart health.",
        "عادات يومية بسيطة تساعد على تحسين صحة القلب."
      ),
      href: "/blog",
      status: text("Practical", "عملي"),
    },
  ];

  const doctorQuestions = [
    text("Which result matters most in my case?", "أي نتيجة هي الأهم في حالتي؟"),
    text(
      "Do I need lifestyle changes, medication, or repeat testing?",
      "هل أحتاج إلى تغيير نمط الحياة، دواء، أو إعادة الفحص؟"
    ),
    text(
      "When should I repeat my cholesterol or blood pressure checks?",
      "متى يجب أن أعيد فحص الكوليسترول أو قياس ضغط الدم؟"
    ),
  ];

  const dailyMissions = [
    text("Review one heart marker.", "راجع مؤشرًا واحدًا مرتبطًا بالقلب."),
    text("Write one question for your doctor.", "اكتب سؤالًا واحدًا للطبيب."),
    text(
      "Choose one small habit to improve this week.",
      "اختر عادة صغيرة واحدة لتحسينها هذا الأسبوع."
    ),
  ];

  return (
    <main className="ohPageShell heartLearningPage" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .heartLearningPage .educationBackStrong a {
          background: linear-gradient(135deg, #0f766e, #0891b2) !important;
          color: #ffffff !important;
          border: 0 !important;
          font-weight: 950 !important;
          box-shadow: 0 14px 30px rgba(15, 118, 110, 0.24) !important;
        }

        .heartLearningPage .ohHero {
          background: linear-gradient(135deg, #062f2f, #0f766e) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 28px 70px rgba(15, 118, 110, 0.24);
        }

        .heartLearningPage .ohHero .ohEyebrow,
        .heartLearningPage .ohHero .ohTitle,
        .heartLearningPage .ohHero .ohLead,
        .heartLearningPage .ohHero .ohMetricLabel,
        .heartLearningPage .ohHero .ohCardTitle,
        .heartLearningPage .ohHero .ohCardText {
          color: #ffffff !important;
        }

        .heartLearningPage .ohHero .ohCard {
          background: rgba(255,255,255,0.10) !important;
          border: 1px solid rgba(255,255,255,0.18) !important;
          box-shadow: none !important;
        }

        .heartLearningPage .ohHero .primaryBtn {
          background: #22d3ee !important;
          color: #062f2f !important;
          border: 0 !important;
          font-weight: 950 !important;
        }

        .heartLearningPage .ohHero .secondaryBtn {
          background: rgba(255, 255, 255, 0.12) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.30) !important;
          font-weight: 950 !important;
        }

        .heartLearningPage .learningPathItem {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 16px;
          align-items: center;
        }

        .heartLearningPage .learningPathItem .secondaryBtn {
          background: linear-gradient(135deg, #0f766e, #0891b2) !important;
          color: #ffffff !important;
          border: 0 !important;
          font-weight: 950 !important;
          box-shadow: 0 14px 28px rgba(15, 118, 110, 0.22) !important;
        }

        .heartLearningPage .stepMark {
          display: inline-flex;
          width: 46px;
          height: 46px;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: #0f766e;
          color: #ffffff;
          font-weight: 950;
        }

        @media (max-width: 760px) {
          .heartLearningPage .learningPathItem {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <div className="educationBackStrong">
  <PageBackLink
    href="/library/organs"
    label={text("← Back to Organs", "← العودة إلى الأعضاء")}
  />
</div>

        <section className="ohHero">
          <p className="ohEyebrow">
            {text("Heart Learning Workspace", "مساحة تعلم القلب")}
          </p>

          <h1 className="ohTitle">
            {text("Start with one heart lesson today.", "ابدأ اليوم بدرس واحد عن صحة القلب.")}
          </h1>

          <p className="ohLead">
            {text(
              "Focus on LDL first. It is the best starting point for understanding cholesterol and heart risk.",
              "ابدأ أولًا بـ LDL، فهو نقطة بداية مناسبة لفهم الكوليسترول ومخاطر القلب."
            )}
          </p>

          <div className="ohGrid cols3" style={{ marginTop: "24px" }}>
            <article className="ohCard">
              <p className="ohMetricLabel">{text("Today's lesson", "درس اليوم")}</p>
              <h2 className="ohCardTitle">{text("LDL Cholesterol", "كوليسترول LDL")}</h2>
              <p className="ohCardText">
                {text("Understand what LDL means and why it matters.", "افهم معنى LDL ولماذا هو مهم.")}
              </p>
            </article>

            <article className="ohCard">
              <p className="ohMetricLabel">{text("Estimated time", "الوقت المتوقع")}</p>
              <h2 className="ohCardTitle">{text("4 minutes", "٤ دقائق")}</h2>
              <p className="ohCardText">
                {text("Short and easy to complete.", "قصير وسهل الإكمال.")}
              </p>
            </article>

            <article className="ohCard">
              <p className="ohMetricLabel">{text("Difficulty", "الصعوبة")}</p>
              <h2 className="ohCardTitle">{text("Easy", "سهل")}</h2>
              <p className="ohCardText">
                {text("Made for patients and families.", "مصمم للمرضى والعائلات.")}
              </p>
            </article>
          </div>

          <div className="ohButtonRow" style={{ marginTop: "24px" }}>
            <Link href="/blog?marker=LDL&from=/library/organs/heart" className="primaryBtn">
              {text("Start Lesson", "ابدأ الدرس")}
            </Link>

            <Link href="/heart" className="secondaryBtn">
              {text("Open Heart Page", "افتح صفحة القلب")}
            </Link>
          </div>
        </section>

        <VideoLessonCard
          label={text("Short lesson video", "فيديو تعليمي قصير")}
          title={text("Understanding LDL", "فهم LDL")}
          description={text(
            "A short lesson space for a future AI video that explains LDL in simple language.",
            "مساحة مخصصة لاحقًا لفيديو قصير يشرح LDL بلغة بسيطة."
          )}
          badge={text("4 min", "٤ دقائق")}
          noteLabel={text("Coming next", "قادم لاحقًا")}
          noteTitle={text("Video lesson placeholder", "مكان الفيديو التعليمي")}
          noteText={text(
            "This area will later hold a short video, audio explanation, or animated lesson.",
            "سيحتوي هذا الجزء لاحقًا على فيديو قصير، شرح صوتي، أو درس متحرك."
          )}
          actionHref="/blog?marker=LDL&from=/library/organs/heart"
          actionLabel={text("Read LDL Lesson", "اقرأ درس LDL")}
        />

        <LearningProgress
          label={text("Knowledge progress", "تقدم المعرفة")}
          title={text("Heart learning progress", "تقدم تعلم القلب")}
          description={text(
            "Your guided heart learning path starts here.",
            "يبدأ مسار تعلم القلب الموجّه من هنا."
          )}
          progressLabel="25%"
          progressValue={25}
        />

        <LearningPath
          label={text("Learning path", "مسار التعلم")}
          title={text("Follow the heart path step by step", "اتبع مسار القلب خطوة بخطوة")}
          description={text(
            "Start with LDL, then continue to pressure and daily habits.",
            "ابدأ بـ LDL، ثم انتقل إلى ضغط الدم والعادات اليومية."
          )}
          items={learningPath.map((item) => ({
            step: item.step,
            status: item.status,
            title: item.title,
            description: item.text,
            href: item.href,
            buttonLabel: text("Open", "افتح"),
          }))}
        />

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">{text("Quick check", "اختبار سريع")}</p>
              <h2 className="ohCardTitle">{text("Can you answer this?", "هل تستطيع الإجابة؟")}</h2>
              <p className="ohCardText">
                {text(
                  "Which cholesterol type is often called protective cholesterol?",
                  "أي نوع من الكوليسترول يُسمّى غالبًا الكوليسترول الواقي؟"
                )}
              </p>
            </div>

            <span className="ohStatusBadge neutral">{text("1 question", "سؤال واحد")}</span>
          </div>

          <div className="ohGrid cols3" style={{ marginTop: "18px" }}>
            <article className="ohCard">
              <p className="ohCardTitle">LDL</p>
              <p className="ohCardText">
                {text("Often linked with artery plaque risk.", "غالبًا يرتبط بخطر تراكم الدهون في الشرايين.")}
              </p>
            </article>

            <article className="ohCard">
              <p className="ohCardTitle">HDL</p>
              <p className="ohCardText">
                {text("Helps carry cholesterol away from the bloodstream.", "يساعد على نقل الكوليسترول بعيدًا عن الدم.")}
              </p>
            </article>

            <article className="ohCard">
              <p className="ohCardTitle">{text("Triglycerides", "الدهون الثلاثية")}</p>
              <p className="ohCardText">
                {text("A type of fat in the blood.", "نوع من الدهون في الدم.")}
              </p>
            </article>
          </div>
        </section>

        <section className="ohGrid cols2">
          <InfoListCard
            label={text("Doctor questions", "أسئلة للطبيب")}
            title={text("Ask better questions", "اطرح أسئلة أفضل")}
            items={doctorQuestions}
          />

          <InfoListCard
            label={text("Today's mission", "مهمة اليوم")}
            title={text("Keep it simple", "اجعلها بسيطة")}
            items={dailyMissions}
          />
        </section>
      </div>
    </main>
  );
}
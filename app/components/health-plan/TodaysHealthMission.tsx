type TodaysHealthMissionProps = {
  isArabic: boolean;
  priorityOrgan: string;
  primaryAction: string;
};

export default function TodaysHealthMission({
  isArabic,
  priorityOrgan,
  primaryAction,
}: TodaysHealthMissionProps) {
  return (
    <section
      className="healthPlanMissionCard"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <span>
        {isArabic
          ? "مهمة اليوم الصحية"
          : "Today’s Health Mission"}
      </span>

      <h2>
        {isArabic
          ? `ركّز اليوم على ${priorityOrgan}`
          : `Focus today on ${priorityOrgan}`}
      </h2>

      <p>
        {isArabic
          ? "ابدأ بخطوة واحدة عملية مرتبطة بأولويتك الحالية، ثم سجّل تقدمك ضمن مهام هذا الأسبوع."
          : "Start with one practical step connected to your current priority, then track your progress in this week’s tasks."}
      </p>

      <div className="healthPlanMissionAction">
        <strong>
          {isArabic
            ? "أهم خطوة الآن"
            : "Highest-impact action"}
        </strong>

        <p>{primaryAction}</p>
      </div>
    </section>
  );
}
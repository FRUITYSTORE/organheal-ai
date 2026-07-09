type TodaysHealthMissionProps = {
  isArabic: boolean;
  priorityOrgan: string;
  priorityScore: number | null;
  primaryAction: string;
};

export default function TodaysHealthMission({
  isArabic,
  priorityOrgan,
  priorityScore,
  primaryAction,
}: TodaysHealthMissionProps) {
  return (
    <section className="healthPlanMissionCard">
      <span>{isArabic ? "مهمة اليوم الصحية" : "Today’s Health Mission"}</span>

      <h2>
        {isArabic
          ? `ركّز اليوم على ${priorityOrgan}`
          : `Focus today on ${priorityOrgan}`}
      </h2>

      <p>
        {priorityScore !== null
          ? isArabic
            ? `درجة الأولوية الحالية ${priorityScore}/100.`
            : `Current priority score is ${priorityScore}/100.`
          : isArabic
          ? "نحتاج بيانات أكثر لتحديد درجة الأولوية."
          : "More data is needed to calculate the priority score."}
      </p>

      <div className="healthPlanMissionAction">
        <strong>{isArabic ? "أهم خطوة الآن" : "Highest-impact action"}</strong>
        <p>{primaryAction}</p>
      </div>
    </section>
  );
}
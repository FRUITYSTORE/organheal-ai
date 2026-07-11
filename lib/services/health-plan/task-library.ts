type Translate = (english: string, arabic: string) => string;

type BuildFallbackTasksInput = {
  priorityOrgan: string;
  isArabic: boolean;
  hasGenerated: boolean;
  hasReports: boolean;
  hasCheckIn: boolean;
  text: Translate;
};

const organTasks: Record<string, string[]> = {
  Heart: [
    "Review the latest patient summary and doctor-ready brief.",
    "Check blood pressure at least 3 times this week.",
    "Reduce salty or heavily processed food for the next 7 days.",
    "Walk for 20 minutes on at least 4 days this week.",
    "Track chest pain, shortness of breath, palpitation, or unusual fatigue.",
  ],
  Kidney: [
    "Review creatinine, eGFR, urine, and blood pressure trends.",
    "Track hydration and urine changes for the next 7 days.",
    "Avoid unnecessary NSAID painkillers unless prescribed.",
    "Reduce high-salt meals this week.",
    "Prepare questions for your doctor if swelling or urine changes appear.",
  ],
  Liver: [
    "Review liver enzymes and previous liver-related reports.",
    "Avoid alcohol and unnecessary supplements.",
    "Track fatigue, abdominal discomfort, yellowing, or dark urine.",
    "Reduce fried and high-fat meals this week.",
    "Prepare medication and supplement list for doctor review.",
  ],
  Lung: [
    "Track cough, breathing difficulty, and activity tolerance.",
    "Avoid smoke, dust, and strong respiratory irritants.",
    "Record oxygen saturation if clinically relevant and available.",
    "Review inhaler or respiratory medication adherence if applicable.",
    "Prepare questions if symptoms worsen at night or with activity.",
  ],
  Brain: [
    "Track sleep quality, headache pattern, focus, and stress level.",
    "Reduce late screen exposure before sleep.",
    "Practice a short breathing or relaxation routine daily.",
    "Review dizziness, weakness, numbness, or neurological warning symptoms.",
    "Prepare notes about sleep, headache, focus, or mood patterns.",
  ],
  Metabolic: [
    "Review glucose, HbA1c, cholesterol, weight, and waist trends.",
    "Reduce sugary drinks and refined carbohydrates.",
    "Walk or exercise for at least 20 minutes on 4 days this week.",
    "Track weight or waist measurement weekly.",
    "Choose one healthier meal replacement each day.",
  ],
  General: [
    "Review the latest report analysis.",
    "Complete one wellness check-in this week.",
    "Choose one realistic lifestyle action for the next 7 days.",
    "Repeat your priority assessment after 4 weeks.",
  ],
};

const arabicOrganTasks: Record<string, string[]> = {
  Heart: [
    "راجع ملخص المريض وملخص الطبيب من آخر تحليل.",
    "قِس ضغط الدم ثلاث مرات على الأقل هذا الأسبوع.",
    "قلل الملح والأطعمة المصنعة خلال الأيام القادمة.",
    "امشِ 20 دقيقة في 4 أيام على الأقل هذا الأسبوع.",
    "تابع ألم الصدر، ضيق النفس، الخفقان، أو التعب غير المعتاد.",
  ],
  Kidney: [
    "راجع الكرياتينين، eGFR، البول، وضغط الدم.",
    "تابع شرب الماء وتغيرات البول خلال 7 أيام.",
    "تجنب المسكنات غير الضرورية إلا إذا وصفها الطبيب.",
    "قلل الوجبات عالية الملح هذا الأسبوع.",
    "جهز أسئلة للطبيب إذا ظهر تورم أو تغير في البول.",
  ],
  Liver: [
    "راجع إنزيمات الكبد والتقارير السابقة.",
    "تجنب الكحول والمكملات غير الضرورية.",
    "تابع التعب، ألم البطن، الاصفرار، أو تغير لون البول.",
    "قلل المقليات والدهون هذا الأسبوع.",
    "جهز قائمة الأدوية والمكملات لمراجعتها مع الطبيب.",
  ],
  Lung: [
    "تابع السعال، ضيق التنفس، وتحمل النشاط.",
    "تجنب الدخان والغبار والروائح القوية.",
    "سجل الأكسجين إذا كان مناسبًا ومتاحًا.",
    "راجع الالتزام بالبخاخات أو أدوية التنفس إن وجدت.",
    "جهز أسئلة إذا زادت الأعراض ليلًا أو مع الحركة.",
  ],
  Brain: [
    "تابع النوم، الصداع، التركيز، ومستوى التوتر.",
    "قلل استخدام الشاشات قبل النوم.",
    "مارس تنفسًا هادئًا أو استرخاء قصيرًا يوميًا.",
    "راجع الدوخة، الضعف، التنميل، أو أي أعراض عصبية مقلقة.",
    "جهز ملاحظات عن النوم أو الصداع أو التركيز أو المزاج.",
  ],
  Metabolic: [
    "راجع السكر، HbA1c، الدهون، الوزن، ومحيط الخصر.",
    "قلل المشروبات السكرية والكربوهيدرات المكررة.",
    "امشِ أو مارس نشاطًا 20 دقيقة في 4 أيام هذا الأسبوع.",
    "تابع الوزن أو محيط الخصر أسبوعيًا.",
    "اختر وجبة واحدة يوميًا تكون صحية أكثر.",
  ],
  General: [
    "راجع آخر تحليل للتقرير الطبي.",
    "أكمل تحديثًا صحيًا واحدًا هذا الأسبوع.",
    "اختر عادة صحية واقعية للأيام السبعة القادمة.",
    "أعد تقييم الأولوية الصحية بعد 4 أسابيع.",
  ],
};

export function buildFallbackTasks({
  priorityOrgan,
  isArabic,
  hasGenerated,
  hasReports,
  hasCheckIn,
  text,
}: BuildFallbackTasksInput): string[] {
  const baseTasks = isArabic
    ? arabicOrganTasks[priorityOrgan] || arabicOrganTasks.General
    : organTasks[priorityOrgan] || organTasks.General;

  const dynamicTasks = [
    hasGenerated
      ? text(
          "Review the patient summary and doctor-ready brief from the latest analysis.",
          "راجع ملخص المريض وملخص الطبيب من آخر تحليل."
        )
      : hasReports
        ? text(
            "Analyze the latest saved report.",
            "حلّل أحدث تقرير محفوظ."
          )
        : null,

    !hasCheckIn
      ? text(
          "Complete a wellness check-in this week.",
          "أكمل تحديثًا صحيًا هذا الأسبوع."
        )
      : null,

    hasReports
      ? text(
          "Review extracted reports and connect them to this plan.",
          "راجع التقارير واربطها بالخطة."
        )
      : null,
  ].filter((task): task is string => Boolean(task));

  return [...dynamicTasks, ...baseTasks].slice(0, 8);
}
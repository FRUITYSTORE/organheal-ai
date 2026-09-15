import type {
  LabMarkerResult,
} from "./labMarkerDetector";

export type HealthStrategyResult = {
  healthRisks: string;
  actionPlan90Days: string;
  nutritionStrategy: string;
  followUpPlan: string;
};

type StrategyLanguage =
  | "en"
  | "ar";

function text(
  language: StrategyLanguage,
  english: string,
  arabic: string
): string {
  return language === "ar"
    ? arabic
    : english;
}

export function buildHealthStrategy(
  markers: LabMarkerResult[],
  language: StrategyLanguage = "en"
): HealthStrategyResult {
  const abnormal =
    markers.filter(
      (item) =>
        item.status === "High" ||
        item.status === "Low"
    );

  if (markers.length === 0) {
    return {
      healthRisks: text(
        language,
        "No structured lab risks were clearly detected from this report.",
        "لم يتم اكتشاف مخاطر مخبرية منظمة بوضوح من هذا التقرير."
      ),

      actionPlan90Days: text(
        language,
        "Upload a clearer lab report or review the original report with a licensed healthcare professional.",
        "ارفع تقريرًا مخبريًا أوضح أو راجع التقرير الأصلي مع مقدم رعاية صحية مرخص."
      ),

      nutritionStrategy: text(
        language,
        "Maintain balanced nutrition, hydration, regular activity, and routine preventive follow-up.",
        "حافظ على تغذية متوازنة، وترطيب جيد، ونشاط منتظم، ومتابعة وقائية دورية."
      ),

      followUpPlan: text(
        language,
        "Repeat or upload a clearer report if values are not readable. Review any symptoms or concerns with a licensed healthcare professional.",
        "أعد الفحص أو ارفع تقريرًا أوضح إذا كانت القيم غير مقروءة، وراجع أي أعراض أو مخاوف مع مقدم رعاية صحية مرخص."
      ),
    };
  }

  const hasBilirubin =
    abnormal.some(
      (item) =>
        item.marker ===
        "Bilirubin"
    );

  const hasLiver =
    abnormal.some(
      (item) =>
        [
          "ALT",
          "AST",
          "ALP",
          "Bilirubin",
        ].includes(
          item.marker
        )
    );

  const hasGlucose =
    abnormal.some(
      (item) =>
        [
          "Glucose",
          "HbA1c",
        ].includes(
          item.marker
        )
    );

  const hasLipids =
    abnormal.some(
      (item) =>
        [
          "LDL",
          "HDL",
          "Triglycerides",
        ].includes(
          item.marker
        )
    );

  const hasKidney =
    abnormal.some(
      (item) =>
        [
          "Creatinine",
          "Urea",
        ].includes(
          item.marker
        )
    );

  const hasThyroid =
    abnormal.some(
      (item) =>
        [
          "TSH",
          "FT4",
        ].includes(
          item.marker
        )
    );

  const hasVitaminD =
    abnormal.some(
      (item) =>
        item.marker ===
        "Vitamin D"
    );

  const risks: string[] = [];
  const actions: string[] = [];
  const nutrition: string[] = [];
  const followUp: string[] = [];

  if (
    hasLiver ||
    hasBilirubin
  ) {
    risks.push(
      text(
        language,
        "Possible liver or bile-related marker imbalance based on detected results.",
        "قد توجد مؤشرات على اضطراب مرتبط بالكبد أو القنوات الصفراوية بناءً على النتائج المكتشفة."
      )
    );

    actions.push(
      text(
        language,
        "Avoid alcohol and unnecessary liver-stressing supplements or medications unless approved by a clinician.",
        "تجنب الكحول والمكملات أو الأدوية غير الضرورية التي قد تزيد العبء على الكبد ما لم يوصِ بها الطبيب."
      )
    );

    actions.push(
      text(
        language,
        "Maintain hydration and monitor symptoms such as yellowing of eyes, dark urine, abdominal pain, or severe fatigue.",
        "حافظ على الترطيب وراقب أعراضًا مثل اصفرار العينين أو البول الداكن أو ألم البطن أو التعب الشديد."
      )
    );

    nutrition.push(
      text(
        language,
        "Prioritize vegetables, lean protein, whole grains, and reduce fried or highly processed foods.",
        "ركز على الخضروات والبروتين قليل الدهون والحبوب الكاملة، وقلل الأطعمة المقلية وعالية التصنيع."
      )
    );

    followUp.push(
      text(
        language,
        "Repeat liver panel including bilirubin, ALT, AST, ALP, and albumin in 4–12 weeks or sooner if symptoms exist.",
        "أعد فحوصات الكبد بما فيها البيليروبين وALT وAST وALP والألبومين خلال 4–12 أسبوعًا، أو أبكر عند وجود أعراض."
      )
    );
  }

  if (hasGlucose) {
    risks.push(
      text(
        language,
        "Possible blood sugar control concern based on detected glucose-related markers.",
        "قد توجد مشكلة في التحكم بسكر الدم بناءً على المؤشرات المرتبطة بالجلوكوز."
      )
    );

    actions.push(
      text(
        language,
        "Walk 20–30 minutes most days and reduce sugary drinks and refined carbohydrates.",
        "مارس المشي لمدة 20–30 دقيقة في معظم الأيام وقلل المشروبات السكرية والكربوهيدرات المكررة."
      )
    );

    nutrition.push(
      text(
        language,
        "Use a plate method: half vegetables, quarter protein, quarter whole grains or complex carbohydrates.",
        "استخدم طريقة تقسيم الطبق: نصفه خضروات، وربعه بروتين، وربعه حبوب كاملة أو كربوهيدرات معقدة."
      )
    );

    followUp.push(
      text(
        language,
        "Repeat fasting glucose and HbA1c as clinically appropriate.",
        "أعد فحص سكر الدم الصائم وHbA1c حسب التقييم السريري."
      )
    );
  }

  if (hasLipids) {
    risks.push(
      text(
        language,
        "Possible cardiovascular risk pattern based on lipid-related markers.",
        "قد يوجد نمط يزيد خطورة أمراض القلب والأوعية بناءً على مؤشرات الدهون."
      )
    );

    actions.push(
      text(
        language,
        "Increase weekly physical activity and reduce saturated fats, fried foods, and processed meats.",
        "زد النشاط البدني الأسبوعي وقلل الدهون المشبعة والأطعمة المقلية واللحوم المصنعة."
      )
    );

    nutrition.push(
      text(
        language,
        "Increase soluble fiber such as oats, legumes, vegetables, and consider fatty fish if suitable.",
        "زد الألياف القابلة للذوبان مثل الشوفان والبقوليات والخضروات، ويمكن إضافة الأسماك الدهنية إذا كانت مناسبة لك."
      )
    );

    followUp.push(
      text(
        language,
        "Repeat lipid profile in 8–12 weeks after lifestyle changes.",
        "أعد فحص دهون الدم خلال 8–12 أسبوعًا بعد تطبيق تغييرات نمط الحياة."
      )
    );
  }

  if (hasKidney) {
    risks.push(
      text(
        language,
        "Possible kidney function or hydration-related marker concern.",
        "قد توجد مؤشرات تحتاج إلى متابعة مرتبطة بوظائف الكلى أو حالة الترطيب."
      )
    );

    actions.push(
      text(
        language,
        "Maintain hydration and monitor blood pressure regularly if possible.",
        "حافظ على الترطيب وراقب ضغط الدم بانتظام إن أمكن."
      )
    );

    nutrition.push(
      text(
        language,
        "Avoid excessive salt intake and avoid high-protein extremes unless guided by a clinician.",
        "تجنب الإفراط في الملح والأنظمة شديدة الارتفاع بالبروتين ما لم تكن تحت إشراف طبي."
      )
    );

    followUp.push(
      text(
        language,
        "Repeat kidney function tests including creatinine, urea, eGFR, and urine testing if clinically needed.",
        "أعد فحوصات وظائف الكلى بما فيها الكرياتينين واليوريا وeGFR وفحوص البول إذا كانت مطلوبة سريريًا."
      )
    );
  }

  if (hasThyroid) {
    risks.push(
      text(
        language,
        "Possible thyroid function imbalance based on detected thyroid markers.",
        "قد يوجد اضطراب في وظيفة الغدة الدرقية بناءً على المؤشرات المكتشفة."
      )
    );

    actions.push(
      text(
        language,
        "Track symptoms such as fatigue, palpitations, weight change, heat/cold intolerance, or mood changes.",
        "راقب أعراضًا مثل التعب والخفقان وتغير الوزن وعدم تحمل الحرارة أو البرد وتغيرات المزاج."
      )
    );

    nutrition.push(
      text(
        language,
        "Maintain balanced nutrition and avoid self-starting iodine or thyroid supplements without medical advice.",
        "حافظ على تغذية متوازنة ولا تبدأ اليود أو مكملات الغدة الدرقية دون استشارة طبية."
      )
    );

    followUp.push(
      text(
        language,
        "Repeat TSH and FT4 and review with a licensed healthcare professional.",
        "أعد فحص TSH وFT4 وراجع النتائج مع مقدم رعاية صحية مرخص."
      )
    );
  }

  if (hasVitaminD) {
    risks.push(
      text(
        language,
        "Possible vitamin D insufficiency or deficiency pattern.",
        "قد يوجد نقص أو عدم كفاية في فيتامين د."
      )
    );

    actions.push(
      text(
        language,
        "Discuss vitamin D supplementation and safe sunlight exposure with a healthcare professional.",
        "ناقش مكملات فيتامين د والتعرض الآمن لأشعة الشمس مع مقدم رعاية صحية."
      )
    );

    nutrition.push(
      text(
        language,
        "Consider vitamin D sources such as fortified foods, eggs, and fatty fish if suitable.",
        "يمكن الاهتمام بمصادر فيتامين د مثل الأطعمة المدعمة والبيض والأسماك الدهنية إذا كانت مناسبة لك."
      )
    );

    followUp.push(
      text(
        language,
        "Repeat vitamin D level after 8–12 weeks if supplementation is started.",
        "أعد فحص مستوى فيتامين د بعد 8–12 أسبوعًا إذا بدأ العلاج بالمكملات."
      )
    );
  }

  if (abnormal.length === 0) {
    return {
      healthRisks: text(
        language,
        "No abnormal marker was detected based on common reference ranges.",
        "لم يتم اكتشاف مؤشرات غير طبيعية وفق النطاقات المرجعية المتاحة."
      ),

      actionPlan90Days: text(
        language,
        "Continue preventive habits: regular activity, balanced nutrition, hydration, sleep quality, and routine monitoring.",
        "استمر في العادات الوقائية مثل النشاط المنتظم والتغذية المتوازنة والترطيب والنوم الجيد والمتابعة الدورية."
      ),

      nutritionStrategy: text(
        language,
        "Maintain a balanced diet with vegetables, lean protein, whole grains, healthy fats, and reduced processed foods.",
        "حافظ على غذاء متوازن يشمل الخضروات والبروتين قليل الدهون والحبوب الكاملة والدهون الصحية مع تقليل الأطعمة المصنعة."
      ),

      followUpPlan: text(
        language,
        "Repeat routine labs based on age, risk factors, and healthcare professional advice.",
        "أعد الفحوصات الدورية حسب العمر وعوامل الخطورة وتوصيات مقدم الرعاية الصحية."
      ),
    };
  }

  return {
    healthRisks:
      risks
        .map(
          (item) =>
            `• ${item}`
        )
        .join("\n"),

    actionPlan90Days:
      actions
        .map(
          (item) =>
            `• ${item}`
        )
        .join("\n"),

    nutritionStrategy:
      nutrition
        .map(
          (item) =>
            `• ${item}`
        )
        .join("\n"),

    followUpPlan:
      followUp
        .map(
          (item) =>
            `• ${item}`
        )
        .join("\n"),
  };
}
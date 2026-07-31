export function buildGeneralEducationalResponse(
  message: string,
  language: "en" | "ar"
) {
  const isArabic = language === "ar";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("cholesterol") ||
    lowerMessage.includes("ldl") ||
    lowerMessage.includes("hdl") ||
    lowerMessage.includes("triglyceride") ||
    lowerMessage.includes("كوليسترول") ||
    lowerMessage.includes("دهون")
  ) {
    return isArabic
      ? "الكوليسترول والدهون الثلاثية من المؤشرات المهمة لصحة القلب والتمثيل الغذائي. ارتفاع LDL أو الدهون الثلاثية قد يرتبط بزيادة مخاطر القلب، بينما HDL غالبًا يعتبر عاملًا وقائيًا. الأفضل مناقشة القيم الفعلية مع الطبيب، خصوصًا عند وجود ضغط أو سكري أو تدخين أو تاريخ عائلي."
      : "Cholesterol and triglycerides are important markers for heart and metabolic health. Higher LDL or triglycerides may be linked with higher cardiovascular risk, while HDL is often considered protective. Discuss actual values with a clinician, especially if you have high blood pressure, diabetes, smoking exposure, or family history.";
  }

  if (
    lowerMessage.includes("heart") ||
    lowerMessage.includes("blood pressure") ||
    lowerMessage.includes("قلب") ||
    lowerMessage.includes("ضغط")
  ) {
    return isArabic
      ? "صحة القلب تتأثر بضغط الدم، الكوليسترول، النشاط البدني، الوزن، النوم، التدخين، والتغذية. ابدأ بقياس الضغط بانتظام، مراجعة الدهون، وزيادة الحركة تدريجيًا. هذا إرشاد تعليمي وليس تشخيصًا."
      : "Heart health is influenced by blood pressure, cholesterol, physical activity, weight, sleep, smoking exposure, and nutrition. A good starting point is regular blood pressure tracking, lipid review, and gradual activity improvement. This is educational guidance, not diagnosis.";
  }

  if (
    lowerMessage.includes("liver") ||
    lowerMessage.includes("alt") ||
    lowerMessage.includes("ast") ||
    lowerMessage.includes("كبد")
  ) {
    return isArabic
      ? "صحة الكبد تراجع غالبًا من خلال ALT وAST والبيليروبين والسياق الصحي العام. ارتفاع الإنزيمات قد يحتاج متابعة طبية، خاصة مع زيادة الوزن أو بعض الأدوية أو وجود أعراض. لا توقف أي دواء دون استشارة الطبيب."
      : "Liver health is often reviewed through ALT, AST, bilirubin, and overall clinical context. Elevated enzymes may need medical follow-up, especially with weight concerns, certain medications, or symptoms. Do not stop medications without clinician advice.";
  }

  if (
    lowerMessage.includes("kidney") ||
    lowerMessage.includes("creatinine") ||
    lowerMessage.includes("egfr") ||
    lowerMessage.includes("كلية") ||
    lowerMessage.includes("كلى")
  ) {
    return isArabic
      ? "صحة الكلى تفهم عادة من خلال الكرياتينين، eGFR، ضغط الدم، الترطيب، وتحليل البول. إذا كانت النتائج غير طبيعية أو لديك ضغط أو سكري، ناقشها مع الطبيب."
      : "Kidney health is commonly understood through creatinine, eGFR, blood pressure, hydration, and urine testing. If results are abnormal or you have hypertension or diabetes, discuss them with a clinician.";
  }

  if (
    lowerMessage.includes("sleep") ||
    lowerMessage.includes("stress") ||
    lowerMessage.includes("mood") ||
    lowerMessage.includes("نوم") ||
    lowerMessage.includes("توتر")
  ) {
    return isArabic
      ? "النوم والتوتر يؤثران على الطاقة، التركيز، الشهية، المناعة، وحتى المؤشرات القلبية والأيضية. ابدأ بتحسين وقت النوم، تقليل المنبهات مساءً، ومتابعة التوتر والنشاط بشكل منتظم."
      : "Sleep and stress affect energy, focus, appetite, immunity, and even heart and metabolic indicators. Start by improving sleep timing, reducing evening stimulants, and tracking stress and activity regularly.";
  }

  return isArabic
    ? "يمكنني مساعدتك تثقيفيًا في فهم صحة الأعضاء، المختبر، التقييمات، ونمط الحياة. للحصول على إرشاد شخصي أدق، أكمل تقييمًا صحيًا أو أضف تقريرًا طبيًا أو تحديثًا صحيًا."
    : "I can help educationally with organ health, labs, assessments, and lifestyle patterns. For more personalized guidance, complete an assessment, add a medical report, or submit a health check-in.";
}

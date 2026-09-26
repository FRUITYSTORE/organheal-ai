// Some report fields are stored as fixed English fallback sentences. When the
// viewer reads the site in Arabic, show the Arabic equivalent instead of a
// stray English line. Anything not in this list (for example a real AI
// analysis) is returned unchanged.
const STORED_FALLBACKS_AR: Record<string, string> = {
  "Review the important report findings and determine whether any follow-up is needed.":
    "راجع أهم نتائج التقرير وحدّد ما إذا كانت هناك حاجة إلى متابعة.",
  "Review this report with a licensed healthcare professional, especially if it contains abnormal results, symptoms, or follow-up instructions.":
    "راجع هذا التقرير مع مختص رعاية صحية مرخّص، خصوصًا إذا كان يتضمن نتائج غير طبيعية أو أعراضًا أو تعليمات متابعة.",
  "Key findings extracted from the report will be structured more deeply in the next phase.":
    "سيتم تنظيم النتائج الرئيسية المستخرجة من التقرير بشكل أعمق في المرحلة القادمة.",
  "Risk signals require medical marker detection and will be enhanced in the next version.":
    "تتطلب إشارات الخطورة اكتشاف المؤشرات الطبية وسيتم تحسينها في الإصدار القادم.",
  "The report text was extracted successfully, but more detailed AI interpretation will be improved in the next phase.":
    "تم استخراج نص التقرير بنجاح، وسيتم تحسين التفسير التفصيلي بالذكاء الاصطناعي في المرحلة القادمة.",
};

export function localizeStoredText(
  value: string | null | undefined,
  isArabic: boolean
): string | null {
  if (!value) {
    return null;
  }

  if (!isArabic) {
    return value;
  }

  return STORED_FALLBACKS_AR[value.trim()] ?? value;
}

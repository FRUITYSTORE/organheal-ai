import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import type {
  AssistantIntent,
} from "@/lib/health-intelligence/application/assistant-intent/assistant-intent";

export type BuildReportResponseInput = {
  lowerMessage: string;
  detectedIntent: AssistantIntent;
  isArabic: boolean;
  healthContext: AssistantResponseHealthContext;
  nextAction: string;
  doctorBrief: string;
  priorityArea: string;
};

export function buildReportResponse({
  lowerMessage,
  detectedIntent,
  isArabic,
  healthContext,
  nextAction,
  doctorBrief,
  priorityArea,
}: BuildReportResponseInput): string | null {
  const latestReport =
    healthContext.latestReportContext;
  
  const hasReportIntent =
  detectedIntent === "report" ||
  lowerMessage.includes("report") ||
    lowerMessage.includes("lab") ||
    lowerMessage.includes("result") ||
    lowerMessage.includes("finding") ||
    lowerMessage.includes("تقرير") ||
    lowerMessage.includes("فحص") ||
    lowerMessage.includes("نتيجة") ||
    lowerMessage.includes("نتائج");
  
  const hasDoctorIntent =
  detectedIntent === "doctor" ||
  lowerMessage.includes("doctor") ||
    lowerMessage.includes("visit") ||
    lowerMessage.includes("brief") ||
    lowerMessage.includes("طبيب") ||
    lowerMessage.includes("دكتور");
  
  const hasFindingsIntent =
    lowerMessage.includes("finding") ||
    lowerMessage.includes("findings") ||
    lowerMessage.includes("abnormal") ||
    lowerMessage.includes("summary") ||
    lowerMessage.includes("show") ||
    lowerMessage.includes("نتائج") ||
    lowerMessage.includes("نتيجة") ||
    lowerMessage.includes("غير طبيعي") ||
    lowerMessage.includes("ملخص");
  
  const hasReportActionIntent =
  detectedIntent === "next-step" ||
  lowerMessage.includes("next") ||
    lowerMessage.includes("action") ||
    lowerMessage.includes("recommend") ||
    lowerMessage.includes("what should i do") ||
    lowerMessage.includes("الخطوة") ||
    lowerMessage.includes("ماذا أفعل") ||
    lowerMessage.includes("توصية") ||
    lowerMessage.includes("توصيات");
  
  if (hasReportIntent && !latestReport) {
    return isArabic
      ? `لا يوجد تقرير طبي حديث متاح في سياقك الصحي حاليًا.
  
  يمكنك رفع تقرير طبي جديد ثم تحليله في OrganHeal للحصول على إرشاد أكثر تخصيصًا.`
      : `There is no recent medical report available in your current health context.
  
  You can upload and analyze a medical report in OrganHeal to receive more personalized guidance.`;
  }
  
  /*
   * 1. Doctor + Report
   * Highest-priority report intent because the user is asking
   * specifically how the report should inform a doctor discussion.
   */
  if (
    hasReportIntent &&
    hasDoctorIntent &&
    latestReport
  ) {
    return isArabic
      ? `للتحضير لمناقشة أحدث تقرير مع طبيبك، ركّز على:
  
  التقرير:
  ${latestReport.fileName}
  
  الملخص المخصص للطبيب:
  ${latestReport.doctorBrief || latestReport.summary || "لا يوجد ملخص مخصص للطبيب محفوظ حاليًا."}
  
  أهم النتائج التي تستحق المناقشة:
  ${latestReport.keyFindings || "لا توجد نتائج رئيسية محفوظة حاليًا."}
  
  التوصيات:
  ${latestReport.recommendations || "لا توجد توصيات محفوظة حاليًا."}
  
  الخطوة التالية المقترحة:
  ${latestReport.nextBestAction || nextAction}
  
  يمكنك استخدام هذه النقاط للتحضير للمناقشة، لكنها لا تستبدل تقييم الطبيب أو تشخيصه.`
      : `To prepare for a discussion with your doctor about your latest report, focus on:
  
  Report:
  ${latestReport.fileName}
  
  Doctor-focused summary:
  ${latestReport.doctorBrief || latestReport.summary || "No doctor-focused summary is currently saved."}
  
  Key findings worth discussing:
  ${latestReport.keyFindings || "No key findings are currently saved."}
  
  Recommendations:
  ${latestReport.recommendations || "No saved recommendations are currently available."}
  
  Suggested next step:
  ${latestReport.nextBestAction || nextAction}
  
  You can use these points to prepare for the discussion, but they do not replace your clinician's assessment or diagnosis.`;
  }
  
  /*
   * 2. Report Findings
   */
  if (
    hasReportIntent &&
    hasFindingsIntent &&
    latestReport
  ) {
    return isArabic
      ? `أهم المعلومات في أحدث تقرير لديك هي:
  
  التقرير:
  ${latestReport.fileName}
  
  نوع التقرير:
  ${latestReport.reportType}
  
  الملخص:
  ${latestReport.summary || "لا يتوفر ملخص للتقرير حاليًا."}
  
  أهم النتائج:
  ${latestReport.keyFindings || "لا توجد نتائج رئيسية محفوظة حاليًا."}
  
  مستوى المخاطر:
  ${latestReport.riskLevel || "غير محدد حاليًا."}
  
  هذه المعلومات مأخوذة من التحليل المحفوظ للتقرير وهي للتثقيف الصحي وليست تشخيصًا طبيًا.`
      : `The main information from your latest report is:
  
  Report:
  ${latestReport.fileName}
  
  Report type:
  ${latestReport.reportType}
  
  Summary:
  ${latestReport.summary || "No report summary is currently available."}
  
  Key findings:
  ${latestReport.keyFindings || "No key findings are currently saved."}
  
  Risk level:
  ${latestReport.riskLevel || "Not currently specified."}
  
  This information comes from the saved report analysis and is for health education, not medical diagnosis.`;
  }
  
  /*
   * 3. Report Next Action
   */
  if (
    hasReportIntent &&
    hasReportActionIntent &&
    latestReport
  ) {
    return isArabic
      ? `بناءً على أحدث تقرير لديك، ركّز على الخطوة العملية التالية:
  
  التقرير:
  ${latestReport.fileName}
  
  التوصيات:
  ${latestReport.recommendations || "لا توجد توصيات محفوظة حاليًا."}
  
  الخطوة التالية:
  ${latestReport.nextBestAction || nextAction}
  
  مستوى المخاطر:
  ${latestReport.riskLevel || "غير محدد حاليًا."}
  
  إذا كانت لديك أعراض جديدة أو متفاقمة، يجب أن يعتمد قرار المتابعة على تقييم طبي مناسب.`
      : `Based on your latest report, the practical next step is:
  
  Report:
  ${latestReport.fileName}
  
  Recommendations:
  ${latestReport.recommendations || "No saved recommendations are currently available."}
  
  Next step:
  ${latestReport.nextBestAction || nextAction}
  
  Risk level:
  ${latestReport.riskLevel || "Not currently specified."}
  
  If you have new or worsening symptoms, follow-up decisions should be based on appropriate clinical evaluation.`;
  }
  
  /*
   * 4. General Report
   */
  if (hasReportIntent && latestReport) {
    return isArabic
      ? `بناءً على أحدث تقرير طبي لديك:
  
  التقرير:
  ${latestReport.fileName}
  
  نوع التقرير:
  ${latestReport.reportType}
  
  الملخص:
  ${latestReport.summary || "لا يتوفر ملخص للتقرير حاليًا."}
  
  أهم النتائج:
  ${latestReport.keyFindings || "لا توجد نتائج رئيسية محفوظة حاليًا."}
  
  الخطوة التالية:
  ${latestReport.nextBestAction || nextAction}
  
  يمكنني أيضًا مساعدتك في فهم النتائج، الخطوة التالية، أو ما الذي يمكنك مناقشته مع الطبيب.`
      : `Based on your latest medical report:
  
  Report:
  ${latestReport.fileName}
  
  Report type:
  ${latestReport.reportType}
  
  Summary:
  ${latestReport.summary || "No report summary is currently available."}
  
  Key findings:
  ${latestReport.keyFindings || "No key findings are currently saved."}
  
  Next step:
  ${latestReport.nextBestAction || nextAction}
  
  I can also help you understand the findings, the next step, or what you may want to discuss with your doctor.`;
  }
  
  /*
   * 5. General Doctor
   */
  if (hasDoctorIntent) {
    return isArabic
      ? `هذه المعلومات يمكن استخدامها للتحضير لمناقشتك مع الطبيب:
  
  ${doctorBrief}
  
  منطقة الأولوية الحالية:
  ${priorityArea}
  
  الخطوة التالية المقترحة:
  ${nextAction}
  
  هذا ملخص تثقيفي ولا يستبدل التقييم أو التشخيص الطبي.`
      : `You can use the following information to prepare for your discussion with your doctor:
  
  ${doctorBrief}
  
  Current priority area:
  ${priorityArea}
  
  Suggested next step:
  ${nextAction}
  
  This is educational support and does not replace medical assessment or diagnosis.`;
  }

  return null;
}

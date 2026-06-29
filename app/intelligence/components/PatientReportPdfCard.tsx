"use client";

import { useRef } from "react";
import { text, useArabicUi } from "./ArabicUiHelper";

type ExecutiveSummary = {
  currentScore?: number;
  forecastScore?: number;
  confidenceLevel?: string;
  prioritySystem?: string;
  nextBestAction?: string;
};

type PatientReportPdfCardProps = {
  fileName: string;
  uploadedAtText: string;
  summary: string | null | undefined;
  keyFindings: string | null | undefined;
  riskSignals: string | null | undefined;
  recommendations: string | null | undefined;
  healthStory: string | null | undefined;
  executiveSummary: ExecutiveSummary | null | undefined;
};

function arabicValue(value: unknown) {
  const clean = text(value, "");
  if (!clean) return "غير متاح";

  const map: Record<string, string> = {
    "Laboratory Report": "تقرير مختبر",
    "Lab Report": "تقرير مختبر",
    "Medical Report": "تقرير طبي",
    "Radiology Report": "تقرير أشعة",
    "Discharge Summary": "ملخص خروج",
    "Liver Health": "صحة الكبد",
    "Kidney Health": "صحة الكلى",
    "Heart Health": "صحة القلب",
    "Lung Health": "صحة الرئتين",
    "Preventive Health Monitoring": "متابعة صحية وقائية",
    Low: "منخفض",
    Moderate: "متوسط",
    High: "مرتفع",
  };

  return map[clean] || clean;
}

function englishStatusToArabic(value: string) {
  const clean = value.toLowerCase();

  if (clean.includes("normal")) return "طبيعي";
  if (clean.includes("high")) return "مرتفع";
  if (clean.includes("low")) return "منخفض";
  if (clean.includes("moderate")) return "متوسط";

  return value;
}

function extractLabMarkers(...values: Array<string | null | undefined>) {
  const combined = values.filter(Boolean).join("\n");

  const matches = Array.from(
    combined.matchAll(
      /([A-Za-z][A-Za-z0-9 %()\/.-]{1,40}):\s*([0-9.]+)\s*([A-Za-z/%µ]+)?\s*\((Normal|High|Low|Moderate)\)\s*\|\s*Ref:\s*([^\n.]+)/gi
    )
  );

  return matches.map((match) => ({
    name: match[1].trim(),
    value: match[2].trim(),
    unit: (match[3] || "").trim(),
    status: englishStatusToArabic(match[4]),
    ref: match[5].replace(/\(default\)/gi, "").trim(),
  }));
}

function ArabicParagraph({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        lineHeight: 1.9,
        whiteSpace: "pre-line",
        direction: "rtl",
        textAlign: "right",
        unicodeBidi: "isolate",
        fontFamily: "Tahoma, Arial, sans-serif",
      }}
    >
      {children}
    </p>
  );
}

function EnglishParagraph({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ lineHeight: 1.8, whiteSpace: "pre-line" }}>
      {children}
    </p>
  );
}

export default function PatientReportPdfCard({
  fileName,
  uploadedAtText,
  summary,
  keyFindings,
  riskSignals,
  recommendations,
  healthStory,
  executiveSummary,
}: PatientReportPdfCardProps) {
  const isArabic = useArabicUi();
  const patientReportRef = useRef<HTMLDivElement>(null);
  const generatedAtText = new Date().toLocaleString(isArabic ? "ar" : undefined);
  const labMarkers = extractLabMarkers(summary, keyFindings, riskSignals, recommendations);
  const mainFocus = arabicValue(executiveSummary?.prioritySystem);

  async function downloadPatientPdf() {
    if (!patientReportRef.current) return;

    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default || html2pdfModule;

    const reportElement = patientReportRef.current.cloneNode(true) as HTMLElement;

    reportElement
      .querySelectorAll(".patientReportActions")
      .forEach((element) => element.remove());

    reportElement.style.background = "#ffffff";
    reportElement.style.color = "#111827";
    reportElement.style.padding = "24px";
    reportElement.style.border = "none";
    reportElement.style.boxShadow = "none";
    reportElement.style.direction = isArabic ? "rtl" : "ltr";
    reportElement.style.textAlign = isArabic ? "right" : "left";
    reportElement.style.fontFamily = isArabic ? "Tahoma, Arial, sans-serif" : "Arial, sans-serif";

    reportElement.querySelectorAll("*").forEach((element) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.color = "#111827";
      htmlElement.style.fontFamily = isArabic ? "Tahoma, Arial, sans-serif" : "Arial, sans-serif";
      htmlElement.style.unicodeBidi = "isolate";
      htmlElement.style.letterSpacing = "normal";
      htmlElement.style.wordSpacing = "normal";
      htmlElement.style.textTransform = "none";
      htmlElement.style.fontVariant = "normal";
    });

    const safeFileName = fileName.replace(/[^a-z0-9]/gi, "-").toLowerCase();

    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `OrganHeal-Patient-Report-${safeFileName}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(reportElement)
      .save();
  }

  return (
    <>
      <style>{`
        .patientReportPdfArea[lang="ar"],
        .patientReportPdfArea[lang="ar"] *,
        .doctorBriefReportArea[lang="ar"],
        .doctorBriefReportArea[lang="ar"] * {
          letter-spacing: normal !important;
          word-spacing: normal !important;
          text-transform: none !important;
          font-variant: normal !important;
          font-feature-settings: normal !important;
          font-family: Tahoma, Arial, sans-serif !important;
          unicode-bidi: isolate;
        }

        .patientReportPdfArea[lang="ar"] h1,
        .patientReportPdfArea[lang="ar"] h2,
        .patientReportPdfArea[lang="ar"] h3,
        .doctorBriefReportArea[lang="ar"] h1,
        .doctorBriefReportArea[lang="ar"] h2,
        .doctorBriefReportArea[lang="ar"] h3 {
          letter-spacing: normal !important;
          word-spacing: normal !important;
          text-transform: none !important;
          line-height: 1.35 !important;
        }
      `}</style>

    <div ref={patientReportRef}
      className="resultBox patientReportPdfArea"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
      style={{
        textAlign: isArabic ? "right" : "left",
        fontFamily: isArabic ? "Tahoma, Arial, sans-serif" : undefined,
        unicodeBidi: "isolate",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div>
          <p className="sectionLabel" style={{ marginTop: "8px" }}>
            {isArabic ? "تقرير المريض" : "👤 PATIENT REPORT"}
          </p>

          <h2 style={{ marginBottom: "6px" }}>
            {isArabic ? "ملخص صحي مبسط للمريض" : "Patient-Friendly Health Summary"}
          </h2>

          <p style={{ opacity: 0.78, lineHeight: 1.7, maxWidth: "720px" }}>
            {isArabic
              ? "نسخة عربية مبسطة تساعدك على فهم التقرير الصحي وتجهيز أسئلة أفضل للطبيب."
              : "A calm, simple explanation to help you understand your report and what to discuss with your doctor."}
          </p>
        </div>

        <div className="patientReportActions" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button className="primaryBtn" onClick={downloadPatientPdf}>
            {isArabic ? "تنزيل تقرير المريض PDF" : "Download Patient PDF"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
          padding: "14px",
          borderRadius: "16px",
          background: "rgba(15,23,42,0.38)",
          border: "1px solid rgba(148,163,184,0.18)",
        }}
      >
        <div>
          <strong>{isArabic ? "التقرير" : "Report"}</strong>
          <p>{fileName}</p>
        </div>

        <div>
          <strong>{isArabic ? "تاريخ الرفع" : "Uploaded"}</strong>
          <p>{uploadedAtText}</p>
        </div>

        <div>
          <strong>{isArabic ? "تاريخ الإنشاء" : "Generated"}</strong>
          <p>{generatedAtText}</p>
        </div>

        <div>
          <strong>{isArabic ? "التركيز الرئيسي" : "Main Focus"}</strong>
          <p>{isArabic ? mainFocus : executiveSummary?.prioritySystem || "N/A"}</p>
        </div>
      </div>

      {isArabic ? (
        <div>
          <h3>١. ماذا يعني هذا التقرير؟</h3>
          <ArabicParagraph>
            تمت مراجعة التقرير بواسطة OrganHeal AI بهدف تقديم ملخص تثقيفي مبسط.
            التركيز الرئيسي الظاهر في هذا التقرير هو: {mainFocus}.
            هذا الملخص لا يضع تشخيصًا، لكنه يساعدك على فهم الاتجاه العام ومناقشة النتائج مع الطبيب.
          </ArabicParagraph>

          <h3>٢. أهم المؤشرات التي ظهرت</h3>
          {labMarkers.length > 0 ? (
            <div style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
              {labMarkers.map((marker, index) => (
                <div
                  key={`${marker.name}-${index}`}
                  style={{
                    padding: "12px",
                    borderRadius: "14px",
                    background: "rgba(15,23,42,0.22)",
                    border: "1px solid rgba(148,163,184,0.18)",
                  }}
                >
                  <strong>{marker.name}</strong>
                  <ArabicParagraph>
                    القيمة: {marker.value} {marker.unit} — الحالة: {marker.status}
                    {marker.ref ? ` — المرجع: ${marker.ref}` : ""}
                  </ArabicParagraph>
                </div>
              ))}
            </div>
          ) : (
            <ArabicParagraph>
              لا توجد مؤشرات مختبرية واضحة يمكن استخراجها بشكل منظم من النص الحالي.
              يُنصح بمراجعة التقرير الأصلي مع مختص صحي.
            </ArabicParagraph>
          )}

          <h3>٣. ما الذي قد يحتاج إلى انتباه؟</h3>
          <ArabicParagraph>
            إذا كانت هناك أعراض أو قيم متكررة خارج المجال الطبيعي، يجب مناقشتها مع طبيب مرخص.
            في حال عدم وجود مؤشرات غير طبيعية واضحة، تبقى المتابعة المنتظمة وإعادة الفحوصات عند الحاجة خطوة مهمة.
          </ArabicParagraph>

          <h3>٤. خطوات تالية مفيدة</h3>
          <ArabicParagraph>
            راجع التقرير مع مقدم رعاية صحية مرخص، وكرر الفحوصات ذات العلاقة حسب توصية الطبيب.
            احتفظ بنسخة من التقرير للمقارنة مع النتائج القادمة، خاصة إذا كان هناك متابعة للكبد أو الكلى أو القلب أو مؤشرات الدم.
          </ArabicParagraph>

          <h3>٥. اتجاهك الصحي</h3>
          <div
            style={{
              padding: "14px",
              borderRadius: "16px",
              background: "rgba(15,23,42,0.28)",
              border: "1px solid rgba(148,163,184,0.18)",
              marginBottom: "18px",
            }}
          >
            <p><strong>النتيجة الصحية الحالية:</strong> {executiveSummary?.currentScore ?? "غير متاح"}</p>
            <p><strong>الاتجاه الصحي المتوقع:</strong> {executiveSummary?.forecastScore ?? "غير متاح"}</p>
            <p><strong>الثقة:</strong> {arabicValue(executiveSummary?.confidenceLevel)}</p>
            <p><strong>أفضل خطوة تالية:</strong> {"راجع المؤشرات مع مقدم رعاية صحية مرخص، وكرر الفحوصات ذات العلاقة حسب التوصية."}</p>
          </div>

          <h3>ملاحظة مهمة</h3>
          <ArabicParagraph>
            هذا التقرير للتثقيف والفهم الشخصي فقط. لا يستبدل الاستشارة الطبية أو التشخيص أو العلاج.
            راجع النتائج دائمًا مع مقدم رعاية صحية مرخص.
          </ArabicParagraph>
        </div>
      ) : (
        <div>
          <h3>1. What This Report Means</h3>
          <EnglishParagraph>{text(summary, "Your report was reviewed by OrganHeal AI and summarized in a simple way.")}</EnglishParagraph>

          <h3>2. Main Things Noticed</h3>
          <EnglishParagraph>{text(keyFindings, "No major findings were clearly identified from the available data.")}</EnglishParagraph>

          <h3>3. What May Need Attention</h3>
          <EnglishParagraph>{text(riskSignals, "No urgent warning signals were clearly detected. Please review your original report with a healthcare professional.")}</EnglishParagraph>

          <h3>4. Helpful Next Steps</h3>
          <EnglishParagraph>{text(recommendations || executiveSummary?.nextBestAction, "Follow up with your healthcare provider if you have symptoms or concerns.")}</EnglishParagraph>

          <h3>5. Your Health Story in Simple Words</h3>
          <EnglishParagraph>{text(healthStory, "As more assessments, check-ins, and reports are added, OrganHeal will build a clearer picture of your health journey.")}</EnglishParagraph>
        </div>
      )}
    </div>
    </>
  );
}

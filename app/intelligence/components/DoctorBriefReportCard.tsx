"use client";

import { useRef } from "react";
import { text, useArabicUi } from "./ArabicUiHelper";

type ExecutiveSummary = {
  currentScore?: number;
  trend?: string;
  forecastScore?: number;
  confidenceLevel?: string;
  confidenceScore?: number;
  prioritySystem?: string;
  nextBestAction?: string;
};

type DoctorBriefReportCardProps = {
  fileName: string;
  reportTypeLabel: string;
  uploadedAtText: string;
  summary: string | null | undefined;
  keyFindings: string | null | undefined;
  riskSignals: string | null | undefined;
  recommendations: string | null | undefined;
  doctorBrief: string | null | undefined;
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


function applyProfessionalPdfLayout(reportElement: HTMLElement, isArabic: boolean) {
  const style = document.createElement("style");

  style.textContent = `
    /* ORGANHEAL_ARABIC_PDF_PAGEBREAK_PATCH */
    .organhealPdfPage {
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: 100% !important;
      padding: 18px 18px !important;
      overflow: visible !important;
    }

    .organhealPdfPage,
    .organhealPdfPage * {
      box-sizing: border-box !important;
      max-width: 100% !important;
      overflow-wrap: break-word !important;
      word-break: normal !important;
    }

    .organhealPdfPage[lang="ar"],
    .organhealPdfPage[lang="ar"] * {
      direction: rtl !important;
      text-align: right !important;
      font-family: Tahoma, Arial, sans-serif !important;
      letter-spacing: normal !important;
      word-spacing: normal !important;
      text-transform: none !important;
      unicode-bidi: isolate !important;
    }

    .organhealPdfPage h1,
    .organhealPdfPage h2,
    .organhealPdfPage h3 {
      break-after: avoid !important;
      page-break-after: avoid !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-top: 18px !important;
      margin-bottom: 10px !important;
      line-height: 1.35 !important;
    }

    .organhealPdfPage p,
    .organhealPdfPage li,
    .organhealPdfPage strong {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      orphans: 3 !important;
      widows: 3 !important;
    }

    .organhealPdfPage div {
      orphans: 3 !important;
      widows: 3 !important;
    }

    .organhealPdfKeepTogether {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      break-before: auto !important;
      page-break-before: auto !important;
      break-after: auto !important;
      page-break-after: auto !important;
    }

    .organhealPdfSection {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 16px !important;
      padding-bottom: 6px !important;
    }

    .organhealPdfSoftSection {
      break-inside: auto !important;
      page-break-inside: auto !important;
      margin-bottom: 18px !important;
    }
  `;

  reportElement.prepend(style);

  reportElement.classList.add("organhealPdfPage");

  reportElement.style.boxSizing = "border-box";
  reportElement.style.width = "100%";
  reportElement.style.maxWidth = "100%";
  reportElement.style.padding = "22px 24px";
  reportElement.style.overflow = "visible";
  reportElement.style.direction = isArabic ? "rtl" : "ltr";
  reportElement.style.textAlign = isArabic ? "right" : "left";
  reportElement.style.fontFamily = isArabic
    ? "Tahoma, Arial, sans-serif"
    : "Arial, sans-serif";

  reportElement.querySelectorAll("h1, h2, h3").forEach((element) => {
    const htmlElement = element as HTMLElement;

    htmlElement.style.breakAfter = "avoid";
    htmlElement.style.pageBreakAfter = "avoid";
    htmlElement.style.breakInside = "avoid";
    htmlElement.style.pageBreakInside = "avoid";
    htmlElement.style.marginTop = "18px";
    htmlElement.style.marginBottom = "10px";
    htmlElement.style.lineHeight = "1.35";
    htmlElement.style.letterSpacing = "normal";
    htmlElement.style.wordSpacing = "normal";
    htmlElement.style.textTransform = "none";
    htmlElement.classList.add("organhealPdfKeepTogether");
  });

  reportElement.querySelectorAll("p, li").forEach((element) => {
    const htmlElement = element as HTMLElement;

    htmlElement.style.breakInside = "avoid";
    htmlElement.style.pageBreakInside = "avoid";
    htmlElement.style.orphans = "3";
    htmlElement.style.widows = "3";
    htmlElement.style.lineHeight = "1.85";
    htmlElement.style.letterSpacing = "normal";
    htmlElement.style.wordSpacing = "normal";
    htmlElement.style.textTransform = "none";
  });

  reportElement.querySelectorAll("h3").forEach((heading) => {
    const nextElement = heading.nextElementSibling as HTMLElement | null;

    if (nextElement) {
      nextElement.style.breakBefore = "avoid";
      nextElement.style.pageBreakBefore = "avoid";
    }
  });

  reportElement.querySelectorAll("div").forEach((element) => {
    const htmlElement = element as HTMLElement;

    const textLength = (htmlElement.textContent || "").trim().length;

    if (textLength > 0 && textLength < 900) {
      htmlElement.classList.add("organhealPdfSection");
    } else {
      htmlElement.classList.add("organhealPdfSoftSection");
    }
  });
}

export default function DoctorBriefReportCard({
  fileName,
  reportTypeLabel,
  uploadedAtText,
  summary,
  keyFindings,
  riskSignals,
  recommendations,
  doctorBrief,
  executiveSummary,
}: DoctorBriefReportCardProps) {
  const isArabic = useArabicUi();
  const printRef = useRef<HTMLDivElement>(null);
  const generatedAtText = new Date().toLocaleString(isArabic ? "ar" : undefined);
  const labMarkers = extractLabMarkers(summary, keyFindings, riskSignals, recommendations, doctorBrief);
  const mainFocus = arabicValue(executiveSummary?.prioritySystem);
  const reportType = arabicValue(reportTypeLabel);

  function printDoctorBriefOnly() {
    if (!printRef.current) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      window.print();
      return;
    }

    const direction = isArabic ? "rtl" : "ltr";
    const align = isArabic ? "right" : "left";
    const title = isArabic ? "ملخص الطبيب" : "Doctor Brief";

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html dir="${direction}">
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body {
              font-family: ${isArabic ? "Tahoma, Arial, sans-serif" : "Arial, sans-serif"};
              color: #111827;
              background: #ffffff;
              direction: ${direction};
              text-align: ${align};
              line-height: 1.7;
            }
            .doctorBriefPrintButton,
            .doctorBriefPrintTip,
            .doctorBriefPrintActions { display: none !important; }
            .resultBox {
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
              padding: 0 !important;
            }
            * { unicode-bidi: isolate; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <script>
            window.onload = function () { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  async function downloadDoctorBriefPdf() {
    if (!printRef.current) return;

    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default || html2pdfModule;

    const reportElement = printRef.current.cloneNode(true) as HTMLElement;

    reportElement
      .querySelectorAll(".doctorBriefPrintActions, .doctorBriefPrintButton, .doctorBriefPrintTip")
      .forEach((element) => element.remove());

    reportElement.style.background = "#ffffff";
    reportElement.style.color = "#111827";
    reportElement.style.padding = "22px 24px";
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

    applyProfessionalPdfLayout(reportElement, isArabic);

    const safeFileName = fileName.replace(/[^a-z0-9]/gi, "-").toLowerCase();

    await html2pdf()
      .set({
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [
            "h1",
            "h2",
            "h3",
            "p",
            "li",
            ".organhealPdfKeepTogether",
            ".organhealPdfSection"
          ],
        },
        margin: [16, 18, 16, 18],
        filename: `OrganHeal-Doctor-Brief-${safeFileName}.pdf`,
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
        .arabicPdfSafeMargins {
          box-sizing: border-box !important;
          width: 100% !important;
          max-width: 100% !important;
          padding-left: 34px !important;
          padding-right: 34px !important;
          overflow: hidden !important;
        }

        .arabicPdfSafeMargins * {
          box-sizing: border-box !important;
          max-width: 100% !important;
          overflow-wrap: break-word !important;
          word-break: normal !important;
        }

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

    <div ref={printRef}
      className="resultBox doctorBriefReportArea arabicPdfSafeMargins organhealPdfPage"
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
          flexWrap: "wrap",
          alignItems: "flex-start",
          borderBottom: "1px solid rgba(148,163,184,0.24)",
          paddingBottom: "16px",
          marginBottom: "18px",
        }}
      >
        <div>
          <p className="sectionLabel">OrganHeal AI</p>

          <h2 style={{ marginBottom: "6px" }}>
            {isArabic ? "ملخص طبي جاهز للطبيب" : "Doctor-Ready Report Summary"}
          </h2>

          <p style={{ opacity: 0.78, lineHeight: 1.7 }}>
            {isArabic
              ? "ملخص عربي منظم للمراجعة السريرية، مبني من بيانات التقرير الأساسية بدون عرض النص الإنجليزي المولد."
              : "Structured medical intelligence summary prepared for clinical review."}
          </p>

          <p style={{ marginTop: "10px", fontSize: "0.9rem", opacity: 0.8 }}>
            <strong>{isArabic ? "تاريخ الإنشاء:" : "Generated:"}</strong>
            <br />
            {generatedAtText}
          </p>
        </div>

        <div className="doctorBriefPrintActions" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button className="secondaryBtn doctorBriefPrintButton" onClick={printDoctorBriefOnly}>
            {isArabic ? "طباعة ملخص الطبيب" : "Print Doctor Brief"}
          </button>

          <button className="primaryBtn doctorBriefPrintButton" onClick={downloadDoctorBriefPdf}>
            {isArabic ? "تنزيل PDF" : "Download PDF"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "14px",
          marginTop: "18px",
          marginBottom: "18px",
        }}
      >
        <div>
          <strong>{isArabic ? "التقرير" : "Report"}</strong>
          <p>{fileName}</p>
        </div>

        <div>
          <strong>{isArabic ? "نوع التقرير" : "Report Type"}</strong>
          <p>{isArabic ? reportType : reportTypeLabel}</p>
        </div>

        <div>
          <strong>{isArabic ? "تاريخ الرفع" : "Uploaded"}</strong>
          <p>{uploadedAtText}</p>
        </div>

        <div>
          <strong>{isArabic ? "نظام الأولوية" : "Priority System"}</strong>
          <p>{isArabic ? mainFocus : executiveSummary?.prioritySystem || "N/A"}</p>
        </div>
      </div>

      {isArabic ? (
        <div>
          <h3>١. ملخص سريري</h3>
          <ArabicParagraph>
            تم إنشاء هذا الملخص كمراجعة تثقيفية منظمة للتقرير المرفوع.
            نوع التقرير: {reportType}. محور المراجعة الرئيسي: {mainFocus}.
            لا يمثل هذا الملخص تشخيصًا نهائيًا، بل يساعد في ترتيب المعلومات قبل مراجعة الطبيب.
          </ArabicParagraph>

          <h3>٢. مؤشرات مختبرية أو سريرية مهمة</h3>
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
              لا توجد مؤشرات منظمة كافية يمكن استخراجها من النص الحالي. يُنصح بالرجوع للتقرير الأصلي عند المراجعة.
            </ArabicParagraph>
          )}

          <h3>٣. إشارات خطر تحتاج مراجعة</h3>
          <ArabicParagraph>
            في حال وجود أعراض، أو تكرار نتائج غير طبيعية، أو اختلاف واضح عن النتائج السابقة، يجب مراجعة طبيب مرخص.
            عدم ظهور مؤشر خطير واضح لا يعني إلغاء الحاجة للمتابعة الطبية عند وجود أعراض.
          </ArabicParagraph>

          <h3>٤. المتابعة الموصى بها</h3>
          <ArabicParagraph>
            راجع المؤشرات مع مقدم رعاية صحية مرخص، وكرر الفحوصات ذات العلاقة حسب الخطة الطبية.
            يفضل مقارنة هذه النتائج مع فحوصات سابقة ولاحقة لفهم الاتجاه الصحي بشكل أفضل.
          </ArabicParagraph>

          <h3>٥. تركيز المراجعة السريرية</h3>
          <div
            style={{
              padding: "14px",
              borderRadius: "16px",
              background: "rgba(15,23,42,0.28)",
              border: "1px solid rgba(148,163,184,0.18)",
              marginTop: "12px",
              marginBottom: "18px",
            }}
          >
            <p><strong>تركيز المراجعة:</strong> {mainFocus}</p>
            <p><strong>الخطوة المقترحة:</strong> {"راجع المؤشرات مع مقدم رعاية صحية مرخص، وكرر الفحوصات ذات العلاقة حسب التوصية."}</p>
            <p><strong>النتيجة الحالية:</strong> {executiveSummary?.currentScore ?? "غير متاح"}</p>
            <p><strong>نتيجة التوقع:</strong> {executiveSummary?.forecastScore ?? "غير متاح"}</p>
            <p><strong>الثقة:</strong> {arabicValue(executiveSummary?.confidenceLevel || executiveSummary?.confidenceScore)}</p>
          </div>

          <h3>ملاحظة مهمة</h3>
          <ArabicParagraph>
            هذا الملخص مخصص لدعم المراجعة الطبية ولا يستبدل التقييم السريري أو حكم الطبيب.
          </ArabicParagraph>
        </div>
      ) : (
        <div>
          <h3>1. Clinical Summary</h3>
          <EnglishParagraph>{text(summary, "N/A")}</EnglishParagraph>

          <h3>2. Key Clinical Findings</h3>
          <EnglishParagraph>{text(keyFindings, "N/A")}</EnglishParagraph>

          <h3>3. Important Risk Signals</h3>
          <EnglishParagraph>{text(riskSignals, "N/A")}</EnglishParagraph>

          <h3>4. Recommended Follow-Up</h3>
          <EnglishParagraph>{text(recommendations, "N/A")}</EnglishParagraph>

          <h3>5. Clinical Review Note</h3>
          <EnglishParagraph>{text(doctorBrief, "N/A")}</EnglishParagraph>
        </div>
      )}
    </div>
    </>
  );
}

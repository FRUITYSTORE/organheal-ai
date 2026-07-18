"use client";

import { type ReactNode, useRef } from "react";
import { text, useArabicUi } from "./ArabicUiHelper";
import type {
  DoctorIntelligencePresentation,
} from "../../../lib/health-intelligence/presentation/doctor-intelligence.presenter";

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
  doctorPresentation?: DoctorIntelligencePresentation | null;
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
    "Brain Health": "صحة الدماغ",
    "Metabolic Health": "الصحة الأيضية",

    Liver: "الكبد",
    Kidney: "الكلى",
    Heart: "القلب",
    Lung: "الرئة",
    Brain: "الدماغ",
    Metabolic: "الأيض",

    "Preventive Health Monitoring": "متابعة صحية وقائية",
    "Preventive Monitoring Pattern": "نمط متابعة وقائية",
    "General Health Monitoring Pattern": "نمط متابعة صحية عامة",

    Low: "منخفض",
    Moderate: "متوسط",
    High: "مرتفع",
    "N/A": "غير متاح",
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
    status: match[4].trim(),
    ref: match[5].replace(/\(default\)/gi, "").trim(),
  }));
}

function ArabicParagraph({ children }: { children: ReactNode }) {
  return (
    <p
      className="ohCardText"
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

function EnglishParagraph({ children }: { children: ReactNode }) {
  return (
    <p
      className="ohCardText"
      style={{
        lineHeight: 1.8,
        whiteSpace: "pre-line",
      }}
    >
      {children}
    </p>
  );
}

function getScoreTone(score?: number) {
  if (typeof score !== "number") return "neutral";
  if (score >= 75) return "good";
  if (score >= 50) return "moderate";
  return "risk";
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
  doctorPresentation,
  executiveSummary,
}: DoctorBriefReportCardProps) {
  const isArabic = useArabicUi();
  const printRef = useRef<HTMLDivElement>(null);

  const generatedAtText = new Date().toLocaleString(isArabic ? "ar" : undefined);
  const labMarkers = extractLabMarkers(
    summary,
    keyFindings,
    riskSignals,
    recommendations,
    doctorBrief
  );

  const mainFocus = arabicValue(executiveSummary?.prioritySystem);
  const reportType = arabicValue(reportTypeLabel);
  const scoreTone = getScoreTone(executiveSummary?.currentScore);
  const forecastTone = getScoreTone(executiveSummary?.forecastScore);


  const clinicalSummary =
    doctorPresentation?.clinicalSummary ?? doctorBrief ?? null;
  
  const evidenceSummary =
    doctorPresentation?.evidenceSummary ?? null;

  const momentumSummary =
    doctorPresentation?.momentumSummary ?? null;
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
            .ohCard,
            .ohMetricCard,
            .ohActionPanel,
            .ohTrustNotice {
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
            }
            .ohCard {
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
    reportElement.style.fontFamily = isArabic
      ? "Tahoma, Arial, sans-serif"
      : "Arial, sans-serif";

    reportElement.querySelectorAll("*").forEach((element) => {
      const htmlElement = element as HTMLElement;

      htmlElement.style.color = "#111827";
      htmlElement.style.fontFamily = isArabic
        ? "Tahoma, Arial, sans-serif"
        : "Arial, sans-serif";
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
            ".organhealPdfSection",
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
        .doctorBriefReportArea {
          unicode-bidi: isolate;
        }

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

        .doctorBriefReportArea[lang="ar"] h1,
        .doctorBriefReportArea[lang="ar"] h2,
        .doctorBriefReportArea[lang="ar"] h3 {
          letter-spacing: normal !important;
          word-spacing: normal !important;
          text-transform: none !important;
          line-height: 1.35 !important;
        }

        .doctorBriefReportArea .doctorBriefHeaderActions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        @media (max-width: 720px) {
          .doctorBriefReportArea .doctorBriefHeaderActions {
            width: 100%;
          }

          .doctorBriefReportArea .doctorBriefHeaderActions button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <section
        ref={printRef}
        className="ohCard doctorBriefReportArea arabicPdfSafeMargins organhealPdfPage"
        dir={isArabic ? "rtl" : "ltr"}
        lang={isArabic ? "ar" : "en"}
        style={{
          textAlign: isArabic ? "right" : "left",
          fontFamily: isArabic ? "Tahoma, Arial, sans-serif" : undefined,
          unicodeBidi: "isolate",
        }}
      >
        <div className="ohCardHeader">
          <div>
            <p className="ohMetricLabel">OrganHeal AI</p>

            <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
              {isArabic ? "ملخص طبي جاهز للطبيب" : "Doctor-Ready Report Summary"}
            </h2>

            <p className="ohCardText">
              {isArabic
                ? "ملخص منظم للمراجعة السريرية، مبني من بيانات التقرير الأساسية، ومخصص للتحضير للنقاش مع مختص صحي مرخص."
                : "Structured medical intelligence summary prepared for clinical review and doctor discussion."}
            </p>

            <p className="ohMetricHint" style={{ marginTop: "10px" }}>
              <strong>{isArabic ? "تاريخ الإنشاء:" : "Generated:"}</strong>
              <br />
              {generatedAtText}
            </p>
          </div>

          <div className="doctorBriefPrintActions doctorBriefHeaderActions">
            <button
              className="secondaryBtn doctorBriefPrintButton"
              type="button"
              onClick={printDoctorBriefOnly}
            >
              {isArabic ? "طباعة ملخص الطبيب" : "Print Doctor Brief"}
            </button>

            <button
              className="primaryBtn doctorBriefPrintButton"
              type="button"
              onClick={downloadDoctorBriefPdf}
            >
              {isArabic ? "تنزيل PDF" : "Download PDF"}
            </button>
          </div>
        </div>

        <div className="ohMetricGrid" style={{ marginTop: "18px" }}>
          <article className="ohMetricCard">
            <span className="ohMetricLabel">{isArabic ? "التقرير" : "Report"}</span>
            <span className="ohMetricHint">{fileName}</span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {isArabic ? "نوع التقرير" : "Report Type"}
            </span>
            <span className="ohMetricHint">
              {isArabic ? reportType : reportTypeLabel}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {isArabic ? "تاريخ الرفع" : "Uploaded"}
            </span>
            <span className="ohMetricHint">{uploadedAtText}</span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {isArabic ? "نظام الأولوية" : "Priority System"}
            </span>
            <span className="ohMetricHint">
              {isArabic ? mainFocus : executiveSummary?.prioritySystem || "N/A"}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {isArabic ? "النتيجة الحالية" : "Current Score"}
            </span>
            <span className={`ohStatusBadge ${scoreTone}`}>
              {executiveSummary?.currentScore ?? "N/A"}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {isArabic ? "نتيجة التوقع" : "Forecast Score"}
            </span>
            <span className={`ohStatusBadge ${forecastTone}`}>
              {executiveSummary?.forecastScore ?? "N/A"}
            </span>
          </article>
        </div>

        <div className="ohDivider" />

        {isArabic ? (
          <div className="ohStack">
            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                ١. ملخص سريري
              </h3>
              <ArabicParagraph>
                تم إنشاء هذا الملخص كمراجعة تثقيفية منظمة للتقرير المرفوع.
                نوع التقرير: {reportType}. محور المراجعة الرئيسي: {mainFocus}.
                لا يمثل هذا الملخص تشخيصًا نهائيًا، بل يساعد في ترتيب المعلومات قبل مراجعة الطبيب.
              </ArabicParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                ٢. مؤشرات مختبرية أو سريرية مهمة
              </h3>

              {labMarkers.length > 0 ? (
                <div className="ohMetricGrid" style={{ marginTop: "12px" }}>
                  {labMarkers.map((marker, index) => (
                    <div className="ohMetricCard" key={`${marker.name}-${index}`}>
                      <span className="ohMetricLabel">{marker.name}</span>
                      <span className="ohMetricHint">
                        القيمة: {marker.value} {marker.unit}
                      </span>
                      <span className="ohMetricHint">
                        الحالة: {englishStatusToArabic(marker.status)}
                      </span>
                      {marker.ref && (
                        <span className="ohMetricHint">
                          المرجع: {marker.ref}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <ArabicParagraph>
                  لا توجد مؤشرات منظمة كافية يمكن استخراجها من النص الحالي. يُنصح بالرجوع للتقرير الأصلي عند المراجعة.
                </ArabicParagraph>
              )}
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                ٣. إشارات خطر تحتاج مراجعة
              </h3>
              <ArabicParagraph>
                في حال وجود أعراض، أو تكرار نتائج غير طبيعية، أو اختلاف واضح عن النتائج السابقة، يجب مراجعة طبيب مرخص.
                عدم ظهور مؤشر خطير واضح لا يعني إلغاء الحاجة للمتابعة الطبية عند وجود أعراض.
              </ArabicParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                ٤. المتابعة الموصى بها
              </h3>
              <ArabicParagraph>
                راجع المؤشرات مع مقدم رعاية صحية مرخص، وكرر الفحوصات ذات العلاقة حسب الخطة الطبية.
                يفضل مقارنة هذه النتائج مع فحوصات سابقة ولاحقة لفهم الاتجاه الصحي بشكل أفضل.
              </ArabicParagraph>
            </article>

            <article className="ohTrustNotice">
              <span aria-hidden="true">🩺</span>
              <div style={{ width: "100%" }}>
                <strong>٥. ملخص المراجعة السريرية</strong>
                <ArabicParagraph>
                  {text(clinicalSummary, "غير متاح")}
                </ArabicParagraph>
              </div>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                ٦. ملخص الأدلة
              </h3>
              <ArabicParagraph>
                {text(evidenceSummary, "غير متاح")}
              </ArabicParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                ٧. ملخص التقدم
              </h3>
              <ArabicParagraph>
                {text(momentumSummary, "غير متاح")}
              </ArabicParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                ملاحظة مهمة
              </h3>
              <ArabicParagraph>
                هذا الملخص مخصص لدعم المراجعة الطبية ولا يستبدل التقييم السريري أو حكم الطبيب.
              </ArabicParagraph>
            </article>
          </div>
        ) : (
          <div className="ohStack">
            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                1. Clinical Summary
              </h3>
              <EnglishParagraph>{text(summary, "N/A")}</EnglishParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                2. Key Clinical Findings
              </h3>
              <EnglishParagraph>{text(keyFindings, "N/A")}</EnglishParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                3. Important Risk Signals
              </h3>
              <EnglishParagraph>{text(riskSignals, "N/A")}</EnglishParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                4. Recommended Follow-Up
              </h3>
              <EnglishParagraph>{text(recommendations, "N/A")}</EnglishParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                5. Clinical Review Note
              </h3>
              <EnglishParagraph>{text(clinicalSummary, "N/A")}</EnglishParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                6. Evidence Summary
              </h3>
              <EnglishParagraph>{text(evidenceSummary, "N/A")}</EnglishParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                7. Momentum Summary
              </h3>
              <EnglishParagraph>{text(momentumSummary, "N/A")}</EnglishParagraph>
            </article>
          </div>
        )}

        <div className="ohDivider" />

        <div className="ohTrustNotice doctorBriefPrintTip">
          <span aria-hidden="true">⚠️</span>
          <div>
            <strong>
              {isArabic ? "تنبيه طبي" : "Medical safety note"}
            </strong>
            <br />
            {isArabic
              ? "هذا الملخص للتنظيم والتحضير فقط، ولا يستبدل التشخيص أو الخطة العلاجية من مختص صحي مرخص."
              : "This summary is for organization and preparation only. It does not replace diagnosis or treatment planning by a licensed healthcare professional."}
          </div>
        </div>
      </section>
    </>
  );
}



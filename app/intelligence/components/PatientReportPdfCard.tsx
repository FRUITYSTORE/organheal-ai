"use client";

import { type ReactNode, useRef } from "react";
import type {
  PatientIntelligencePresentation,
} from "@/lib/health-intelligence/presentation/patient-intelligence.presenter";
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
  patientPresentation?: PatientIntelligencePresentation | null;
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
    status: englishStatusToArabic(match[4]),
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

export default function PatientReportPdfCard({
  fileName,
  uploadedAtText,
  summary,
  keyFindings,
  riskSignals,
  recommendations,
  healthStory,
  executiveSummary,
  patientPresentation,
}: PatientReportPdfCardProps) {
  const isArabic = useArabicUi();
  const patientReportRef = useRef<HTMLElement>(null);

  const generatedAtText = new Date().toLocaleString(isArabic ? "ar" : undefined);
  const labMarkers = extractLabMarkers(
    summary,
    keyFindings,
    riskSignals,
    recommendations
  );
  const mainFocus = arabicValue(executiveSummary?.prioritySystem);
  const currentScoreTone = getScoreTone(executiveSummary?.currentScore);
  const forecastScoreTone = getScoreTone(executiveSummary?.forecastScore);

  const patientWhatThisMeans =
    patientPresentation?.whatThisMeans || summary;

  const patientMainThingsNoticed =
    patientPresentation?.mainThingsNoticed || keyFindings;

  const patientWhatNeedsAttention =
    patientPresentation?.whatNeedsAttention || riskSignals;

  const patientHelpfulNextSteps =
    patientPresentation?.helpfulNextSteps ||
    recommendations ||
    executiveSummary?.nextBestAction;

  const patientHealthStory =
    patientPresentation?.healthStory || healthStory;

  async function downloadPatientPdf() {
    if (!patientReportRef.current) return;

    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default || html2pdfModule;

    const reportElement = patientReportRef.current.cloneNode(true) as HTMLElement;

    reportElement
      .querySelectorAll(".patientReportActions, .patientReportDownloadButton, .patientReportTip")
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
        .patientReportPdfArea {
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

        .patientReportPdfArea[lang="ar"],
        .patientReportPdfArea[lang="ar"] * {
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
        .patientReportPdfArea[lang="ar"] h3 {
          letter-spacing: normal !important;
          word-spacing: normal !important;
          text-transform: none !important;
          line-height: 1.35 !important;
        }

        .patientReportPdfArea .patientReportHeaderActions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        @media (max-width: 720px) {
          .patientReportPdfArea .patientReportHeaderActions {
            width: 100%;
          }

          .patientReportPdfArea .patientReportHeaderActions button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <section
        ref={patientReportRef}
        className="ohCard patientReportPdfArea arabicPdfSafeMargins organhealPdfPage"
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
            <p className="ohMetricLabel">
              {isArabic ? "تقرير المريض" : "Patient Report"}
            </p>

            <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
              {isArabic ? "ملخص صحي مبسط للمريض" : "Patient-Friendly Health Summary"}
            </h2>

            <p className="ohCardText">
              {isArabic
                ? "نسخة مبسطة تساعدك على فهم التقرير الصحي وتجهيز أسئلة أفضل للطبيب."
                : "A calm, simple explanation to help you understand your report and what to discuss with your doctor."}
            </p>
          </div>

          <div className="patientReportActions patientReportHeaderActions">
            <button
              className="primaryBtn patientReportDownloadButton"
              type="button"
              onClick={downloadPatientPdf}
            >
              {isArabic ? "تنزيل تقرير المريض PDF" : "Download Patient PDF"}
            </button>
          </div>
        </div>

        <div className="ohMetricGrid" style={{ marginTop: "18px" }}>
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {isArabic ? "التقرير" : "Report"}
            </span>
            <span className="ohMetricHint">{fileName}</span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {isArabic ? "تاريخ الرفع" : "Uploaded"}
            </span>
            <span className="ohMetricHint">{uploadedAtText}</span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {isArabic ? "تاريخ الإنشاء" : "Generated"}
            </span>
            <span className="ohMetricHint">{generatedAtText}</span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {isArabic ? "التركيز الرئيسي" : "Main Focus"}
            </span>
            <span className="ohMetricHint">
              {isArabic ? mainFocus : executiveSummary?.prioritySystem || "N/A"}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {isArabic ? "النتيجة الحالية" : "Current Score"}
            </span>
            <span className={`ohStatusBadge ${currentScoreTone}`}>
              {executiveSummary?.currentScore ?? "N/A"}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {isArabic ? "الاتجاه المتوقع" : "Forecast Score"}
            </span>
            <span className={`ohStatusBadge ${forecastScoreTone}`}>
              {executiveSummary?.forecastScore ?? "N/A"}
            </span>
          </article>
        </div>

        <div className="ohDivider" />

        {isArabic ? (
          <div className="ohStack">
            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                ١. ماذا يعني هذا التقرير؟
              </h3>
              <ArabicParagraph>
                تمت مراجعة التقرير بواسطة OrganHeal AI بهدف تقديم ملخص تثقيفي مبسط.
                التركيز الرئيسي الظاهر في هذا التقرير هو: {mainFocus}.
                هذا الملخص لا يضع تشخيصًا، لكنه يساعدك على فهم الاتجاه العام ومناقشة النتائج مع الطبيب.
              </ArabicParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                ٢. أهم المؤشرات التي ظهرت
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
                        الحالة: {marker.status}
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
                  لا توجد مؤشرات مختبرية واضحة يمكن استخراجها بشكل منظم من النص الحالي.
                  يُنصح بمراجعة التقرير الأصلي مع مختص صحي.
                </ArabicParagraph>
              )}
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                ٣. ما الذي قد يحتاج إلى انتباه؟
              </h3>
              <ArabicParagraph>
                إذا كانت هناك أعراض أو قيم متكررة خارج المجال الطبيعي، يجب مناقشتها مع طبيب مرخص.
                في حال عدم وجود مؤشرات غير طبيعية واضحة، تبقى المتابعة المنتظمة وإعادة الفحوصات عند الحاجة خطوة مهمة.
              </ArabicParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                ٤. خطوات تالية مفيدة
              </h3>
              <ArabicParagraph>
                راجع التقرير مع مقدم رعاية صحية مرخص، وكرر الفحوصات ذات العلاقة حسب توصية الطبيب.
                احتفظ بنسخة من التقرير للمقارنة مع النتائج القادمة، خاصة إذا كان هناك متابعة للكبد أو الكلى أو القلب أو مؤشرات الدم.
              </ArabicParagraph>
            </article>

            <article className="ohTrustNotice">
              <span aria-hidden="true">📈</span>
              <div>
                <strong>٥. اتجاهك الصحي</strong>
                <br />
                <p style={{ margin: "8px 0 0" }}>
                  <strong>النتيجة الصحية الحالية:</strong>{" "}
                  {executiveSummary?.currentScore ?? "غير متاح"}
                </p>
                <p style={{ margin: "8px 0 0" }}>
                  <strong>الاتجاه الصحي المتوقع:</strong>{" "}
                  {executiveSummary?.forecastScore ?? "غير متاح"}
                </p>
                <p style={{ margin: "8px 0 0" }}>
                  <strong>الثقة:</strong>{" "}
                  {arabicValue(executiveSummary?.confidenceLevel)}
                </p>
                <p style={{ margin: "8px 0 0" }}>
                  <strong>أفضل خطوة تالية:</strong>{" "}
                  راجع المؤشرات مع مقدم رعاية صحية مرخص، وكرر الفحوصات ذات العلاقة حسب التوصية.
                </p>
              </div>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                ملاحظة مهمة
              </h3>
              <ArabicParagraph>
                هذا التقرير للتثقيف والفهم الشخصي فقط. لا يستبدل الاستشارة الطبية أو التشخيص أو العلاج.
                راجع النتائج دائمًا مع مقدم رعاية صحية مرخص.
              </ArabicParagraph>
            </article>
          </div>
        ) : (
          <div className="ohStack">
            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                1. What This Report Means
              </h3>
              <EnglishParagraph>
                {text(
                  patientWhatThisMeans,
                  "Your report was reviewed by OrganHeal AI and summarized in a simple way."
                )}
              </EnglishParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                2. Main Things Noticed
              </h3>
              <EnglishParagraph>
                {text(
                  patientMainThingsNoticed,
                  "No major findings were clearly identified from the available data."
                )}
              </EnglishParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                3. What May Need Attention
              </h3>
              <EnglishParagraph>
                {text(
                  patientWhatNeedsAttention,
                  "No urgent warning signals were clearly detected. Please review your original report with a healthcare professional."
                )}
              </EnglishParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                4. Helpful Next Steps
              </h3>
              <EnglishParagraph>
                {text(
                  patientHelpfulNextSteps,
                  "Follow up with your healthcare provider if you have symptoms or concerns."
                )}
              </EnglishParagraph>
            </article>

            <article>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                5. Your Health Story in Simple Words
              </h3>
              <EnglishParagraph>
                {text(
                  patientHealthStory,
                  "As more assessments, check-ins, and reports are added, OrganHeal will build a clearer picture of your health journey."
                )}
              </EnglishParagraph>
            </article>
          </div>
        )}

        <div className="ohDivider" />

        <div className="ohTrustNotice patientReportTip">
          <span aria-hidden="true">🩺</span>
          <div>
            <strong>
              {isArabic ? "تنبيه طبي" : "Medical safety note"}
            </strong>
            <br />
            {isArabic
              ? "هذا التقرير للتثقيف والتنظيم فقط، ولا يستبدل التشخيص أو العلاج أو مراجعة مختص صحي مرخص."
              : "This report is for education and organization only. It does not replace diagnosis, treatment, or review by a licensed healthcare professional."}
          </div>
        </div>
      </section>
    </>
  );
}



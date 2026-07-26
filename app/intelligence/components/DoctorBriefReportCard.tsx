"use client";

import { type ReactNode, useEffect, useRef } from "react";
import type {
  DoctorIntelligencePresentation,
} from "../../../lib/health-intelligence/presentation/doctor-intelligence.presenter";
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
  doctorPresentation?: DoctorIntelligencePresentation | null;
  executiveSummary: ExecutiveSummary | null | undefined;
};

type LabMarker = {
  name: string;
  value: string;
  unit: string;
  status: string;
  ref: string;
};

function DoctorBriefOrganHealLogo() {
  return (
    <svg
      width={54}
      height={54}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OrganHeal logo"
      role="img"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient
          id="doctorBriefOhGradient"
          x1="90"
          y1="380"
          x2="420"
          y2="110"
        >
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="50%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>

      <path
        d="M126 338 L126 190 L205 116 L282 91 L393 154"
        fill="none"
        stroke="url(#doctorBriefOhGradient)"
        strokeWidth={28}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M394 354 L302 406 L217 399 L126 338"
        fill="none"
        stroke="url(#doctorBriefOhGradient)"
        strokeWidth={28}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="393" cy="154" r="18" fill="#3B82F6" />
      <circle cx="126" cy="338" r="18" fill="#22C55E" />
      <circle cx="394" cy="354" r="18" fill="#3B82F6" />

      <text
        x="256"
        y="295"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="120"
        fontWeight="900"
        fill="#0F172A"
      >
        OH
      </text>
    </svg>
  );
}

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
    Normal: "طبيعي",
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

function extractLabMarkers(
  ...values: Array<string | null | undefined>
): LabMarker[] {
  const combined = values
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n");

  const markerPattern =
    /([A-Za-z][A-Za-z0-9 %()\/.+-]{1,50}):\s*([<>]?\s*[0-9]+(?:\.[0-9]+)?)\s*([^|()\n]*?)\s*\((Normal|High|Low|Moderate)\)\s*\|\s*Ref:\s*(.*?)(?=\s*\|\s*[A-Za-z][A-Za-z0-9 %()\/.+-]{1,50}:\s*[<>]?\s*[0-9]|\n|$)/gi;

  const matches = Array.from(combined.matchAll(markerPattern));
  const uniqueMarkers = new Map<string, LabMarker>();

  for (const match of matches) {
    const marker: LabMarker = {
      name: match[1].trim(),
      value: match[2].replace(/\s+/g, "").trim(),
      unit: (match[3] || "").trim(),
      status: match[4].trim(),
      ref: (match[5] || "")
        .replace(/\(default\)/gi, "")
        .replace(/\s*\|\s*$/g, "")
        .trim(),
    };

    const key = `${marker.name.toLowerCase()}|${marker.value}|${marker.unit.toLowerCase()}`;

    if (!uniqueMarkers.has(key)) {
      uniqueMarkers.set(key, marker);
    }
  }

  return Array.from(uniqueMarkers.values());
}

function isMeaningfulText(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[.:-]+$/g, "");

  const emptyValues = new Set([
    "",
    "n/a",
    "na",
    "none",
    "null",
    "undefined",
    "not available",
    "not applicable",
    "no data",
    "no information available",
    "غير متاح",
    "لا يوجد",
  ]);

  return !emptyValues.has(normalized);
}

function normalizedText(value: unknown) {
  return text(value, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function ArabicParagraph({ children }: { children: ReactNode }) {
  return (
    <p
      className="ohCardText"
      style={{
        lineHeight: 1.85,
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
        lineHeight: 1.75,
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

function createDoctorBriefReportId(
  fileName: string,
  uploadedAtText: string
) {
  const source = `doctor|${fileName}|${uploadedAtText}`;
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  const reference = hash
    .toString(36)
    .toUpperCase()
    .padStart(7, "0");

  return `OH-D-${reference}`;
}

function applyProfessionalPdfLayout(
  reportElement: HTMLElement,
  isArabic: boolean
) {
  const style = document.createElement("style");

  style.textContent = `
    .organhealPdfPage {
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: 100% !important;
      padding: 18px !important;
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
    }

    .organhealPdfPage p,
    .organhealPdfPage li {
      break-inside: auto !important;
      page-break-inside: auto !important;
      orphans: 3 !important;
      widows: 3 !important;
    }

    .doctorBriefLabTable thead {
      display: table-header-group !important;
    }

    .doctorBriefLabTable tbody {
      display: table-row-group !important;
    }

    .doctorBriefLabTable tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .doctorBriefDocumentHeader,
    .ohMetricCard,
    .doctorBriefClinicalIntro,
    .doctorBriefSectionHeading {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  `;

  reportElement.prepend(style);
  reportElement.classList.add("organhealPdfPage");

  Object.assign(reportElement.style, {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "100%",
    padding: "22px 24px",
    overflow: "visible",
    direction: isArabic ? "rtl" : "ltr",
    textAlign: isArabic ? "right" : "left",
    fontFamily: isArabic
      ? "Tahoma, Arial, sans-serif"
      : "Arial, sans-serif",
  });

  reportElement.querySelectorAll("h1, h2, h3").forEach((element) => {
    const htmlElement = element as HTMLElement;

    htmlElement.style.breakAfter = "avoid";
    htmlElement.style.pageBreakAfter = "avoid";
    htmlElement.style.breakInside = "avoid";
    htmlElement.style.pageBreakInside = "avoid";
    htmlElement.style.marginTop = "18px";
    htmlElement.style.marginBottom = "10px";
    htmlElement.style.lineHeight = "1.35";
  });

  reportElement.querySelectorAll("p, li").forEach((element) => {
    const htmlElement = element as HTMLElement;

    htmlElement.style.breakInside = "auto";
    htmlElement.style.pageBreakInside = "auto";
    htmlElement.style.orphans = "3";
    htmlElement.style.widows = "3";
  });

  reportElement.querySelectorAll(".ohStack").forEach((element) => {
    const htmlElement = element as HTMLElement;

    htmlElement.style.display = "block";
    htmlElement.style.breakInside = "auto";
    htmlElement.style.pageBreakInside = "auto";
  });

  reportElement.querySelectorAll(".ohStack > article").forEach((element) => {
    const htmlElement = element as HTMLElement;

    htmlElement.style.display = "block";
    htmlElement.style.breakInside = "auto";
    htmlElement.style.pageBreakInside = "auto";
    htmlElement.style.marginBottom = "18px";
  });

  reportElement.querySelectorAll(".doctorBriefDocumentHeader").forEach(
    (element) => {
      const htmlElement = element as HTMLElement;

      Object.assign(htmlElement.style, {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "22px",
        padding: "18px 20px",
        marginBottom: "20px",
        border: "1px solid #dbe4ee",
        borderTop: "4px solid #153f63",
        borderRadius: "14px",
        background: "#f8fafc",
        breakInside: "avoid",
        pageBreakInside: "avoid",
      });
    }
  );

  reportElement.querySelectorAll(".doctorBriefBrandIdentity").forEach(
    (element) => {
      const htmlElement = element as HTMLElement;

      Object.assign(htmlElement.style, {
        display: "flex",
        alignItems: "center",
        gap: "13px",
      });
    }
  );

  reportElement.querySelectorAll(".doctorBriefReferenceGrid").forEach(
    (element) => {
      const htmlElement = element as HTMLElement;

      Object.assign(htmlElement.style, {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(130px, 1fr))",
        gap: "10px 18px",
        minWidth: "320px",
      });
    }
  );

  reportElement.querySelectorAll(".doctorBriefReferenceItem").forEach(
    (element) => {
      const htmlElement = element as HTMLElement;

      Object.assign(htmlElement.style, {
        display: "flex",
        flexDirection: "column",
        gap: "3px",
      });
    }
  );

  reportElement.querySelectorAll("table").forEach((element) => {
    const htmlElement = element as HTMLElement;

    htmlElement.style.breakInside = "auto";
    htmlElement.style.pageBreakInside = "auto";
  });

  reportElement.querySelectorAll("thead").forEach((element) => {
    (element as HTMLElement).style.display = "table-header-group";
  });

  reportElement.querySelectorAll("tr").forEach((element) => {
    const htmlElement = element as HTMLElement;

    htmlElement.style.breakInside = "avoid";
    htmlElement.style.pageBreakInside = "avoid";
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
  const printRef = useRef<HTMLElement>(null);

  const generatedAtText = new Date().toLocaleString(
    isArabic ? "ar" : undefined
  );

  const doctorBriefReportId = createDoctorBriefReportId(
    fileName,
    uploadedAtText
  );

  const labMarkers = extractLabMarkers(
    summary,
    keyFindings,
    riskSignals,
    recommendations,
    doctorBrief
  );

  const abnormalLabMarkers = labMarkers.filter(
    (marker) => marker.status.toLowerCase() !== "normal"
  );

  const mainFocus = arabicValue(executiveSummary?.prioritySystem);
  const reportType = arabicValue(reportTypeLabel);
  const scoreTone = getScoreTone(executiveSummary?.currentScore);
  const forecastTone = getScoreTone(executiveSummary?.forecastScore);

 const rawDoctorBrief =
  typeof doctorBrief === "string" ? doctorBrief.trim() : "";

const doctorBriefLooksLikeLegacyDocument =
  /doctor[-\s]?ready report summary/i.test(rawDoctorBrief) ||
  /structured medical intelligence summary prepared for clinical review/i.test(
    rawDoctorBrief
  );

const clinicalSummary =
  doctorPresentation?.clinicalSummary ??
  summary ??
  (!doctorBriefLooksLikeLegacyDocument ? doctorBrief : null) ??
  null;

  const evidenceSummary =
    doctorPresentation?.evidenceSummary ?? null;

  const momentumSummary =
    doctorPresentation?.momentumSummary ?? null;

  const decisionSummary =
    doctorPresentation?.decisionSummary ?? null;

  const shouldShowKeyFindings =
    isMeaningfulText(keyFindings) &&
    normalizedText(keyFindings) !== normalizedText(clinicalSummary);

  const labSummaryText = isArabic
    ? `تم رصد ${labMarkers.length} مؤشرًا مخبريًا، منها ${abnormalLabMarkers.length} مؤشر غير طبيعي يحتاج إلى مراجعة سريرية ضمن سياق حالة المريض.`
    : `${labMarkers.length} laboratory marker(s) were identified, including ${abnormalLabMarkers.length} abnormal marker(s) requiring clinical review in the context of the patient.`;

    
  const optionalSections = [
    {
      key: "evidence",
      titleEn: "6. Evidence Summary",
      titleAr: "٦. ملخص الأدلة",
      value: evidenceSummary,
    },
    {
      key: "momentum",
      titleEn: "7. Momentum Summary",
      titleAr: "٧. ملخص التقدم",
      value: momentumSummary,
    },
    {
      key: "decision",
      titleEn: "8. Decision Summary",
      titleAr: "٨. ملخص القرار",
      value: decisionSummary,
    },
  ].filter((section) => isMeaningfulText(section.value));

  async function downloadDoctorBriefPdf() {
    let temporaryContainer: HTMLDivElement | null = null;

    try {
      if (!printRef.current) {
        throw new Error("Doctor brief element is not available.");
      }

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const reportElement =
        printRef.current.cloneNode(true) as HTMLElement;

      reportElement
        .querySelectorAll(
          ".doctorBriefPrintActions, .doctorBriefPrintButton"
        )
        .forEach((element) => element.remove());

      Object.assign(reportElement.style, {
        background: "#ffffff",
        color: "#111827",
        padding: "22px 24px",
        border: "none",
        boxShadow: "none",
        direction: isArabic ? "rtl" : "ltr",
        textAlign: isArabic ? "right" : "left",
        fontFamily: isArabic
          ? "Tahoma, Arial, sans-serif"
          : "Arial, sans-serif",
      });

      reportElement.querySelectorAll("*").forEach((element) => {
        const htmlElement = element as HTMLElement;

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

      temporaryContainer = document.createElement("div");
      temporaryContainer.setAttribute("aria-hidden", "true");

      Object.assign(temporaryContainer.style, {
        position: "fixed",
        left: "-100000px",
        top: "0",
        width: "794px",
        background: "#ffffff",
        zIndex: "-1",
        pointerEvents: "none",
      });

      temporaryContainer.appendChild(reportElement);
      document.body.appendChild(temporaryContainer);

      const normalizedFileName =
        fileName.replace(/[^a-z0-9]/gi, "-").toLowerCase() ||
        "report";

      const pdfWorker = html2pdf()
        .set({
          pagebreak: {
            mode: ["css", "legacy"],
            avoid: [
              "h1",
              "h2",
              "h3",
              "tr",
              ".doctorBriefDocumentHeader",
              ".doctorBriefClinicalIntro",
              ".ohMetricCard",
            ],
          },
          margin: [16, 18, 20, 18],
          filename: `OrganHeal-Doctor-Brief-${normalizedFileName}-${Date.now()}.pdf`,
          image: {
            type: "jpeg",
            quality: 0.98,
          },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
        })
        .from(reportElement)
        .toPdf();

      await pdfWorker.get("pdf").then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        for (
          let pageNumber = 1;
          pageNumber <= totalPages;
          pageNumber += 1
        ) {
          pdf.setPage(pageNumber);

          pdf.setDrawColor(219, 228, 238);
          pdf.setLineWidth(0.25);
          pdf.line(
            18,
            pageHeight - 13,
            pageWidth - 18,
            pageHeight - 13
          );

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(100, 116, 139);

          pdf.text(
            "OrganHeal AI · Clinical Intelligence Brief",
            18,
            pageHeight - 8
          );

          pdf.text(
            `Report ID: ${doctorBriefReportId}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: "center" }
          );

          pdf.text(
            `Page ${pageNumber} of ${totalPages}`,
            pageWidth - 18,
            pageHeight - 8,
            { align: "right" }
          );
        }
      });

      await pdfWorker.save();
    } catch (error) {
      console.error("Doctor PDF failed:", error);
      window.alert(
        isArabic
          ? "تعذر إنشاء ملخص الطبيب PDF. يرجى المحاولة مرة أخرى."
          : "The Doctor Brief PDF could not be generated. Please try again."
      );
    } finally {
      temporaryContainer?.remove();
    }
  }

  function printDoctorBriefOnly() {
    if (!printRef.current) {
      window.print();
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

    if (!printWindow) {
      window.print();
      return;
    }

    const direction = isArabic ? "rtl" : "ltr";
    const align = isArabic ? "right" : "left";
    const title = isArabic
      ? "ملخص الذكاء السريري للطبيب"
      : "Clinical Intelligence Brief";

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html dir="${direction}">
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            @page { size: A4; margin: 14mm; }

            body {
              font-family: ${
                isArabic
                  ? "Tahoma, Arial, sans-serif"
                  : "Arial, sans-serif"
              };
              color: #111827;
              background: #ffffff;
              direction: ${direction};
              text-align: ${align};
              line-height: 1.65;
            }

            .doctorBriefPrintButton,
            .doctorBriefPrintActions {
              display: none !important;
            }

            .doctorBriefDocumentHeader {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 22px;
              padding: 18px 20px;
              margin-bottom: 20px;
              border: 1px solid #dbe4ee;
              border-top: 4px solid #153f63;
              border-radius: 14px;
              background: #f8fafc;
            }

            .doctorBriefBrandIdentity {
              display: flex;
              align-items: center;
              gap: 13px;
            }

            .doctorBriefReferenceGrid {
              display: grid;
              grid-template-columns: repeat(2, minmax(130px, 1fr));
              gap: 10px 18px;
              min-width: 320px;
            }

            .doctorBriefReferenceItem {
              display: flex;
              flex-direction: column;
              gap: 3px;
            }

            .doctorBriefLabTable {
              width: 100%;
              border-collapse: collapse;
            }

            .doctorBriefLabTable th,
            .doctorBriefLabTable td {
              padding: 9px 10px;
              border: 1px solid #dbe4ee;
              text-align: ${align};
              vertical-align: top;
            }

            .doctorBriefLabTable th {
              background: #f1f5f9;
            }

            .ohCard {
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
            }

            * {
              box-sizing: border-box;
              unicode-bidi: isolate;
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  useEffect(() => {
    const handleDoctorBriefPdfDownload = () => {
      void downloadDoctorBriefPdf();
    };

    window.addEventListener(
      "organheal:download-doctor-brief-pdf",
      handleDoctorBriefPdfDownload
    );

    return () => {
      window.removeEventListener(
        "organheal:download-doctor-brief-pdf",
        handleDoctorBriefPdfDownload
      );
    };
  }, [
    isArabic,
    fileName,
    uploadedAtText,
    summary,
    keyFindings,
    riskSignals,
    recommendations,
    doctorBrief,
    doctorPresentation,
    executiveSummary,
  ]);

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

        .doctorBriefDocumentHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 22px;
          padding: 18px 20px;
          margin-bottom: 20px;
          border: 1px solid #dbe4ee;
          border-top: 4px solid #153f63;
          border-radius: 14px;
          background: #f8fafc;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .doctorBriefBrandIdentity {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .doctorBriefPlatformName {
          margin: 0;
          color: #0f172a;
          font-size: 1.22rem;
          font-weight: 850;
          line-height: 1.1;
        }

        .doctorBriefPlatformTagline {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 0.63rem;
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .doctorBriefDocumentType {
          margin: 13px 0 0;
          color: #153f63;
          font-size: 0.96rem;
          font-weight: 800;
          line-height: 1.35;
        }

        .doctorBriefDocumentSubtitle {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 0.79rem;
          line-height: 1.5;
        }

        .doctorBriefReferenceGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(130px, 1fr));
          gap: 10px 18px;
          min-width: 320px;
        }

        .doctorBriefReferenceItem {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .doctorBriefReferenceLabel {
          color: #64748b;
          font-size: 0.7rem;
          font-weight: 700;
          line-height: 1.3;
          text-transform: uppercase;
        }

        .doctorBriefReferenceValue {
          color: #111827;
          font-size: 0.82rem;
          font-weight: 700;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .doctorBriefConfidentiality {
          display: inline-flex;
          width: fit-content;
          margin-top: 12px;
          padding: 5px 9px;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          background: #ffffff;
          color: #475569;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .doctorBriefClinicalIntro {
          margin-bottom: 18px;
          padding: 16px 18px;
          border: 1px solid #dbe4ee;
          border-left: 4px solid #153f63;
          border-radius: 12px;
          background: #f8fafc;
        }

        .doctorBriefLabTableWrapper {
          width: 100%;
          margin-top: 14px;
          overflow: visible;
          background: #ffffff;
          break-inside: auto;
          page-break-inside: auto;
        }

        .doctorBriefLabTable {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          border: 1px solid #dbe4ee;
        }

        .doctorBriefLabTable th {
          padding: 10px 12px;
          background: #f1f5f9;
          color: #334155;
          font-size: 0.74rem;
          font-weight: 800;
          text-align: left;
          border: 1px solid #dbe4ee;
        }

        .doctorBriefLabTable td {
          padding: 10px 12px;
          color: #1e293b;
          font-size: 0.76rem;
          line-height: 1.45;
          vertical-align: middle;
          border: 1px solid #e8edf3;
          overflow-wrap: anywhere;
        }

        .doctorBriefLabTable thead {
          display: table-header-group;
        }

        .doctorBriefLabTable tbody {
          display: table-row-group;
        }

        .doctorBriefLabTable tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .doctorBriefLabName {
          font-weight: 800;
          color: #0f172a !important;
        }

        .doctorBriefLabStatus {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 58px;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          line-height: 1.2;
        }

        .doctorBriefLabStatus-high {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
        }

        .doctorBriefLabStatus-low {
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #fed7aa;
        }

        .doctorBriefLabStatus-normal {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .doctorBriefLabStatus-neutral {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .doctorBriefReportArea .doctorBriefHeaderActions {
          display: flex;
          flex-direction: column;
          gap: 8px;
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

        .doctorBriefReportArea[lang="ar"] .doctorBriefReferenceLabel,
        .doctorBriefReportArea[lang="ar"] .doctorBriefPlatformTagline {
          letter-spacing: normal;
          text-transform: none;
        }

        .doctorBriefReportArea[lang="ar"] .doctorBriefLabTable th,
        .doctorBriefReportArea[lang="ar"] .doctorBriefLabTable td {
          text-align: right;
        }

        @media (max-width: 820px) {
          .doctorBriefDocumentHeader {
            flex-direction: column;
          }

          .doctorBriefReferenceGrid {
            width: 100%;
            min-width: 0;
          }
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
          fontFamily: isArabic
            ? "Tahoma, Arial, sans-serif"
            : undefined,
          unicodeBidi: "isolate",
        }}
      >
        <header className="doctorBriefDocumentHeader">
          <div>
            <div className="doctorBriefBrandIdentity">
              <DoctorBriefOrganHealLogo />

              <div>
                <p className="doctorBriefPlatformName">OrganHeal</p>
                <span className="doctorBriefPlatformTagline">
                  {isArabic
                    ? "ذكاء صحي مدعوم بالذكاء الاصطناعي"
                    : "AI Health Intelligence"}
                </span>
              </div>
            </div>

            <p className="doctorBriefDocumentType">
              {isArabic
                ? "ملخص الذكاء السريري للطبيب"
                : "Clinical Intelligence Brief"}
            </p>

            <p className="doctorBriefDocumentSubtitle">
              {isArabic
                ? "ملخص سريري منظم لدعم المراجعة الطبية ومناقشة النتائج."
                : "A structured clinical summary prepared to support medical review and discussion."}
            </p>

            <span className="doctorBriefConfidentiality">
              {isArabic
                ? "وثيقة دعم سريري"
                : "Clinical Support Document"}
            </span>
          </div>

          <div className="doctorBriefReferenceGrid">
            <div className="doctorBriefReferenceItem">
              <span className="doctorBriefReferenceLabel">
                {isArabic ? "رقم التقرير" : "Report ID"}
              </span>
              <span className="doctorBriefReferenceValue">
                {doctorBriefReportId}
              </span>
            </div>

            <div className="doctorBriefReferenceItem">
              <span className="doctorBriefReferenceLabel">
                {isArabic ? "الإصدار" : "Version"}
              </span>
              <span className="doctorBriefReferenceValue">1.0</span>
            </div>

            <div className="doctorBriefReferenceItem">
              <span className="doctorBriefReferenceLabel">
                {isArabic ? "تاريخ الإنشاء" : "Generated"}
              </span>
              <span className="doctorBriefReferenceValue">
                {generatedAtText}
              </span>
            </div>

            <div className="doctorBriefReferenceItem">
              <span className="doctorBriefReferenceLabel">
                {isArabic ? "اللغة" : "Language"}
              </span>
              <span className="doctorBriefReferenceValue">
                {isArabic ? "العربية" : "English"}
              </span>
            </div>

            <div
              className="doctorBriefReferenceItem"
              style={{ gridColumn: "1 / -1" }}
            >
              <span className="doctorBriefReferenceLabel">
                {isArabic ? "المصدر" : "Source Report"}
              </span>
              <span className="doctorBriefReferenceValue">
                {fileName}
              </span>
            </div>
          </div>
        </header>

        <div
          className="doctorBriefPrintActions doctorBriefHeaderActions"
          style={{
            alignItems: isArabic ? "flex-start" : "flex-end",
            marginBottom: "18px",
          }}
        >
          <button
            className="secondaryBtn doctorBriefPrintButton"
            type="button"
            onClick={printDoctorBriefOnly}
          >
            {isArabic ? "طباعة ملخص الطبيب" : "Print Doctor Brief"}
          </button>

          <button
            id="doctor-brief-pdf-download"
            className="primaryBtn doctorBriefPrintButton"
            type="button"
            onClick={downloadDoctorBriefPdf}
          >
            {isArabic ? "تنزيل PDF" : "Download PDF"}
          </button>
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
              {isArabic
                ? mainFocus
                : executiveSummary?.prioritySystem || "N/A"}
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
<p
  style={{
    fontSize: "11px",
    fontWeight: 700,
    color: "#b91c1c",
    margin: "8px 0",
  }}
>
</p>
        <div className="doctorBriefClinicalIntro">
          <strong>
            {isArabic ? "نظرة سريرية سريعة" : "Clinical Snapshot"}
          </strong>

          <p className="ohCardText" style={{ marginBottom: 0 }}>
            {labSummaryText}
          </p>
        </div>

        <div className="ohStack">
          <article>
            <h3
              className="ohCardTitle doctorBriefSectionHeading"
              style={{ fontSize: "1.18rem" }}
            >
              {isArabic ? "١. الملخص السريري" : "1. Clinical Summary"}
            </h3>

            {isArabic ? (
              <ArabicParagraph>
                {text(
                  clinicalSummary,
                  "ملخص سريري غير متاح حاليًا."
                )}
              </ArabicParagraph>
            ) : (
              <EnglishParagraph>
                {text(
                  clinicalSummary,
                  "Clinical summary is not currently available."
                )}
              </EnglishParagraph>
            )}
          </article>

          {labMarkers.length > 0 && (
            <article>
              <h3
                className="ohCardTitle doctorBriefSectionHeading"
                style={{ fontSize: "1.18rem" }}
              >
                {isArabic
                  ? "٢. النتائج المختبرية ذات الصلة"
                  : "2. Relevant Laboratory Findings"}
              </h3>

              <div className="doctorBriefLabTableWrapper">
                <table className="doctorBriefLabTable">
                  <thead>
                    <tr>
                      <th>{isArabic ? "الفحص" : "Test"}</th>
                      <th>{isArabic ? "النتيجة" : "Result"}</th>
                      <th>{isArabic ? "الحالة" : "Status"}</th>
                      <th>{isArabic ? "المرجع" : "Reference"}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {labMarkers.map((marker, markerIndex) => {
                      const normalizedStatus =
                        marker.status.toLowerCase();

                      const statusClass =
                        normalizedStatus.includes("high")
                          ? "high"
                          : normalizedStatus.includes("low")
                            ? "low"
                            : normalizedStatus.includes("normal")
                              ? "normal"
                              : "neutral";

                      return (
                        <tr key={`${marker.name}-${markerIndex}`}>
                          <td className="doctorBriefLabName">
                            {marker.name}
                          </td>

                          <td>
                            <strong>
                              {marker.value}
                              {marker.unit ? ` ${marker.unit}` : ""}
                            </strong>
                          </td>

                          <td>
                            <span
                              className={`doctorBriefLabStatus doctorBriefLabStatus-${statusClass}`}
                            >
                              {isArabic
                                ? englishStatusToArabic(marker.status)
                                : marker.status}
                            </span>
                          </td>

                          <td>
                            {marker.ref ||
                              (isArabic ? "غير متاح" : "N/A")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          )}

          {shouldShowKeyFindings && (
            <article>
              <h3
                className="ohCardTitle doctorBriefSectionHeading"
                style={{ fontSize: "1.18rem" }}
              >
                {isArabic
                  ? "٣. أهم النتائج السريرية"
                  : "3. Key Clinical Findings"}
              </h3>

              {isArabic ? (
                <ArabicParagraph>{keyFindings}</ArabicParagraph>
              ) : (
                <EnglishParagraph>{keyFindings}</EnglishParagraph>
              )}
            </article>
          )}

          {isMeaningfulText(riskSignals) && (
            <article>
              <h3
                className="ohCardTitle doctorBriefSectionHeading"
                style={{ fontSize: "1.18rem" }}
              >
                {isArabic
                  ? "٤. إشارات الخطر أو الانتباه"
                  : "4. Risk and Attention Signals"}
              </h3>

              {isArabic ? (
                <ArabicParagraph>{riskSignals}</ArabicParagraph>
              ) : (
                <EnglishParagraph>{riskSignals}</EnglishParagraph>
              )}
            </article>
          )}

          {isMeaningfulText(recommendations) && (
            <article>
              <h3
                className="ohCardTitle doctorBriefSectionHeading"
                style={{ fontSize: "1.18rem" }}
              >
                {isArabic
                  ? "٥. المتابعة المقترحة"
                  : "5. Suggested Follow-Up"}
              </h3>

              {isArabic ? (
                <ArabicParagraph>{recommendations}</ArabicParagraph>
              ) : (
                <EnglishParagraph>{recommendations}</EnglishParagraph>
              )}
            </article>
          )}

          {optionalSections.map((section) => (
            <article key={section.key}>
              <h3
                className="ohCardTitle doctorBriefSectionHeading"
                style={{ fontSize: "1.18rem" }}
              >
                {isArabic ? section.titleAr : section.titleEn}
              </h3>

              {isArabic ? (
                <ArabicParagraph>
                  {text(section.value, "غير متاح")}
                </ArabicParagraph>
              ) : (
                <EnglishParagraph>
                  {text(section.value, "N/A")}
                </EnglishParagraph>
              )}
            </article>
          ))}
        </div>

        <div className="ohDivider" />

        <div className="ohTrustNotice doctorBriefPrintTip">
          <span aria-hidden="true">⚠️</span>
          <div>
            <strong>
              {isArabic ? "تنبيه طبي" : "Medical safety note"}
            </strong>
            <br />
            {isArabic
              ? "هذا الملخص مخصص لدعم تنظيم المعلومات والتحضير للمراجعة الطبية، ولا يستبدل التقييم السريري أو التشخيص أو الخطة العلاجية من مختص صحي مرخص."
              : "This brief supports information organization and preparation for medical review. It does not replace clinical evaluation, diagnosis, or treatment planning by a licensed healthcare professional."}
          </div>
        </div>
      </section>
    </>
  );
}
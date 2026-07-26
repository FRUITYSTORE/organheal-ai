"use client";

import { type ReactNode, useEffect, useRef } from "react";
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
function PatientPdfOrganHealLogo() {
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
          id="patientPdfOhGradient"
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
        stroke="url(#patientPdfOhGradient)"
        strokeWidth={28}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M394 354 L302 406 L217 399 L126 338"
        fill="none"
        stroke="url(#patientPdfOhGradient)"
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
  const combined = values
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n");

  const markerPattern =
    /([A-Za-z][A-Za-z0-9 %()\/.+-]{1,50}):\s*([<>]?\s*[0-9]+(?:\.[0-9]+)?)\s*([^|()\n]*?)\s*\((Normal|High|Low|Moderate)\)\s*\|\s*Ref:\s*(.*?)(?=\s*\|\s*[A-Za-z][A-Za-z0-9 %()\/.+-]{1,50}:\s*[<>]?\s*[0-9]|\n|$)/gi;

  const matches = Array.from(combined.matchAll(markerPattern));

  const markers = matches.map((match) => ({
    name: match[1].trim(),
    value: match[2].replace(/\s+/g, "").trim(),
    unit: (match[3] || "").trim(),
    status: match[4].trim(),
    ref: (match[5] || "")
      .replace(/\(default\)/gi, "")
      .replace(/\s*\|\s*$/g, "")
      .trim(),
  }));

  const uniqueMarkers = new Map<
    string,
    {
      name: string;
      value: string;
      unit: string;
      status: string;
      ref: string;
    }
  >();

  for (const marker of markers) {
    const key = `${marker.name.toLowerCase()}|${marker.value}|${marker.unit.toLowerCase()}`;

    if (!uniqueMarkers.has(key)) {
      uniqueMarkers.set(key, marker);
    }
  }

  return Array.from(uniqueMarkers.values());
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

function createPatientReportId(fileName: string, uploadedAtText: string) {
  const source = `${fileName}|${uploadedAtText}`;
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  const reference = hash.toString(36).toUpperCase().padStart(7, "0");

  return `OH-P-${reference}`;
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
.organhealPdfPage li {
  break-inside: auto !important;
  page-break-inside: auto !important;
  orphans: 3 !important;
  widows: 3 !important;
}

    .organhealPdfPage div {
      orphans: 3 !important;
      widows: 3 !important;
    }

    .organhealPdfKeepTogether {
  break-inside: auto !important;
  page-break-inside: auto !important;
}

.organhealPdfSection {
  break-inside: auto !important;
  page-break-inside: auto !important;
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
});

reportElement.querySelectorAll("p, li").forEach((element) => {
  const htmlElement = element as HTMLElement;

  htmlElement.style.breakInside = "auto";
  htmlElement.style.pageBreakInside = "auto";
  htmlElement.style.orphans = "3";
  htmlElement.style.widows = "3";
  htmlElement.style.lineHeight = "1.85";
  htmlElement.style.letterSpacing = "normal";
  htmlElement.style.wordSpacing = "normal";
  htmlElement.style.textTransform = "none";
});

reportElement.querySelectorAll("table").forEach((element) => {
  const htmlElement = element as HTMLElement;

  htmlElement.style.breakInside = "auto";
  htmlElement.style.pageBreakInside = "auto";
});

reportElement.querySelectorAll("thead").forEach((element) => {
  const htmlElement = element as HTMLElement;

  htmlElement.style.display = "table-header-group";
});

reportElement.querySelectorAll("tr").forEach((element) => {
  const htmlElement = element as HTMLElement;

  htmlElement.style.breakInside = "avoid";
  htmlElement.style.pageBreakInside = "avoid";
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

reportElement
  .querySelectorAll(".patientHealthStorySection")
  .forEach((element) => {
    const htmlElement = element as HTMLElement;

    htmlElement.style.breakInside = "auto";
    htmlElement.style.pageBreakInside = "auto";
  });
  
reportElement
  .querySelectorAll(
    ".patientReportDocumentHeader, .ohMetricCard"
  )
  .forEach((element) => {
    const htmlElement = element as HTMLElement;

    htmlElement.style.breakInside = "avoid";
    htmlElement.style.pageBreakInside = "avoid";
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

  useEffect(() => {
    const handlePatientPdfDownload = () => {
      void downloadPatientPdf();
    };

    window.addEventListener(
      "organheal:download-patient-pdf",
      handlePatientPdfDownload
    );

    return () => {
      window.removeEventListener(
        "organheal:download-patient-pdf",
        handlePatientPdfDownload
      );
    };
  }, []);

  const generatedAtText = new Date().toLocaleString(isArabic ? "ar" : undefined);
  const reportId = createPatientReportId(fileName, uploadedAtText);
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

  const patientReportSections = [
    {
      titleAr: "١. ماذا يعني هذا التقرير؟",
      titleEn: "1. What This Report Means",
      value: patientWhatThisMeans,
      fallbackAr: "تمت مراجعة تقريرك وتقديم ملخص صحي مبسط يساعدك على فهم الصورة العامة.",
      fallbackEn: "Your report was reviewed by OrganHeal AI and summarized in a simple way.",
    },
    {
      titleAr: "٢. أهم المؤشرات التي ظهرت",
      titleEn: "2. Main Things Noticed",
      value: patientMainThingsNoticed,
      fallbackAr: "لم يتم تحديد مؤشرات رئيسية واضحة من البيانات المتاحة حاليًا.",
      fallbackEn: "No major findings were clearly identified from the available data.",
    },
    {
      titleAr: "٣. ما الذي قد يحتاج إلى انتباه؟",
      titleEn: "3. What May Need Attention",
      value: patientWhatNeedsAttention,
      fallbackAr: "لا تظهر حاليًا إشارات واضحة تستدعي القلق العاجل، مع أهمية مراجعة التقرير الأصلي مع مختص صحي.",
      fallbackEn: "No urgent warning signals were clearly detected. Please review your original report with a healthcare professional.",
    },
    {
      titleAr: "٤. خطوات تالية مفيدة",
      titleEn: "4. Helpful Next Steps",
      value: patientHelpfulNextSteps,
      fallbackAr: "راجع النتائج مع مقدم رعاية صحية مرخص، واتبع توصيات المتابعة والفحوصات اللازمة.",
      fallbackEn: "Follow up with your healthcare provider if you have symptoms or concerns.",
    },
  ];

  async function downloadPatientPdf() {
    let temporaryContainer: HTMLDivElement | null = null;

    try {
      if (!patientReportRef.current) {
        throw new Error("Patient report element is not available.");
      }

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const reportElement =
        patientReportRef.current.cloneNode(true) as HTMLElement;

      reportElement
        .querySelectorAll(
          ".patientReportActions, .patientReportDownloadButton, .patientReportTip"
        )
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

      const safeFileName =
        fileName.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "report";
const pdfWorker = html2pdf()
  .set({
    pagebreak: {
      mode: ["css", "legacy"],
      avoid: [
        "h1",
        "h2",
        "h3",
        "tr",
        ".patientReportDocumentHeader",
        ".ohMetricCard",
        ],
    },
    margin: [16, 18, 20, 18],
   filename: `OrganHeal-Patient-Report-${safeFileName}-${Date.now()}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
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

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    pdf.setPage(pageNumber);

    pdf.setDrawColor(219, 228, 238);
    pdf.setLineWidth(0.25);
    pdf.line(18, pageHeight - 13, pageWidth - 18, pageHeight - 13);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);

    pdf.text(
      "OrganHeal AI · Patient Health Intelligence Report",
      18,
      pageHeight - 8
    );

    pdf.text(
      `Report ID: ${reportId}`,
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
      console.error("Patient PDF failed:", error);
      window.alert(
        isArabic
          ? "تعذر إنشاء تقرير المريض PDF. يرجى المحاولة مرة أخرى."
          : "The Patient PDF could not be generated. Please try again."
      );
    } finally {
      temporaryContainer?.remove();
    }
  }

  return (
    <>
          <style>{`
          .patientReportPreviewShell {
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.09);
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.05);
}

.patientReportPreviewHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
}

.patientReportPreviewIdentity {
  min-width: 0;
}

.patientReportPreviewEyebrow {
  margin: 0;
  color: #0f766e;
  font-size: 0.7rem;
  font-weight: 950;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.patientReportPreviewTitle {
  margin: 6px 0 0;
  color: #0f172a;
  font-size: 1.12rem;
  font-weight: 950;
  line-height: 1.35;
}

.patientReportPreviewDescription {
  max-width: 680px;
  margin: 6px 0 0;
  color: #64748b;
  font-size: 0.84rem;
  line-height: 1.6;
}

.patientReportPreviewActions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 9px;
}

.patientReportPreviewDetails {
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.patientReportPreviewSummary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 15px 20px;
  cursor: pointer;
  list-style: none;
  color: #334155;
  font-size: 0.82rem;
  font-weight: 900;
  background: #f8fafc;
}

.patientReportPreviewSummary::-webkit-details-marker {
  display: none;
}

.patientReportPreviewSummary:hover {
  background: #f0fdfa;
}

.patientReportPreviewChevron {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  transition: transform 180ms ease;
}

.patientReportPreviewDetails[open]
  .patientReportPreviewChevron {
  transform: rotate(180deg);
  background: #ccfbf1;
  color: #0f766e;
}

.patientReportPreviewContent {
  padding: 18px;
  background: #f8fafc;
}

.patientReportPreviewContent .patientReportPdfArea {
  margin: 0;
}

@media (max-width: 720px) {
  .patientReportPreviewHeader {
    align-items: stretch;
    flex-direction: column;
  }

  .patientReportPreviewActions {
    width: 100%;
  }

  .patientReportPreviewActions button {
    width: 100%;
    justify-content: center;
  }
}
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
.patientLabTableWrapper {
  width: 100%;
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid #dbe4ee;
  border-radius: 12px;
  background: #ffffff;
  break-inside: auto;
  page-break-inside: auto;
}

.patientLabTable {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.patientLabTable th {
  padding: 10px 12px;
  background: #f1f5f9;
  color: #334155;
  font-size: 0.74rem;
  font-weight: 800;
  text-align: left;
  border-bottom: 1px solid #dbe4ee;
}

.patientLabTable td {
  padding: 11px 12px;
  color: #1e293b;
  font-size: 0.76rem;
  line-height: 1.45;
  vertical-align: middle;
  border-bottom: 1px solid #e8edf3;
  overflow-wrap: anywhere;
}

.patientLabTable tr:last-child td {
  border-bottom: none;
}

.patientLabTable th:nth-child(1),
.patientLabTable td:nth-child(1) {
  width: 30%;
}

.patientLabTable th:nth-child(2),
.patientLabTable td:nth-child(2) {
  width: 22%;
}

.patientLabTable th:nth-child(3),
.patientLabTable td:nth-child(3) {
  width: 20%;
}

.patientLabTable th:nth-child(4),
.patientLabTable td:nth-child(4) {
  width: 28%;
}

.patientLabTable thead {
  display: table-header-group;
}

.patientLabTable tbody {
  display: table-row-group;
}

.patientLabTable tr {
  break-inside: avoid;
  page-break-inside: avoid;
}

.patientLabPageBreak {
  display: block;
  height: 0;
  margin: 0;
  padding: 0;
  break-before: page;
  page-break-before: always;
}

.patientLabTableWrapper {
  break-before: auto !important;
  page-break-before: auto !important;
  break-inside: auto !important;
  page-break-inside: auto !important;
  overflow: visible !important;
}

.patientLabName {
  font-weight: 800;
  color: #0f172a !important;
}

.patientLabStatus {
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

.patientLabStatus-high {
  background: #fff1f2;
  color: #be123c;
  border: 1px solid #fecdd3;
}

.patientLabStatus-low {
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.patientLabStatus-normal {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.patientLabStatus-neutral {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.patientReportPdfArea[lang="ar"] .patientLabTable th,
.patientReportPdfArea[lang="ar"] .patientLabTable td {
  text-align: right;
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
.patientReportDocumentHeader {
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
.patientReportBrandIdentity {
  display: flex;
  align-items: center;
  gap: 13px;
}

.patientReportBrandText {
  min-width: 0;
}

.patientReportPlatformName {
  margin: 0;
  color: #0f172a;
  font-size: 1.22rem;
  font-weight: 850;
  line-height: 1.1;
}

.patientReportPlatformTagline {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 0.63rem;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.patientReportPdfArea[lang="ar"] .patientReportPlatformTagline {
  letter-spacing: normal;
  text-transform: none;
}
.patientReportBrandBlock {
  min-width: 0;
}

.patientReportBrandName {
  margin: 0;
  color: #153f63;
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1.2;
}

.patientReportDocumentType {
  margin: 13px 0 0;
  color: #153f63;
  font-size: 0.96rem;
  font-weight: 800;
  line-height: 1.35;
}

.patientReportDocumentSubtitle {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 0.79rem;
  line-height: 1.5;
}

.patientReportReferenceGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(130px, 1fr));
  gap: 10px 18px;
  min-width: 320px;
}

.patientReportReferenceItem {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.patientReportReferenceLabel {
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.3;
  text-transform: uppercase;
}

.patientReportReferenceValue {
  color: #111827;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.patientReportConfidentiality {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin-top: 12px;
  padding: 5px 9px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  color: #475569;
  background: #ffffff;
  font-size: 0.7rem;
  font-weight: 700;
}

.patientReportPdfArea[lang="ar"] .patientReportReferenceLabel {
  text-transform: none;
}

@media (max-width: 820px) {
  .patientReportDocumentHeader {
    flex-direction: column;
  }

  .patientReportReferenceGrid {
    width: 100%;
    min-width: 0;
  }
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
<section className="patientReportPreviewShell">
  <div className="patientReportPreviewHeader">
    <div className="patientReportPreviewIdentity">
      <p className="patientReportPreviewEyebrow">
        {isArabic ? "تقرير المريض" : "Patient Report"}
      </p>

      <h3 className="patientReportPreviewTitle">
        {isArabic
          ? "تقرير الذكاء الصحي للمريض"
          : "Patient Health Intelligence Report"}
      </h3>

      <p className="patientReportPreviewDescription">
        {isArabic
          ? "نسخة مبسطة للمريض تلخص أهم النتائج والخطوات التالية. يمكنك تنزيلها مباشرة أو فتح المعاينة الكاملة."
          : "A patient-friendly summary of the important findings and next steps. Download it directly or open the full preview."}
      </p>
    </div>

    <div className="patientReportPreviewActions">
      <button
        id="patient-analysis-pdf-download"
        className="primaryBtn"
        type="button"
        onClick={downloadPatientPdf}
      >
        {isArabic ? "تنزيل PDF" : "Download PDF"}
      </button>
    </div>
  </div>

  <details className="patientReportPreviewDetails">
    <summary className="patientReportPreviewSummary">
      <span>
        {isArabic
          ? "معاينة التقرير الكامل"
          : "Preview full patient report"}
      </span>

      <span
        className="patientReportPreviewChevron"
        aria-hidden="true"
      >
        ↓
      </span>
    </summary>

    <div className="patientReportPreviewContent"></div>
     
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
  <header className="patientReportDocumentHeader organhealPdfKeepTogether">
   <div className="patientReportBrandBlock">
  <div className="patientReportBrandIdentity">
    <PatientPdfOrganHealLogo />

    <div className="patientReportBrandText">
      <p className="patientReportPlatformName">OrganHeal</p>

      <span className="patientReportPlatformTagline">
        {isArabic
          ? "ذكاء صحي مدعوم بالذكاء الاصطناعي"
          : "AI Health Intelligence"}
      </span>
    </div>
  </div>

  <p className="patientReportDocumentType">
    {isArabic
      ? "تقرير الذكاء الصحي للمريض"
      : "Patient Health Intelligence Report"}
  </p>

  <p className="patientReportDocumentSubtitle">
    {isArabic
      ? "ملخص صحي مبسط تم إنشاؤه من التقرير والبيانات المتاحة."
      : "A patient-friendly health summary generated from the available report data."}
  </p>

  <span className="patientReportConfidentiality">
    {isArabic
      ? "وثيقة صحية شخصية"
      : "Personal Health Document"}
  </span>
</div>

    <div className="patientReportReferenceGrid">
      <div className="patientReportReferenceItem">
        <span className="patientReportReferenceLabel">
          {isArabic ? "رقم التقرير" : "Report ID"}
        </span>
        <span className="patientReportReferenceValue">
          {reportId}
        </span>
      </div>

      <div className="patientReportReferenceItem">
        <span className="patientReportReferenceLabel">
          {isArabic ? "الإصدار" : "Version"}
        </span>
        <span className="patientReportReferenceValue">
          1.0
        </span>
      </div>

      <div className="patientReportReferenceItem">
        <span className="patientReportReferenceLabel">
          {isArabic ? "تاريخ الإنشاء" : "Generated"}
        </span>
        <span className="patientReportReferenceValue">
          {generatedAtText}
        </span>
      </div>

      <div className="patientReportReferenceItem">
        <span className="patientReportReferenceLabel">
          {isArabic ? "اللغة" : "Language"}
        </span>
        <span className="patientReportReferenceValue">
          {isArabic ? "العربية" : "English"}
        </span>
      </div>

      <div
        className="patientReportReferenceItem"
        style={{ gridColumn: "1 / -1" }}
      >
        <span className="patientReportReferenceLabel">
          {isArabic ? "الملف الأصلي" : "Source Report"}
        </span>
        <span className="patientReportReferenceValue">
          {fileName}
        </span>
      </div>
    </div>
  </header>

        <div className="ohCardHeader">
          <div>
            <div>
  <p className="ohMetricLabel">
    {isArabic ? "الملخص التنفيذي" : "Executive Summary"}
  </p>

  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
    {isArabic ? "نظرة سريعة على وضعك الصحي" : "Your Health at a Glance"}
  </h2>

  <p className="ohCardText">
    {isArabic
      ? "ملخص سريع لأهم النتائج والاتجاهات التي ظهرت من بياناتك الصحية المتاحة."
      : "A concise overview of the most important findings and trends identified from your available health data."}
  </p>
</div>
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

        <div className="ohStack">
          {patientReportSections.map((section, index) => (
            <article key={section.titleEn}>
              <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                {isArabic ? section.titleAr : section.titleEn}
              </h3>

              {isArabic ? (
                <ArabicParagraph>
                  {text(section.value, section.fallbackAr)}
                </ArabicParagraph>
              ) : (
                <EnglishParagraph>
                  {text(section.value, section.fallbackEn)}
                </EnglishParagraph>
              )}

            {index === 1 && labMarkers.length > 0 && (
  <>
    <div className="patientLabPageBreak" aria-hidden="true" />

    <div className="patientLabTableWrapper">
    <table className="patientLabTable">
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
          const normalizedStatus = marker.status.toLowerCase();

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
              <td className="patientLabName">
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
                  className={`patientLabStatus patientLabStatus-${statusClass}`}
                >
                  {isArabic
                    ? englishStatusToArabic(marker.status)
                    : marker.status}
                </span>
              </td>

              <td>
                {marker.ref || (isArabic ? "غير متاح" : "N/A")}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  </>
)}
            </article>
          ))}

          <article
  className={
    isArabic
      ? "ohTrustNotice patientHealthStorySection"
      : "patientHealthStorySection"
  }
>
            {isArabic && <span aria-hidden="true">📈</span>}

            <div>
              {isArabic ? (
                <>
                  <strong>٥. اتجاهك الصحي</strong>
                  <br />
                  <p style={{ margin: "8px 0 0" }}>
                    {text(
                      patientHealthStory,
                      "ستصبح قصة صحتك أوضح مع إضافة المزيد من التقارير والفحوصات والمتابعات."
                    )}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                    5. Your Health Story in Simple Words
                  </h3>
                  <EnglishParagraph>
                    {text(
                      patientHealthStory,
                      "As more assessments, check-ins, and reports are added, OrganHeal will build a clearer picture of your health journey."
                    )}
                  </EnglishParagraph>
                </>
              )}
            </div>
          </article>
        </div>

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

    </details>
</section>
    </>
  );
}
"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageBackActions from "../components/PageBackActions";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";
type UploadStep = "idle" | "uploading" | "saved" | "error";
type ReportType =
  | "lab"
  | "radiology"
  | "clinical"
  | "prescription"
  | "medical";

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 20;

export default function LabUploadPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [latestUploadedFileName, setLatestUploadedFileName] = useState("");
  const [latestUploadedReportId, setLatestUploadedReportId] =
    useState<number | null>(null);
  const [savedFileNames, setSavedFileNames] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [uploading, setUploading] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("lab");

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const savedLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    loadPendingHeroFile();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  function loadPendingHeroFile() {
    const currentLanguage =
      (localStorage.getItem("organheal-language") as Language | null) || "en";
    const currentIsArabic = currentLanguage === "ar";

    const uploadedFileName = sessionStorage.getItem(
      "organheal-latest-uploaded-lab-file"
    );

    if (uploadedFileName) {
      setLatestUploadedFileName(uploadedFileName);
      setMessage(
        currentIsArabic
          ? `تم اختيار الملف "${uploadedFileName}" من الصفحة الرئيسية. اختر الملف من جهازك هنا لحفظه داخل حسابك.`
          : `Your file "${uploadedFileName}" was selected from the homepage. Choose it from your device here to save it to your account.`
      );
      sessionStorage.removeItem("organheal-latest-uploaded-lab-file");
      return;
    }

    const pendingFileName = sessionStorage.getItem(
      "organheal-pending-lab-file"
    );

    if (pendingFileName) {
      setLatestUploadedFileName(pendingFileName);
      setMessage(
        currentIsArabic
          ? `تم اختيار "${pendingFileName}" من الصفحة الرئيسية. اختره من جهازك للمتابعة.`
          : `You selected "${pendingFileName}" from the homepage. Choose it from your device to continue.`
      );
      sessionStorage.removeItem("organheal-pending-lab-file");
    }
  }

  function isAllowedFile(file: File) {
    const lowerName = file.name.toLowerCase();

    return (
      file.type === "application/pdf" ||
      file.type === "image/png" ||
      file.type === "image/jpeg" ||
      lowerName.endsWith(".pdf") ||
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg")
    );
  }

  function getSafeStorageFileName(name: string) {
    const safeName = name
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");

    return safeName || "medical-report";
  }

  function getSelectedFileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  function addFiles(files: File[]) {
    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];

    for (const file of files) {
      const sizeMb = file.size / (1024 * 1024);

      if (!isAllowedFile(file)) {
        rejectedFiles.push(`${file.name} - unsupported type`);
        continue;
      }

      if (sizeMb > MAX_FILE_SIZE_MB) {
        rejectedFiles.push(`${file.name} - larger than ${MAX_FILE_SIZE_MB} MB`);
        continue;
      }

      validFiles.push(file);
    }

    const combinedFiles = [...selectedFiles, ...validFiles].slice(0, MAX_FILES);
    setSelectedFiles(combinedFiles);
    setSavedFileNames([]);

    if (rejectedFiles.length > 0) {
      setMessage(
        text(
          `Some files were not added: ${rejectedFiles.join(
            ", "
          )}. Supported files: PDF, PNG, JPG, JPEG.`,
          `لم تتم إضافة بعض الملفات: ${rejectedFiles.join(
            ", "
          )}. الملفات المدعومة: PDF وPNG وJPG وJPEG.`
        )
      );
      setUploadStep("error");
      return;
    }

    setMessage("");
    setUploadStep("idle");
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files || []));
  }

  function removeSelectedFile(fileToRemove: File) {
    if (uploading) return;

    setSelectedFiles((current) =>
      current.filter(
        (file) =>
          getSelectedFileKey(file) !== getSelectedFileKey(fileToRemove)
      )
    );
    setMessage("");
    setUploadStep("idle");
  }

  function resetUpload() {
    if (uploading) return;

    setSelectedFiles([]);
    setSavedFileNames([]);
    setLatestUploadedFileName("");
    setLatestUploadedReportId(null);
    setMessage("");
    setUploadStep("idle");
  }

  async function uploadFiles() {
    if (selectedFiles.length === 0) {
      setMessage(
        text(
          "Please select at least one PDF or image first.",
          "يرجى اختيار ملف PDF أو صورة واحدة على الأقل أولًا."
        )
      );
      setUploadStep("error");
      return;
    }

    if (selectedFiles.length > MAX_FILES) {
      setMessage(
        text(
          `You can upload up to ${MAX_FILES} files at a time.`,
          `يمكنك رفع ${MAX_FILES} ملفات كحد أقصى في كل مرة.`
        )
      );
      setUploadStep("error");
      return;
    }

    setUploading(true);
    setUploadStep("uploading");
    setMessage("");
    setSavedFileNames([]);
    setLatestUploadedReportId(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage(
        text(
          "Please login or sign up to upload medical reports.",
          "يرجى تسجيل الدخول أو إنشاء حساب لرفع التقارير الطبية."
        )
      );
      setUploading(false);
      setUploadStep("error");
      return;
    }

    const user = userData.user;
    const filesToUpload = [...selectedFiles];
    const uploadedNames: string[] = [];

    for (const file of filesToUpload) {
      const safeName = getSafeStorageFileName(file.name);
      const filePath = `${user.id}/${Date.now()}-${safeName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("lab-reports")
        .upload(filePath, file, {
          upsert: false,
        });

      if (uploadError || !uploadData?.path) {
        setMessage(
          uploadError
            ? `Upload error: ${uploadError.message}`
            : text(
                "Upload failed because no saved file path was returned.",
                "فشل الرفع لأن مسار الملف المحفوظ لم يتم إرجاعه."
              )
        );
        setUploading(false);
        setUploadStep("error");
        return;
      }

      const savedFilePath = uploadData.path;

      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from("lab-reports")
          .createSignedUrl(savedFilePath, 60 * 60);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        await supabase.storage.from("lab-reports").remove([savedFilePath]);

        setMessage(
          signedUrlError
            ? `Signed URL error: ${signedUrlError.message}`
            : text(
                "The uploaded report could not be prepared for secure access.",
                "تعذر تجهيز التقرير المرفوع للوصول الآمن."
              )
        );
        setUploading(false);
        setUploadStep("error");
        return;
      }

      const { data: insertedFile, error: databaseError } = await supabase
        .from("uploaded_lab_files")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: savedFilePath,
          file_url: signedUrlData.signedUrl,
          report_type: reportType,
          analysis_status: "uploaded",
          ai_summary:
            "Medical report uploaded successfully. Report intelligence can be generated from the Reports Library.",
          extraction_status: "Pending",
          extracted_text: null,
          extracted_at: null,
        })
        .select("id")
        .single();

      if (databaseError || !insertedFile) {
        await supabase.storage.from("lab-reports").remove([savedFilePath]);

        setMessage(
          databaseError
            ? `Database error: ${databaseError.message}`
            : text(
                "The uploaded report could not be saved. Please try again.",
                "تعذر حفظ التقرير المرفوع. يرجى المحاولة مرة أخرى."
              )
        );
        setUploading(false);
        setUploadStep("error");
        return;
      }

      const { error: insightError } = await supabase
        .from("health_insights")
        .insert([
          {
            user_id: user.id,
            report_id: insertedFile.id,
            report_type: reportType,
            insight_title: "Medical report uploaded",
            ai_status: "Pending",
            risk_level: "pending",
            summary:
              "Report uploaded successfully and ready for intelligence review.",
            key_findings: "Pending extraction.",
            risk_signals: "Pending extraction.",
            recommendations:
              "Open this report from Reports Library to generate report intelligence.",
            doctor_brief: "Pending intelligence generation.",
            next_best_action:
              "Open Reports Library and analyze this report.",
          },
        ]);

      if (insightError) {
        await supabase
          .from("uploaded_lab_files")
          .delete()
          .eq("id", insertedFile.id)
          .eq("user_id", user.id);

        await supabase.storage.from("lab-reports").remove([savedFilePath]);

        setMessage(
          text(
            "The report could not be prepared for analysis. Nothing was saved. Please try again.",
            "تعذر تجهيز التقرير للتحليل. لم يتم حفظ شيء. يرجى المحاولة مرة أخرى."
          )
        );
        setUploading(false);
        setUploadStep("error");
        return;
      }

      uploadedNames.push(file.name);
      setLatestUploadedReportId(insertedFile.id);
    }

    setSelectedFiles([]);
    setSavedFileNames(uploadedNames);
    setLatestUploadedFileName(uploadedNames.at(-1) || "");
    setUploading(false);
    setUploadStep("saved");
    setMessage(
      text(
        `${uploadedNames.length} report(s) saved successfully. Continue to analyze the latest saved report, or open Reports Library to manage all reports.`,
        `تم حفظ ${uploadedNames.length} تقرير بنجاح. تابع لتحليل آخر تقرير محفوظ، أو افتح مكتبة التقارير لإدارة جميع التقارير.`
      )
    );
  }

  const journeyStep =
    uploadStep === "saved"
      ? 3
      : uploading || uploadStep === "uploading"
      ? 2
      : 1;

 const journeyItems = [
  {
    number: 1,
    title: text("Upload", "الرفع"),
    description: text(
      "Choose one or more supported medical reports.",
      "اختر تقريرًا طبيًا واحدًا أو أكثر من الملفات المدعومة."
    ),
  },
  {
    number: 2,
    title: text("Save", "الحفظ"),
    description: text(
      "Store the selected reports securely inside your account.",
      "احفظ التقارير المختارة بأمان داخل حسابك."
    ),
  },
  {
    number: 3,
    title: text("Analyze", "التحليل"),
    description: text(
      "Continue with the latest saved report to generate its health intelligence.",
      "تابع باستخدام آخر تقرير محفوظ لإنشاء التحليل الصحي الذكي."
    ),
  },
  {
    number: 4,
    title: text("Reports Library", "مكتبة التقارير"),
    description: text(
      "Return anytime to open, manage, or review your saved reports.",
      "ارجع في أي وقت لفتح تقاريرك المحفوظة أو إدارتها أو مراجعتها."
    ),
  },
];

  return (
    <main
      className="ohPageShell labUploadPageV4"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .labUploadPageV4,
        .labUploadPageV4 * {
          box-sizing: border-box;
        }

        .labUploadPageV4 {
          min-height: 100vh;
          background:
            radial-gradient(circle at 8% 0%, rgba(14, 165, 233, 0.1), transparent 26%),
            radial-gradient(circle at 92% 12%, rgba(13, 148, 136, 0.1), transparent 30%),
            linear-gradient(180deg, #f8fbff 0%, #f1f5f9 46%, #ffffff 100%);
          color: #0f172a;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .labUploadPageV4 a {
          color: inherit;
          text-decoration: none;
        }

        .labUploadPageV4 .ohContainer {
          max-width: 1180px;
        }

        .labUploadHero {
          overflow: hidden;
          padding: 44px;
          border-radius: 30px;
          border: 1px solid rgba(15, 118, 110, 0.18);
          background:
            radial-gradient(circle at 88% 12%, rgba(45, 212, 191, 0.22), transparent 34%),
            linear-gradient(135deg, #071525 0%, #0f2435 50%, #0f766e 100%);
          color: #ffffff;
          box-shadow: 0 24px 64px rgba(15, 23, 42, 0.2);
        }

        .labUploadHero .ohHeroGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.65fr);
          gap: 42px;
          align-items: center;
        }

        .labUploadHero :is(h1, h2, h3, p, span, strong) {
          color: #ffffff;
        }

        .labUploadHero .ohTitle {
          max-width: 700px;
          margin: 0;
          font-size: clamp(2.35rem, 4vw, 3.65rem);
          line-height: 1.04;
          letter-spacing: -0.035em;
          font-family: inherit;
          font-weight: 850;
        }

        .labUploadHero .ohLead {
          max-width: 680px;
          margin-top: 18px;
          color: rgba(226, 232, 240, 0.9);
          font-size: 1.04rem;
          line-height: 1.75;
        }

        .labUploadHero .ohEyebrow {
          color: #99f6e4;
          letter-spacing: 0.12em;
        }

        .heroPurposeCard {
          padding: 24px;
          border: 1px solid rgba(153, 246, 228, 0.22);
          border-radius: 22px;
          background: rgba(6, 78, 59, 0.34);
          backdrop-filter: blur(10px);
          box-shadow: 0 18px 44px rgba(2, 6, 23, 0.18);
        }

        .heroPurposeCard .ohMetricLabel {
          color: #99f6e4;
        }

        .heroPurposeCard .ohCardTitle {
          margin-top: 8px;
          color: #ffffff;
          font-size: 1.2rem;
          line-height: 1.4;
        }

        .heroPurposeCard .ohCardText {
          color: rgba(226, 232, 240, 0.86);
          line-height: 1.7;
        }

        .uploadJourney {
          display: grid;
         grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          padding: 14px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
        }

        .uploadJourneyItem {
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr);
          gap: 12px;
          min-height: 96px;
          padding: 15px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 18px;
          background: #f8fafc;
        }

        .uploadJourneyItem.current {
          border-color: rgba(15, 118, 110, 0.45);
          background: linear-gradient(
            145deg,
            rgba(204, 251, 241, 0.8),
            rgba(239, 246, 255, 0.9)
          );
          box-shadow: 0 14px 34px rgba(15, 118, 110, 0.12);
        }

        .uploadJourneyItem.completed {
          border-color: rgba(13, 148, 136, 0.22);
          background: rgba(240, 253, 250, 0.9);
        }

        .uploadJourneyNumber {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #e2e8f0;
          color: #475569;
          font-weight: 900;
        }

        .uploadJourneyItem.current .uploadJourneyNumber {
          background: #0f766e;
          color: #ffffff;
        }

        .uploadJourneyItem.completed .uploadJourneyNumber {
          background: #ccfbf1;
          color: #0f766e;
        }

        .uploadJourneyTitle {
          display: block;
          margin-bottom: 5px;
          color: #0f172a;
          font-size: 0.98rem;
          font-weight: 900;
        }

        .uploadJourneyDescription {
          margin: 0;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.5;
        }

        .uploadJourneyState {
          display: inline-flex;
          margin-top: 9px;
          color: #64748b;
          font-size: 0.72rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .uploadJourneyItem.current .uploadJourneyState,
        .uploadJourneyItem.completed .uploadJourneyState {
          color: #0f766e;
        }

        .uploadWorkspace {
          display: grid;
          grid-template-columns: minmax(0, 1.32fr) minmax(280px, 0.58fr);
          gap: 22px;
          align-items: start;
        }

        .uploadCard,
        .supportedCard,
        .savedReceipt {
          padding: 24px;
          border: 1px solid rgba(15, 23, 42, 0.09);
          border-radius: 26px;
          background: #ffffff;
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.07);
        }

        .uploadCardHeader {
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 20px;
          background: linear-gradient(135deg, #071525, #0f766e);
          color: #ffffff;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
        }

        .uploadCardHeader :is(h2, p, span, strong) {
          color: #ffffff;
        }

        .uploadDropzone {
          display: grid;
          place-items: center;
          gap: 12px;
          min-height: 220px;
          padding: 26px;
          border: 1.5px dashed rgba(15, 118, 110, 0.42);
          border-radius: 22px;
          background:
            radial-gradient(circle at 50% 20%, rgba(20, 184, 166, 0.11), transparent 30%),
            linear-gradient(180deg, #ffffff, #f0fdfa);
          text-align: center;
          cursor: pointer;
          transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
        }

        .uploadDropzone:hover {
          border-color: #0f766e;
          transform: translateY(-1px);
          box-shadow: 0 12px 30px rgba(15, 118, 110, 0.08);
        }

        .uploadDropzoneIcon {
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          border: 1px solid rgba(15, 118, 110, 0.14);
          background: #ccfbf1;
          color: #0f766e;
          font-size: 0.9rem;
          font-weight: 950;
        }

        .uploadFileList {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .uploadFileRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 14px;
          border: 1px solid rgba(15, 23, 42, 0.09);
          border-radius: 18px;
          background: #f8fafc;
        }

        .uploadFileRow strong {
          display: block;
          overflow: hidden;
          color: #0f172a;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .uploadFileRow span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 0.82rem;
          font-weight: 750;
        }

        .uploadNotice {
          display: flex;
          gap: 12px;
          padding: 17px;
          border-radius: 20px;
          border: 1px solid rgba(15, 118, 110, 0.15);
          background: #f0fdfa;
          color: #134e4a;
        }

        .uploadNotice.error {
          border-color: rgba(185, 28, 28, 0.2);
          background: #fef2f2;
          color: #991b1b;
        }

        .savedReceipt {
          border-top: 6px solid #10b981;
          background:
            radial-gradient(circle at 90% 10%, rgba(16, 185, 129, 0.11), transparent 30%),
            #ffffff;
        }

        .savedFileList {
          display: grid;
          gap: 8px;
          margin: 16px 0 0;
          padding: 0;
          list-style: none;
        }

        .savedFileList li {
          padding: 11px 13px;
          border-radius: 14px;
          background: #f0fdf4;
          color: #166534;
          font-weight: 800;
        }

        .supportedList {
          display: grid;
          gap: 10px;
          margin-top: 18px;
        }

        .supportedItem {
          padding: 15px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-inline-start: 4px solid #0f766e;
          border-radius: 16px;
          background: #ffffff;
        }

        .supportedItem strong {
          display: block;
          color: #0f172a;
        }

        .supportedItem p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 0.86rem;
          line-height: 1.55;
        }

        .labUploadPageV4 input,
        .labUploadPageV4 select {
          width: 100%;
          min-height: 46px;
          padding: 0 14px;
          border: 1px solid rgba(15, 23, 42, 0.2);
          border-radius: 14px;
          background: #ffffff;
          color: #0f172a;
          font-weight: 800;
        }

        .labUploadPageV4 .primaryBtn,
        .labUploadPageV4 .secondaryBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 17px;
          border-radius: 999px;
          font-weight: 950;
          text-decoration: none;
        }

        .labUploadPageV4 .primaryBtn {
          border: 0;
          background: linear-gradient(135deg, #0f766e, #14b8a6);
          color: #ffffff;
          box-shadow: 0 14px 34px rgba(20, 184, 166, 0.25);
        }

        .labUploadPageV4 .secondaryBtn {
          border: 1px solid rgba(15, 118, 110, 0.25);
          background: #ffffff;
          color: #0f766e;
        }

        .labUploadPageV4 button:disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }
.savedReceiptActions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 22px;
}

.savedPrimaryAction {
  min-width: 190px;
}

.savedTertiaryAction {
  min-height: 42px;
  padding: 0 6px;
  border: 0;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
}

.savedTertiaryAction:hover {
  color: #0f766e;
  text-decoration: underline;
}
        @media (max-width: 980px) {
          .labUploadHero .ohHeroGrid,
          .uploadWorkspace,
          .uploadJourney {
            grid-template-columns: 1fr;
          }

          .labUploadHero {
            padding: 34px;
          }
        }

        @media (max-width: 640px) {
          .labUploadHero {
            padding: 26px;
            border-radius: 26px;
          }

          .uploadCard,
          .supportedCard,
          .savedReceipt {
            padding: 18px;
            border-radius: 24px;
          }

          .uploadFileRow {
            grid-template-columns: 1fr;
          }
        }

        /* LAB_UPLOAD_VISUAL_STABILIZATION_V6 */
        .labUploadPageV4 {
          background:
            radial-gradient(circle at 8% 0%, rgba(14, 165, 233, 0.08), transparent 27%),
            radial-gradient(circle at 92% 12%, rgba(13, 148, 136, 0.08), transparent 31%),
            linear-gradient(180deg, #f8fafc 0%, #f1f5f9 48%, #ffffff 100%) !important;
        }

        .labUploadPageV4 .labUploadHero {
          width: 100% !important;
          min-height: auto !important;
          padding: 44px !important;
          border-radius: 30px !important;
          background:
            radial-gradient(circle at 88% 10%, rgba(45, 212, 191, 0.22), transparent 34%),
            linear-gradient(135deg, #071525 0%, #10283a 52%, #0f766e 100%) !important;
          box-shadow: 0 24px 64px rgba(15, 23, 42, 0.2) !important;
        }

        .labUploadPageV4 .labUploadHero .ohHeroGrid {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 48px !important;
          align-items: center !important;
        }

        .labUploadPageV4 .labUploadHero .ohTitle {
          max-width: 690px !important;
          margin: 0 !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: clamp(2.35rem, 4vw, 3.65rem) !important;
          font-weight: 850 !important;
          line-height: 1.05 !important;
          letter-spacing: -0.04em !important;
          color: #ffffff !important;
        }

        .labUploadPageV4 .labUploadHero .ohLead {
          max-width: 720px !important;
          margin-top: 18px !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: 1.03rem !important;
          font-weight: 500 !important;
          line-height: 1.75 !important;
          color: rgba(226, 232, 240, 0.9) !important;
        }

        .labUploadPageV4 .labUploadHero .ohEyebrow {
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          color: #99f6e4 !important;
          letter-spacing: 0.12em !important;
        }

        .labUploadPageV4 .heroPurposeCard {
          width: 100% !important;
          min-height: 230px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          padding: 28px !important;
          border: 1px solid rgba(153, 246, 228, 0.25) !important;
          border-radius: 24px !important;
          background: rgba(6, 78, 59, 0.38) !important;
          box-shadow: 0 18px 44px rgba(2, 6, 23, 0.18) !important;
        }

        .labUploadPageV4 .heroPurposeCard .ohMetricLabel {
          color: #99f6e4 !important;
        }

        .labUploadPageV4 .heroPurposeCard .ohCardTitle {
          margin: 8px 0 10px !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: 1.35rem !important;
          font-weight: 800 !important;
          line-height: 1.4 !important;
          color: #ffffff !important;
        }

        .labUploadPageV4 .heroPurposeCard .ohCardText {
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: 0.96rem !important;
          line-height: 1.7 !important;
          color: rgba(226, 232, 240, 0.88) !important;
        }

        @media (max-width: 980px) {
          .labUploadPageV4 .labUploadHero .ohHeroGrid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }

          .labUploadPageV4 .labUploadHero {
            padding: 34px !important;
          }

          .labUploadPageV4 .heroPurposeCard {
            min-height: auto !important;
          }
        }

        @media (max-width: 640px) {
          .labUploadPageV4 .labUploadHero {
            padding: 26px !important;
          }

          .labUploadPageV4 .labUploadHero .ohTitle {
            font-size: clamp(2.15rem, 11vw, 3rem) !important;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        <section className="labUploadHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Medical Report Upload", "رفع التقارير الطبية")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Upload and save your medical reports securely.",
                  "ارفع تقاريرك الطبية واحفظها بأمان."
                )}
              </h1>

              <p className="ohLead">
                {text(
  "Choose your reports, save them securely, then continue directly to analysis. Your saved reports remain available anytime in Reports Library.",
  "اختر تقاريرك واحفظها بأمان، ثم تابع مباشرة إلى التحليل. تبقى تقاريرك المحفوظة متاحة في أي وقت داخل مكتبة التقارير."
)}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
  <a href="#medical-upload-panel" className="primaryBtn">
    {text("Choose Reports", "اختيار التقارير")}
  </a>
</div>
            </div>
          </div>
        </section>

        <section
          className="uploadJourney"
          aria-label={text("Report upload journey", "رحلة رفع التقرير")}
        >
          {journeyItems.map((item) => {
            const isCompleted = item.number < journeyStep;
            const isCurrent = item.number === journeyStep;

            return (
              <article
                className={`uploadJourneyItem ${
                  isCompleted ? "completed" : isCurrent ? "current" : "upcoming"
                }`}
                key={item.number}
              >
                <span className="uploadJourneyNumber" aria-hidden="true">
                  {isCompleted ? "✓" : item.number}
                </span>

                <div>
                  <strong className="uploadJourneyTitle">{item.title}</strong>
                  <p className="uploadJourneyDescription">{item.description}</p>
                  <span className="uploadJourneyState">
                    {isCompleted
                      ? text("Completed", "مكتمل")
                      : isCurrent
                      ? text("Current step", "الخطوة الحالية")
                      : text("Upcoming", "لاحقًا")}
                  </span>
                </div>
              </article>
            );
          })}
        </section>

        {uploadStep === "saved" && (
          <section className="savedReceipt" aria-live="polite">
            <p className="ohMetricLabel">
              {text("Upload completed", "اكتمل الرفع")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Your reports are saved in Reports Library.",
                "تم حفظ تقاريرك في مكتبة التقارير."
              )}
            </h2>

            <p className="ohCardText">{message}</p>

            {savedFileNames.length > 0 && (
              <ul className="savedFileList">
                {savedFileNames.map((fileName) => (
                  <li key={fileName}>{fileName}</li>
                ))}
              </ul>
            )}

           <div className="savedReceiptActions">
  {latestUploadedReportId && (
    <Link
      href={`/intelligence?reportId=${latestUploadedReportId}&auto=1`}
      className="primaryBtn savedPrimaryAction"
    >
      {text(
        "Analyze Latest Report",
        "تحليل آخر تقرير"
      )}
    </Link>
  )}

  <Link href="/reports" className="secondaryBtn">
    {text("Open Reports Library", "فتح مكتبة التقارير")}
  </Link>

  <button
    type="button"
    className="savedTertiaryAction"
    onClick={resetUpload}
  >
    {text("Upload More Reports", "رفع تقارير أخرى")}
  </button>
</div>
          </section>
        )}

        {uploadStep !== "saved" && (
          <section className="uploadWorkspace" id="medical-upload-panel">
          <article className="uploadCard">
            <div className="uploadCardHeader">
              <p className="ohMetricLabel">
                {text("Upload reports", "رفع التقارير")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Choose files and save them to your account.",
                  "اختر الملفات واحفظها في حسابك."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  `PDF, PNG, JPG, and JPEG are supported. Maximum ${MAX_FILES} files per upload and ${MAX_FILE_SIZE_MB} MB per file.`,
                  `الملفات المدعومة PDF وPNG وJPG وJPEG. الحد الأقصى ${MAX_FILES} ملفات في كل عملية و${MAX_FILE_SIZE_MB} MB لكل ملف.`
                )}
              </p>
            </div>

            <div className="ohStack">
              <div className="formGroup">
                <label htmlFor="report-type">
                  {text("Report Type", "نوع التقرير")}
                </label>

                <select
                  id="report-type"
                  value={reportType}
                  onChange={(event) =>
                    setReportType(event.target.value as ReportType)
                  }
                  disabled={uploading}
                >
                  <option value="lab">{text("Laboratory", "مختبر")}</option>
                  <option value="radiology">
                    {text("Radiology", "أشعة")}
                  </option>
                  <option value="clinical">
                    {text("Clinical Summary", "تقرير سريري")}
                  </option>
                  <option value="prescription">
                    {text("Prescription", "وصفة طبية")}
                  </option>
                  <option value="medical">
                    {text("General Medical", "تقرير طبي عام")}
                  </option>
                </select>
              </div>

              <label
                className="uploadDropzone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={handleFileInput}
                  disabled={uploading}
                  style={{ display: "none" }}
                />

                <span className="uploadDropzoneIcon">PDF</span>

                <strong>
                  {selectedFiles.length > 0
                    ? text(
                        `${selectedFiles.length} file(s) selected`,
                        `تم اختيار ${selectedFiles.length} ملف`
                      )
                    : latestUploadedFileName
                    ? latestUploadedFileName
                    : text(
                        "Drop reports here or click to choose",
                        "اسحب التقارير هنا أو اضغط للاختيار"
                      )}
                </strong>

                <span className="ohCardText">
                  {selectedFiles.length > 0
                    ? selectedFiles.map((file) => file.name).join(", ")
                    : text(
                        "Files are not saved until you press Save Reports.",
                        "لن يتم حفظ الملفات حتى تضغط حفظ التقارير."
                      )}
                </span>
              </label>

              {selectedFiles.length > 0 && (
                <div className="uploadFileList">
                  {selectedFiles.map((file) => (
                    <div
                      className="uploadFileRow"
                      key={getSelectedFileKey(file)}
                    >
                      <div>
                        <strong>{file.name}</strong>
                        <span>
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>

                      <button
                        type="button"
                        className="secondaryBtn"
                        onClick={() => removeSelectedFile(file)}
                        disabled={uploading}
                        aria-label={text(
                          `Remove ${file.name}`,
                          `إزالة ${file.name}`
                        )}
                      >
                        {text("Remove", "إزالة")}
                      </button>
                    </div>
                  ))}
                </div>
              )}

             <div className="ohButtonRow">
  <button
    type="button"
    className="primaryBtn"
    onClick={uploadFiles}
    disabled={uploading || selectedFiles.length === 0}
  >
    {uploading
      ? text("Saving Reports...", "جاري حفظ التقارير...")
      : text("Save Reports", "حفظ التقارير")}
  </button>
</div>

              {message && (
                <div
                  className={`uploadNotice ${
                    uploadStep === "error" ? "error" : ""
                  }`}
                  role={uploadStep === "error" ? "alert" : "status"}
                >
                  <span aria-hidden="true">
                    {uploadStep === "error" ? "⚠️" : "ℹ️"}
                  </span>

                  <div>
                    <strong>
                      {uploadStep === "error"
                        ? text("Upload notice", "تنبيه الرفع")
                        : text("Upload information", "معلومات الرفع")}
                    </strong>
                    <br />
                    {message}
                  </div>
                </div>
              )}
            </div>
          </article>

          <aside className="supportedCard">
            <p className="ohMetricLabel">
              {text("Supported documents", "المستندات المدعومة")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Medical documents you can save.",
                "المستندات الطبية التي يمكنك حفظها."
              )}
            </h2>

            <div className="supportedList">
              {[
                {
                  title: text("Laboratory results", "نتائج المختبر"),
                  description: text(
                    "CBC, lipids, kidney, liver, glucose, and hormones.",
                    "CBC، الدهون، الكلى، الكبد، السكر، والهرمونات."
                  ),
                },
                {
                  title: text("Radiology reports", "تقارير الأشعة"),
                  description: text(
                    "Written X-ray, ultrasound, CT, and MRI reports.",
                    "تقارير الأشعة السينية، السونار، CT، وMRI المكتوبة."
                  ),
                },
                {
                  title: text("Clinical summaries", "الملخصات السريرية"),
                  description: text(
                    "Discharge summaries, visit notes, and referrals.",
                    "ملخصات الخروج، ملاحظات الزيارة، والتحويلات."
                  ),
                },
                {
                  title: text("Prescriptions", "الوصفات الطبية"),
                  description: text(
                    "Medication lists and treatment plans.",
                    "قوائم الأدوية وخطط العلاج."
                  ),
                },
              ].map((item) => (
                <div className="supportedItem" key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </aside>
          </section>
        )}

        <section className="ohTrustNotice">
          <span aria-hidden="true">🛡️</span>

          <div>
            <strong>
              {text(
                "Privacy and medical safety reminder",
                "تذكير الخصوصية والسلامة الطبية"
              )}
            </strong>
            <br />
            {text(
              "Uploaded reports are used to organize your health information and prepare educational summaries. OrganHeal does not replace diagnosis, treatment, emergency care, or a licensed clinician.",
              "تُستخدم التقارير المرفوعة لتنظيم معلوماتك الصحية وتحضير ملخصات تعليمية. لا يستبدل OrganHeal التشخيص أو العلاج أو الرعاية الطارئة أو الطبيب المختص."
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageBackActions from "../components/PageBackActions";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";
type UploadStep = "idle" | "uploading" | "saved" | "extracting" | "error";
type ReportFilter = "all" | "pending" | "processing" | "completed" | "failed";
type ReportType = "lab" | "radiology" | "clinical" | "prescription" | "medical";

type UploadedFile = {
  id: number;
  file_name: string;
  file_path: string;
  file_url: string | null;
  created_at: string;
  analysis_status: string | null;
  extracted_text: string | null;
  ai_summary: string | null;
  extraction_status: string | null;
  extracted_at: string | null;
  report_type?: string | null;
};

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 20;

export default function LabUploadPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [latestUploadedFileName, setLatestUploadedFileName] = useState("");
  const [latestUploadedReportId, setLatestUploadedReportId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [uploading, setUploading] = useState(false);
  const [extractingReportId, setExtractingReportId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [reportFilter, setReportFilter] = useState<ReportFilter>("all");
  const [reportType, setReportType] = useState<ReportType>("lab");

  useEffect(() => {
    function syncLanguage() {
      const savedLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    fetchUploadedFiles();
    loadPendingHeroFile();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          ? `تم اختيار الملف "${uploadedFileName}" من الصفحة الرئيسية. ارفعه هنا لحفظه بأمان والمتابعة إلى الاستخراج أو التحليل الصحي.`
          : `Your file "${uploadedFileName}" was selected from the homepage. Upload it here to save it securely and continue to extraction or intelligence review.`
      );
      sessionStorage.removeItem("organheal-latest-uploaded-lab-file");
      return;
    }

    const savedFileName = sessionStorage.getItem("organheal-pending-lab-file");

    if (savedFileName) {
      setLatestUploadedFileName(savedFileName);
      setMessage(
        currentIsArabic
          ? `تم اختيار "${savedFileName}" من الصفحة الرئيسية. يرجى رفعه هنا للمتابعة.`
          : `You selected "${savedFileName}" from the homepage. Please upload it here to continue.`
      );
      sessionStorage.removeItem("organheal-pending-lab-file");
    }
  }

  function getReportAnalysisHref(reportId?: number | null) {
    return reportId ? `/intelligence?reportId=${reportId}&auto=1` : "/intelligence";
  }

  async function fetchUploadedFiles() {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setUploadedFiles([]);
      return;
    }

    const { data, error } = await supabase
      .from("uploaded_lab_files")
      .select(
        "id, file_name, file_path, file_url, created_at, analysis_status, extracted_text, ai_summary, extraction_status, extracted_at, report_type"
      )
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Database error: " + error.message);
      return;
    }

    const loadedFiles = (data || []) as UploadedFile[];

    setUploadedFiles(loadedFiles);

    const newestFile = loadedFiles[0] || null;

    setLatestUploadedFileName(newestFile?.file_name || "");
    setLatestUploadedReportId(newestFile?.id || null);

    const params = new URLSearchParams(window.location.search);
    const wasUploadedFromHomepage = params.get("uploaded") === "1";

    if (wasUploadedFromHomepage && data && data.length > 0) {
      setLatestUploadedFileName(data[0].file_name);
      setLatestUploadedReportId(data[0].id);
      setMessage(
        `Your file "${data[0].file_name}" is saved. You can prepare the report, open the report, or continue to Analyze Report.`
      );
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

    if (rejectedFiles.length > 0) {
      setMessage(
        text(
          `Some files were not added: ${rejectedFiles.join(", ")}. Supported files: PDF, PNG, JPG, JPEG.`,
          `لم تتم إضافة بعض الملفات: ${rejectedFiles.join(", ")}. الملفات المدعومة: PDF, PNG, JPG, JPEG.`
        )
      );
      setUploadStep("error");
    } else if (combinedFiles.length > 0) {
      setMessage("");
      setUploadStep("idle");
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    addFiles(files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files || []));
  }

  function getSelectedFileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  function removeSelectedFile(fileToRemove: File) {
    if (uploading) {
      return;
    }

    setSelectedFiles((current) =>
      current.filter(
        (file) =>
          getSelectedFileKey(file) !==
          getSelectedFileKey(fileToRemove)
      )
    );

    setMessage("");
    setUploadStep("idle");
  }

  async function uploadFile(analyzeAfterSave = false) {
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

    const filesToUpload = [...selectedFiles];
    const shouldAnalyzeSingleReport =
      analyzeAfterSave && filesToUpload.length === 1;

    setUploading(true);
    setUploadStep("uploading");
    setMessage("");

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
    let uploadedCount = 0;
    let lastUploadedReportId: number | null = null;

    for (const file of filesToUpload) {
      const safeName = getSafeStorageFileName(file.name);
      const filePath = `${user.id}/${Date.now()}-${safeName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("lab-reports")
        .upload(filePath, file, {
          upsert: false,
        });

      if (uploadError) {
        setMessage("Upload error: " + uploadError.message);
        setUploading(false);
        setUploadStep("error");
        return;
      }

      if (!uploadData?.path) {
        setMessage("Upload error: Supabase did not return a saved file path.");
        setUploading(false);
        setUploadStep("error");
        return;
      }

      const savedFilePath = uploadData.path;

      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from("lab-reports")
          .createSignedUrl(savedFilePath, 60 * 60);

      if (signedUrlError) {
        setMessage("Signed URL error: " + signedUrlError.message);
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
            "Medical report uploaded successfully. Text extraction and health analysis review are available from OrganHeal.",
          extraction_status: "Pending",
          extracted_text: null,
          extracted_at: null,
        })
        .select("id")
        .single();

      if (databaseError) {
        setMessage("Database error: " + databaseError.message);
        setUploading(false);
        setUploadStep("error");
        return;
      }

      if (!insertedFile) {
        await supabase.storage
          .from("lab-reports")
          .remove([savedFilePath]);

        setMessage(
          text(
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
              "Report uploaded successfully and ready for extraction and intelligence review.",
            key_findings: "Pending extraction.",
            risk_signals: "Pending extraction.",
            recommendations:
              "Analyze this report to generate a patient-friendly summary and doctor-ready brief.",
            doctor_brief: "Pending intelligence generation.",
            next_best_action:
              "Analyze this report to generate structured report intelligence.",
          },
        ]);

      if (insightError) {
        await supabase
          .from("uploaded_lab_files")
          .delete()
          .eq("id", insertedFile.id)
          .eq("user_id", user.id);

        await supabase.storage
          .from("lab-reports")
          .remove([savedFilePath]);

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

      uploadedCount++;
      lastUploadedReportId = insertedFile.id;
      setLatestUploadedFileName(file.name);
      setLatestUploadedReportId(insertedFile.id);
    }

    setSelectedFiles([]);
    setUploading(false);
    setUploadStep("saved");

    if (analyzeAfterSave && filesToUpload.length > 1) {
      setMessage(
        text(
          `${uploadedCount} reports were saved successfully. Choose the report you want to analyze from the list below.`,
          `تم حفظ ${uploadedCount} تقارير بنجاح. اختر التقرير الذي تريد تحليله من القائمة أدناه.`
        )
      );
    } else {
      setMessage(
        text(
          `${uploadedCount} report(s) uploaded successfully.`,
          `تم رفع ${uploadedCount} تقرير بنجاح.`
        )
      );
    }

    await fetchUploadedFiles();

    if (shouldAnalyzeSingleReport && lastUploadedReportId !== null) {
      window.location.assign(
        getReportAnalysisHref(lastUploadedReportId)
      );
    }
  }

  async function runExtraction(file: UploadedFile) {
    setExtractingReportId(file.id);
    setUploadStep("extracting");
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setMessage(
        text(
          "Session expired. Please login again.",
          "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى."
        )
      );
      setExtractingReportId(null);
      setUploadStep("error");
      return;
    }

    const response = await fetch("/api/extract-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        reportId: file.id,
        filePath: file.file_path,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result?.success) {
      setMessage(result?.error || "Extraction failed. Please try again.");
      setExtractingReportId(null);
      setUploadStep("error");
      await fetchUploadedFiles();
      return;
    }

    setMessage(
      text(
        "Report text extracted successfully. You can now analyze this report.",
        "تم استخراج نص التقرير بنجاح. يمكنك الآن تحليل هذا التقرير."
      )
    );
    setExtractingReportId(null);
    setUploadStep("saved");
    await fetchUploadedFiles();
  }

  async function deleteFile(file: UploadedFile) {
    const confirmDelete = window.confirm(
      text(
        `Delete "${file.file_name}" permanently?`,
        `هل تريد حذف "${file.file_name}" نهائيًا؟`
      )
    );

    if (!confirmDelete) return;

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage(
        text(
          "Please login again before deleting this report.",
          "يرجى تسجيل الدخول مرة أخرى قبل حذف هذا التقرير."
        )
      );
      setUploadStep("error");
      return;
    }

    const user = userData.user;

    const { error: storageError } = await supabase.storage
      .from("lab-reports")
      .remove([file.file_path]);

    if (storageError) {
      setMessage(
        "Storage delete error: " +
          storageError.message
      );
      setUploadStep("error");
      return;
    }

    const { error: insightDeleteError } = await supabase
      .from("health_insights")
      .delete()
      .eq("report_id", file.id)
      .eq("user_id", user.id);

    if (insightDeleteError) {
      setMessage(
        "Insight delete error: " +
          insightDeleteError.message
      );
      setUploadStep("error");
      return;
    }

    const { error: databaseError } = await supabase
      .from("uploaded_lab_files")
      .delete()
      .eq("id", file.id)
      .eq("user_id", user.id);

    if (databaseError) {
      setMessage(
        "Database delete error: " +
          databaseError.message
      );
      setUploadStep("error");
      return;
    }

    setMessage(
      text(
        `"${file.file_name}" deleted successfully.`,
        `تم حذف "${file.file_name}" بنجاح.`
      )
    );

    setUploadStep("saved");
    await fetchUploadedFiles();
  }

  async function openFile(filePath: string) {
    const { data, error } = await supabase.storage
      .from("lab-reports")
      .createSignedUrl(filePath, 60 * 60);

    if (error) {
      setMessage("File open error: " + error.message);
      setUploadStep("error");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  function getExtractionLabel(status: string | null) {
    const cleanStatus = status || "Pending";

    if (isArabic) {
      if (cleanStatus === "Completed") return "مكتمل";
      if (cleanStatus === "Processing") return "جاري الاستخراج";
      if (cleanStatus === "Failed") return "فشل";
      return "بانتظار";
    }

    if (cleanStatus === "Completed") return "Completed";
    if (cleanStatus === "Processing") return "Processing";
    if (cleanStatus === "Failed") return "Failed";
    return "Pending";
  }

  function getExtractionTone(status: string | null) {
    const cleanStatus = status || "Pending";

    if (cleanStatus === "Completed") return "good";
    if (cleanStatus === "Processing") return "moderate";
    if (cleanStatus === "Failed") return "risk";
    return "neutral";
  }

  function getReportTypeLabel(type: string | null | undefined) {
    if (isArabic) {
      if (type === "lab") return "مختبر";
      if (type === "radiology") return "أشعة";
      if (type === "clinical") return "تقرير سريري";
      if (type === "prescription") return "وصفة طبية";
      return "تقرير طبي";
    }

    if (type === "lab") return "Laboratory";
    if (type === "radiology") return "Radiology";
    if (type === "clinical") return "Clinical Summary";
    if (type === "prescription") return "Prescription";
    return "Medical Report";
  }

  function formatDate(value: string | null) {
    if (!value) return text("Not available", "غير متاح");

    return new Date(value).toLocaleString(isArabic ? "ar-AE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const filteredFiles = uploadedFiles.filter((file) => {
    const matchesSearch = file.file_name
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());

    const cleanStatus = (file.extraction_status || "Pending").toLowerCase();

    const matchesFilter =
      reportFilter === "all" || cleanStatus === reportFilter;

    return matchesSearch && matchesFilter;
  });

  const latestFiles = filteredFiles.slice(0, 8);

  const focusedUploadFile = latestFiles[0] || null;

  const compactUploadFiles = focusedUploadFile
    ? latestFiles.filter((file) => file.id !== focusedUploadFile.id)
    : [];

  const stats = useMemo(() => {
    const completed = uploadedFiles.filter(
      (file) => file.extraction_status === "Completed"
    ).length;

    const processing = uploadedFiles.filter(
      (file) => file.extraction_status === "Processing"
    ).length;

    const failed = uploadedFiles.filter(
      (file) => file.extraction_status === "Failed"
    ).length;

    const pending = uploadedFiles.filter(
      (file) =>
        !file.extraction_status || file.extraction_status === "Pending"
    ).length;

    return {
      total: uploadedFiles.length,
      completed,
      processing,
      pending,
      failed,
    };
  }, [uploadedFiles]);

  const canShowNextStep =
    uploadStep === "saved" || uploadedFiles.length > 0 || latestUploadedFileName;

  return (
    <main className="ohPageShell labUploadFocusPage labUploadFinalV3" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .labUploadFocusPage,
        .labUploadFocusPage * {
          box-sizing: border-box;
        }

        .labUploadFocusPage a {
          color: inherit;
          text-decoration: none;
        }

        .labUploadFocusPage .ohCard,
        .labUploadFocusPage .ohMetricCard {
          border-color: rgba(15, 23, 42, 0.11);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.07);
        }

        .labUploadFocusPage .primaryBtn {
          background: linear-gradient(135deg, #0f766e, #14b8a6);
          color: white;
          border: 0;
          box-shadow: 0 14px 34px rgba(20, 184, 166, 0.28);
        }

        .labUploadFocusPage .secondaryBtn {
          background: white;
          color: #0f766e;
          border: 1px solid rgba(15, 118, 110, 0.24);
        }

        .labUploadFocusPage input,
        .labUploadFocusPage select {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid rgba(15, 23, 42, 0.18);
          font-weight: 800;
        }

        .latestUploadFocus {
          overflow: hidden;
          border-top: 6px solid #0f766e;
          background:
            radial-gradient(circle at 88% 8%, rgba(20, 184, 166, 0.14), transparent 30%),
            #ffffff;
        }

        .uploadFocusGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 0.48fr);
          gap: 20px;
          align-items: stretch;
        }

        .uploadFocusPanel {
          border-radius: 24px;
          padding: 20px;
          background: linear-gradient(135deg, #0f172a, #115e59);
          color: white;
          min-height: 100%;
        }

        .uploadFocusPanel .ohMetricLabel,
        .uploadFocusPanel .ohCardText {
          color: rgba(226, 232, 240, 0.86);
        }

        .uploadFocusPanel .ohCardTitle {
          color: white;
        }

        .uploadStatusLine {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-top: 14px;
        }

        .uploadPill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 8px 11px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #f8fafc;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 900;
          line-height: 1;
          white-space: nowrap;
        }

        .uploadPill.good {
          background: rgba(16, 185, 129, 0.11);
          color: #047857;
          border-color: rgba(16, 185, 129, 0.24);
        }

        .uploadPill.moderate {
          background: rgba(245, 158, 11, 0.13);
          color: #b45309;
          border-color: rgba(245, 158, 11, 0.28);
        }

        .uploadPill.risk {
          background: rgba(239, 68, 68, 0.1);
          color: #b91c1c;
          border-color: rgba(239, 68, 68, 0.22);
        }

        .compactUploadHistory {
          margin-top: 22px;
        }

        .compactUploadTable {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .compactUploadHeader,
        .compactUploadRow {
          display: grid;
          grid-template-columns: minmax(230px, 1.25fr) minmax(140px, 0.7fr) minmax(170px, 0.8fr) minmax(150px, 0.55fr);
          gap: 12px;
          align-items: center;
        }

        .compactUploadHeader {
          padding: 0 14px;
          color: var(--oh-muted);
          font-size: 0.74rem;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .compactUploadRow {
          padding: 14px;
          border-radius: 20px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: white;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
        }

        .compactUploadRow.completed {
          border-inline-start: 5px solid #10b981;
        }

        .compactUploadRow.pending {
          border-inline-start: 5px solid #f59e0b;
        }

        .compactUploadName {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .compactUploadName strong {
          color: var(--oh-text);
          font-size: 0.96rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .compactUploadName span {
          color: var(--oh-muted);
          font-size: 0.82rem;
          font-weight: 750;
        }

        .compactUploadActions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .compactUploadAction {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 13px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 0.82rem;
          border: 1px solid rgba(15, 118, 110, 0.18);
          cursor: pointer;
        }

        .compactUploadAction.primary {
          background: #0f766e;
          color: white;
          border-color: #0f766e;
        }

        .compactUploadAction.secondary {
          background: white;
          color: #0f766e;
        }

        @media (max-width: 980px) {
          .uploadFocusGrid,
          .compactUploadHeader,
          .compactUploadRow {
            grid-template-columns: 1fr;
          }

          .compactUploadHeader {
            display: none;
          }

          .compactUploadActions {
            justify-content: flex-start;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Medical Report Upload Command Center", "مركز رفع التقارير الطبية")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Upload your medical report and start health analysis",
                  "ارفع تقريرك الطبي وابدأ التحليل الصحي"
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "Upload lab reports, radiology reports, discharge summaries, prescriptions, or medical documents. After saving, analyze the report in one guided step.",
                  "ارفع تقارير المختبر، الأشعة، ملخصات الخروج، الوصفات، أو المستندات الطبية. بعد الحفظ حلّل التقرير بخطوة واضحة واحدة."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <a href="#medical-upload-panel" className="primaryBtn">
                  {text("Upload Report", "رفع تقرير")}
                </a>

                <Link href="/reports" className="secondaryBtn">
                  {text("Reports Library", "مكتبة التقارير")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Next Best Step", "الخطوة التالية الأفضل")}
                  </p>
                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {stats.total === 0
                      ? text("Upload your first report", "ارفع أول تقرير")
                      : text("Analyze latest report", "حلّل آخر تقرير")}
                  </h2>
                </div>

                <span className="ohStatusBadge neutral">
                  {stats.total} {text("saved", "محفوظ")}
                </span>
              </div>

              <p className="ohCardText">
                {stats.total === 0
                  ? text(
                      "After upload, the report will appear in Reports Library. Use Analyze Report to generate results.",
                      "بعد الرفع، سيظهر التقرير في مكتبة التقارير وتحليل التقرير."
                    )
                  : text(
                      "You have saved reports. The next step is to generate or review health analysis.",
                      "لديك تقارير محفوظة. الخطوة التالية هي توليد أو مراجعة التحليل الصحي."
                    )}
              </p>

              <div className="ohDivider" />

              <Link
                href={
                  stats.total === 0
                    ? "#medical-upload-panel"
                    : latestUploadedReportId
                    ? getReportAnalysisHref(latestUploadedReportId)
                    : "/intelligence"
                }
                className="primaryBtn"
              >
                {stats.total === 0
                  ? text("Upload Report", "رفع تقرير")
                  : text("Analyze Report", "تحليل التقرير")}
              </Link>
            </div>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Total Reports", "كل التقارير")}
            </span>
            <span className="ohMetricValue">{stats.total}</span>
            <span className="ohMetricHint">
              {text("Saved in your account", "محفوظة في حسابك")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Extraction Completed", "استخراج مكتمل")}
            </span>
            <span className="ohMetricValue">{stats.completed}</span>
            <span className="ohMetricHint">
              {text("Ready for analysis", "جاهزة للتحليل")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Pending / Processing", "بانتظار / جاري")}
            </span>
            <span className="ohMetricValue">{stats.pending + stats.processing}</span>
            <span className="ohMetricHint">
              {text("Need analysis or review", "تحتاج تحليلًا أو مراجعة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Failed", "فشل")}
            </span>
            <span className="ohMetricValue">{stats.failed}</span>
            <span className="ohMetricHint">
              {text("Can be retried", "يمكن إعادة المحاولة")}
            </span>
          </article>
        </section>

        <section className="ohGrid cols2" id="medical-upload-panel">
          <article className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Upload File", "رفع ملف")}
                </p>

                <h2 className="ohCardTitle">
                  {text(
                    "Drop your report or choose it from your device",
                    "اسحب التقرير أو اختره من جهازك"
                  )}
                </h2>

                <p className="ohCardText">
                  {text(
                    `Supports PDF, PNG, JPG, and JPEG. You can upload up to ${MAX_FILES} files at a time. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`,
                    `يدعم PDF و PNG و JPG و JPEG. يمكنك رفع حتى ${MAX_FILES} ملفات في كل مرة. الحد الأقصى لحجم الملف ${MAX_FILE_SIZE_MB} MB.`
                  )}
                </p>
              </div>

              <span className={`ohStatusBadge ${uploadStep === "error" ? "risk" : "neutral"}`}>
                {uploadStep === "uploading"
                  ? text("Uploading", "جاري الرفع")
                  : uploadStep === "extracting"
                  ? text("Extracting", "جاري الاستخراج")
                  : uploadStep === "saved"
                  ? text("Saved", "محفوظ")
                  : uploadStep === "error"
                  ? text("Needs Attention", "يحتاج انتباه")
                  : text("Ready", "جاهز")}
              </span>
            </div>

            <div className="ohStack">
              <div className="formGroup">
                <label>{text("Report Type", "نوع التقرير")}</label>
                <select
                  value={reportType}
                  onChange={(event) => setReportType(event.target.value as ReportType)}
                >
                  <option value="lab">{text("Laboratory", "مختبر")}</option>
                  <option value="radiology">{text("Radiology", "أشعة")}</option>
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
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                style={{
                  display: "grid",
                  placeItems: "center",
                  gap: "12px",
                  minHeight: "240px",
                  border: "2px dashed var(--oh-border-strong)",
                  borderRadius: "24px",
                  background:
                    "linear-gradient(180deg, rgba(15,118,110,0.06), rgba(37,99,235,0.04))",
                  cursor: "pointer",
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={handleFileInput}
                  style={{ display: "none" }}
                />

                <span
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "22px",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--oh-primary-soft)",
                    color: "var(--oh-primary-dark)",
                    fontWeight: 900,
                    border: "1px solid rgba(15, 118, 110, 0.16)",
                  }}
                >
                  PDF
                </span>

                <strong>
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`
                    : latestUploadedFileName
                    ? latestUploadedFileName
                    : text(
                        "Drop up to 10 files or click to upload",
                        "اسحب حتى 10 ملفات أو اضغط للاختيار"
                      )}
                </strong>

                <span className="ohCardText">
                  {selectedFiles.length > 0
                    ? selectedFiles.map((file) => file.name).join(", ")
                    : text("PDF, PNG, JPG, JPEG supported", "يدعم PDF, PNG, JPG, JPEG")}
                </span>
              </label>

              {selectedFiles.length > 0 && (
                <div className="ohTimeline">
                  {selectedFiles.map((file) => (
                    <div
                      className="ohTimelineItem"
                      key={getSelectedFileKey(file)}
                    >
                      <span className="ohTimelineDot" />

                      <div>
                        <p className="ohTimelineTitle">{file.name}</p>
                        <p className="ohTimelineMeta">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
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
                {selectedFiles.length > 0 ? (
                  <button
                    type="button"
                    className="primaryBtn"
                    onClick={() =>
                      uploadFile(selectedFiles.length === 1)
                    }
                    disabled={uploading}
                  >
                    {uploading
                      ? selectedFiles.length === 1
                        ? text(
                            "Saving and preparing...",
                            "جاري الحفظ والتجهيز..."
                          )
                        : text(
                            "Saving reports...",
                            "جاري حفظ التقارير..."
                          )
                      : selectedFiles.length === 1
                      ? text(
                          "Save & Analyze",
                          "حفظ وتحليل"
                        )
                      : text(
                          "Save Reports",
                          "حفظ التقارير"
                        )}
                  </button>
                ) : latestUploadedReportId ? (
                  <Link
                    href={getReportAnalysisHref(
                      latestUploadedReportId
                    )}
                    className="primaryBtn"
                  >
                    {text(
                      "Analyze Last Saved Report",
                      "تحليل آخر تقرير محفوظ"
                    )}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="secondaryBtn"
                    disabled
                  >
                    {text(
                      "Select a Report",
                      "اختر تقريرًا"
                    )}
                  </button>
                )}

                <Link
                  href="/reports"
                  className="secondaryBtn"
                >
                  {text(
                    "Reports Library",
                    "مكتبة التقارير"
                  )}
                </Link>
              </div>

              {message && (
                <div className="ohTrustNotice">
                  <span aria-hidden="true">
                    {uploadStep === "error" ? "⚠️" : "ℹ️"}
                  </span>
                  <div>
                    <strong>
                      {uploadStep === "error"
                        ? text("Upload notice", "تنبيه الرفع")
                        : text("Upload status", "حالة الرفع")}
                    </strong>
                    <br />
                    {message}

                    {canShowNextStep && (
                      <div className="ohButtonRow" style={{ marginTop: "14px" }}>
                        <Link
                          href={getReportAnalysisHref(latestUploadedReportId)}
                          className="primaryBtn"
                        >
                          {text("Analyze This Report", "تحليل هذا التقرير")}
                        </Link>

                        <Link href="/reports" className="secondaryBtn">
                          {text("Reports Library", "مكتبة التقارير")}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </article>

          <article className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("What can you upload?", "ماذا يمكنك رفعه؟")}
                </p>

                <h2 className="ohCardTitle">
                  {text("Supported medical documents", "المستندات الطبية المدعومة")}
                </h2>
              </div>

              <span className="ohStatusBadge neutral">
                PDF / Image
              </span>
            </div>

            <div className="ohTimeline">
              {[
                {
                  title: text("Laboratory results", "نتائج المختبر"),
                  meta: text("CBC, lipids, kidney, liver, glucose, hormones.", "CBC، الدهون، الكلى، الكبد، السكر، الهرمونات."),
                },
                {
                  title: text("Radiology reports", "تقارير الأشعة"),
                  meta: text("X-ray, ultrasound, CT, MRI written reports.", "الأشعة السينية، السونار، CT، MRI المكتوبة."),
                },
                {
                  title: text("Clinical summaries", "الملخصات السريرية"),
                  meta: text("Discharge summaries, visit notes, referrals.", "ملخصات الخروج، ملاحظات الزيارة، التحويلات."),
                },
                {
                  title: text("Prescriptions", "الوصفات الطبية"),
                  meta: text("Medication lists and treatment plans.", "قوائم الأدوية وخطط العلاج."),
                },
              ].map((item) => (
                <div className="ohTimelineItem" key={item.title}>
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">{item.title}</p>
                    <p className="ohTimelineMeta">{item.meta}</p>
                  </div>
                  <span className="ohStatusBadge good">
                    {text("OK", "مناسب")}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>        <section className="ohCard latestUploadFocus">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Latest uploaded report", "آخر تقرير مرفوع")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Analyze the newest report first.",
                  "حلّل أحدث تقرير أولًا."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "The latest report appears here as the main action. Older uploads stay compact below.",
                  "يظهر أحدث تقرير هنا كإجراء رئيسي. أما التقارير السابقة فتبقى مختصرة بالأسفل."
                )}
              </p>
            </div>

            <span className="ohStatusBadge neutral">
              {filteredFiles.length} {text("shown", "ظاهر")}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(180px, 260px)",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <input
              type="text"
              placeholder={text("Search by file name", "ابحث باسم الملف")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <select
              value={reportFilter}
              onChange={(event) => setReportFilter(event.target.value as ReportFilter)}
            >
              <option value="all">{text("All", "الكل")}</option>
              <option value="pending">{text("Pending", "بانتظار")}</option>
              <option value="processing">{text("Processing", "قيد المعالجة")}</option>
              <option value="completed">{text("Completed", "مكتمل")}</option>
              <option value="failed">{text("Failed", "فشل")}</option>
            </select>
          </div>

          {uploadedFiles.length === 0 ? (
            <div className="ohEmptyState">
              <h2>{text("No saved reports yet", "لا توجد تقارير محفوظة بعد")}</h2>
              <p>
                {text(
                  "Upload your first medical report so it appears here.",
                  "ارفع أول تقرير طبي حتى يظهر هنا."
                )}
              </p>
            </div>
          ) : latestFiles.length === 0 ? (
            <div className="ohEmptyState">
              <h2>{text("No matching results", "لا توجد نتائج مطابقة")}</h2>
              <p>
                {text(
                  "Change the search term or current filter.",
                  "غيّر البحث أو الفلتر الحالي."
                )}
              </p>
            </div>
          ) : focusedUploadFile ? (
            <>
              <div className="uploadFocusGrid">
                <div>
                  <p className="ohMetricLabel">
                    {getReportTypeLabel(focusedUploadFile.report_type)}
                  </p>

                  <h3 className="ohCardTitle" style={{ fontSize: "1.55rem" }}>
                    {focusedUploadFile.file_name}
                  </h3>

                  <p className="ohCardText">
                    {focusedUploadFile.extraction_status === "Completed"
                      ? text(
                          "Text is ready. Analyze this report to generate the patient and doctor-ready summaries.",
                          "النص جاهز. حلّل هذا التقرير لتوليد ملخص المريض والملخص الجاهز للطبيب."
                        )
                      : text(
                          "This report is saved. Analyze it now; extraction will run internally when needed.",
                          "هذا التقرير محفوظ. حلّله الآن؛ سيتم تجهيز التقرير داخليًا عند الحاجة."
                        )}
                  </p>

                  <div className="uploadStatusLine">
                    <span className="uploadPill">
                      {text("Uploaded", "تم الرفع")}: {formatDate(focusedUploadFile.created_at)}
                    </span>

                    <span className={`uploadPill ${getExtractionTone(focusedUploadFile.extraction_status)}`}>
                      {text("Status", "الحالة")}: {getExtractionLabel(focusedUploadFile.extraction_status)}
                    </span>

                    <span className={`uploadPill ${
                      focusedUploadFile.extraction_status === "Failed" ? "risk" : "moderate"
                    }`}>
                      {text("Next", "التالي")}: {text("Analyze report", "تحليل التقرير")}
                    </span>
                  </div>

                  <div className="ohButtonRow" style={{ marginTop: "20px" }}>
                    <Link
                      href={getReportAnalysisHref(focusedUploadFile.id)}
                      className="primaryBtn"
                    >
                      {text("Analyze This Report", "تحليل هذا التقرير")}
                    </Link>


                    <button
                      type="button"
                      className="secondaryBtn"
                      onClick={() => openFile(focusedUploadFile.file_path)}
                    >
                      {text("Open File", "فتح الملف")}
                    </button>

                    <button
                      type="button"
                      className="secondaryBtn"
                      onClick={() => deleteFile(focusedUploadFile)}
                      aria-label={text(
                        `Delete ${focusedUploadFile.file_name}`,
                        `حذف ${focusedUploadFile.file_name}`
                      )}
                      style={{
                        color: "#b91c1c",
                        borderColor: "rgba(185, 28, 28, 0.32)",
                      }}
                    >
                      {text("Delete Report", "حذف التقرير")}
                    </button>

                    <Link href="/reports" className="secondaryBtn">
                      {text("Reports Library", "مكتبة التقارير")}
                    </Link>
                  </div>
                </div>


              </div>

              <div className="compactUploadHistory">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text("Previous uploads", "الرفعات السابقة")}
                    </p>

                    <h3 className="ohCardTitle">
                      {text("Compact upload history", "سجل رفع مختصر")}
                    </h3>
                  </div>

                  <span className="ohStatusBadge neutral">
                    {compactUploadFiles.length}
                  </span>
                </div>

                {compactUploadFiles.length === 0 ? (
                  <div className="ohEmptyState">
                    <h2>{text("No older uploads", "لا توجد رفعات سابقة")}</h2>
                    <p>{text("The latest report is shown above.", "آخر تقرير ظاهر بالأعلى.")}</p>
                  </div>
                ) : (
                  <div className="compactUploadTable">
                    <div className="compactUploadHeader">
                      <span>{text("Report", "التقرير")}</span>
                      <span>{text("Status", "الحالة")}</span>
                      <span>{text("Uploaded", "تاريخ الرفع")}</span>
                      <span>{text("Action", "الإجراء")}</span>
                    </div>

                    {compactUploadFiles.map((file) => (
                      <article
                        className={`compactUploadRow ${
                          file.extraction_status === "Completed" ? "completed" : "pending"
                        }`}
                        key={file.id}
                      >
                        <div className="compactUploadName">
                          <strong>{file.file_name}</strong>
                          <span>{getReportTypeLabel(file.report_type)}</span>
                        </div>

                        <span className={`uploadPill ${getExtractionTone(file.extraction_status)}`}>
                          {getExtractionLabel(file.extraction_status)}
                        </span>

                        <span className="ohCardText">
                          {formatDate(file.created_at)}
                        </span>

                        <div className="compactUploadActions">
                          <Link
                            href={getReportAnalysisHref(file.id)}
                            className="compactUploadAction primary"
                          >
                            {text("Analyze", "تحليل")}
                          </Link>

                          <button
                            type="button"
                            className="compactUploadAction secondary"
                            onClick={() => openFile(file.file_path)}
                          >
                            {text("File", "الملف")}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </section>
<section className="ohTrustNotice">
          <span aria-hidden="true">🛡️</span>
          <div>
            <strong>
              {text("Privacy and medical safety reminder", "تذكير الخصوصية والسلامة الطبية")}
            </strong>
            <br />
            {text(
              "Uploaded reports are used to organize your health information and prepare educational summaries. OrganHeal does not replace diagnosis, treatment, emergency care, or a licensed clinician.",
              "تُستخدم التقارير المرفوعة لتنظيم معلوماتك الصحية وتحضير ملخصات تعليمية. لا يستبدل OrganHeal التشخيص أو العلاج أو الرعاية الطارئة أو الطبيب المختص."
            )}
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Recommended Path", "المسار المقترح")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "From upload to health analysis",
                  "من الرفع إلى التحليل الصحي"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Save the report, analyze it when ready, then continue to your follow-up plan.",
                  "احفظ التقرير، شغّل الاستخراج عند الحاجة، حلّل آخر تقرير، ثم انتقل إلى خطة المتابعة."
                )}
              </p>
            </div>
          </div>

          <div className="ohButtonRow">
            <Link href="/reports" className="secondaryBtn">
              {text("Reports", "التقارير")}
            </Link>

            <Link href={getReportAnalysisHref(latestUploadedReportId)} className="primaryBtn">
              {text("Analyze Report", "تحليل التقرير")}
            </Link>

            <Link href="/health-plan" className="secondaryBtn">
              {text("Health Plan", "الخطة")}
            </Link>

            <Link href="/dashboard" className="secondaryBtn">
              {text("Dashboard", "لوحة التحكم")}
            </Link>
          </div>
        </section>
      </div>
      <style>{`
        /* ORGANHEAL_LAB_UPLOAD_FINAL_V3 */

        .labUploadFinalV3 {
          min-height: 100vh !important;
          background:
            radial-gradient(circle at 12% 5%, rgba(6, 182, 212, 0.22), transparent 28%),
            radial-gradient(circle at 88% 18%, rgba(15, 118, 110, 0.26), transparent 34%),
            linear-gradient(180deg, #dbeafe 0%, #e2e8f0 45%, #f8fafc 100%) !important;
          color: #0f172a !important;
        }

        .labUploadFinalV3 .ohContainer {
          max-width: 1180px !important;
        }

        .labUploadFinalV3 .ohHero,
        .labUploadFinalV3 .ohContainer > section:first-of-type {
          background:
            radial-gradient(circle at 86% 10%, rgba(20, 184, 166, 0.42), transparent 36%),
            linear-gradient(135deg, #061826 0%, #0f172a 42%, #0f766e 100%) !important;
          color: #ffffff !important;
          border-radius: 34px !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          box-shadow: 0 34px 90px rgba(15, 23, 42, 0.34) !important;
          padding: 38px !important;
        }

        .labUploadFinalV3 .ohHero :is(h1,h2,h3,p,span,strong,small),
        .labUploadFinalV3 .ohContainer > section:first-of-type :is(h1,h2,h3,p,span,strong,small) {
          color: #ffffff !important;
        }

        .labUploadFinalV3 h1 {
          font-size: clamp(2.55rem, 5vw, 4.4rem) !important;
          line-height: 1.03 !important;
          letter-spacing: -0.05em !important;
        }

        .labUploadFinalV3 h2,
        .labUploadFinalV3 h3,
.labUploadFinalV3 strong {
  color: #0f172a !important;
  font-weight: 950 !important;
}

.labUploadFinalV3 .uploadFocusPanel h3,
.labUploadFinalV3 .uploadFocusPanel .ohCardTitle,
.labUploadFinalV3 .uploadFocusPanel strong {
  color: #ffffff !important;
}

.labUploadFinalV3 .uploadFocusPanel .ohMetricLabel,
.labUploadFinalV3 .uploadFocusPanel .ohCardText {
  color: rgba(226,232,240,.92) !important;
}

        .labUploadFinalV3 p,
        .labUploadFinalV3 small,
        .labUploadFinalV3 li {
          color: #334155 !important;
          font-weight: 740 !important;
          line-height: 1.7 !important;
        }

        .labUploadFinalV3 .ohMetricGrid > * {
          min-height: 145px !important;
          border: 0 !important;
          border-radius: 24px !important;
          color: #ffffff !important;
          box-shadow: 0 24px 62px rgba(15, 23, 42, 0.24) !important;
        }

        .labUploadFinalV3 .ohMetricGrid > *:nth-child(1) {
          background: linear-gradient(135deg, #1d4ed8, #0f766e) !important;
        }

        .labUploadFinalV3 .ohMetricGrid > *:nth-child(2) {
          background: linear-gradient(135deg, #0f766e, #06b6d4) !important;
        }

        .labUploadFinalV3 .ohMetricGrid > *:nth-child(3) {
          background: linear-gradient(135deg, #047857, #10b981) !important;
        }

        .labUploadFinalV3 .ohMetricGrid > *:nth-child(4) {
          background: linear-gradient(135deg, #b45309, #f59e0b) !important;
        }

        .labUploadFinalV3 .ohMetricGrid > * * {
          color: #ffffff !important;
        }

        .labUploadFinalV3 .ohCard,
        .labUploadFinalV3 .ohActionPanel,
        .labUploadFinalV3 article,
        .labUploadFinalV3 form {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid rgba(15, 23, 42, 0.14) !important;
          border-radius: 30px !important;
          box-shadow: 0 22px 58px rgba(15, 23, 42, 0.13) !important;
        }

        .labUploadFinalV3 .ohCard *,
        .labUploadFinalV3 .ohActionPanel *,
        .labUploadFinalV3 article *,
        .labUploadFinalV3 form * {
          opacity: 1 !important;
        }

        .labUploadFinalV3 .ohCardHeader {
          background: linear-gradient(135deg, #061826, #0f766e) !important;
          border-radius: 22px !important;
          padding: 18px !important;
          border: 0 !important;
          margin-bottom: 18px !important;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.18) !important;
        }

        .labUploadFinalV3 .ohCardHeader,
        .labUploadFinalV3 .ohCardHeader * {
          color: #ffffff !important;
        }

        /* Upload box */
        .labUploadFinalV3 input[type="file"] {
          width: 100% !important;
          min-height: 210px !important;
          padding: 84px 24px 24px !important;
          border: 2px dashed rgba(15, 118, 110, 0.52) !important;
          border-radius: 28px !important;
          background:
            radial-gradient(circle at 50% 24%, rgba(20, 184, 166, 0.24), transparent 24%),
            linear-gradient(180deg, #f8fafc, #ecfeff) !important;
          color: #0f172a !important;
          font-weight: 950 !important;
          box-shadow:
            inset 0 0 0 1px rgba(15, 118, 110, 0.10),
            0 16px 36px rgba(15, 23, 42, 0.08) !important;
          cursor: pointer !important;
        }

        .labUploadFinalV3 label:has(input[type="file"]),
        .labUploadFinalV3 div:has(> input[type="file"]) {
          display: block !important;
          padding: 24px !important;
          border-radius: 30px !important;
          background: linear-gradient(180deg, #ffffff, #f8fafc) !important;
          border: 1px solid rgba(15, 23, 42, 0.14) !important;
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.12) !important;
        }

        /* Search and filter */
        .labUploadFinalV3 input[type="search"],
        .labUploadFinalV3 input[placeholder*="Search"],
        .labUploadFinalV3 input[placeholder*="search"],
        .labUploadFinalV3 input[placeholder*="file"],
        .labUploadFinalV3 select {
          min-height: 46px !important;
          padding: 0 14px !important;
          border-radius: 14px !important;
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid rgba(15, 23, 42, 0.24) !important;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08) !important;
          font-weight: 850 !important;
        }

        .labUploadFinalV3 input[placeholder*="Search"],
        .labUploadFinalV3 input[placeholder*="search"],
        .labUploadFinalV3 input[placeholder*="file"] {
          width: min(100%, 760px) !important;
          min-width: 360px !important;
        }

        .labUploadFinalV3 select {
          min-width: 190px !important;
        }

        .labUploadFinalV3 input::placeholder {
          color: #64748b !important;
          opacity: 1 !important;
        }

        /* Dark helper boxes like Clear Next Step */
        .labUploadFinalV3 .ohContainer > section div[style*="#061826"],
        .labUploadFinalV3 .ohContainer > section div[style*="#0f766e"],
        .labUploadFinalV3 .ohContainer > section div[style*="linear-gradient"],
        .labUploadFinalV3 aside div[style*="#061826"],
        .labUploadFinalV3 aside div[style*="#0f766e"],
        .labUploadFinalV3 aside div[style*="linear-gradient"] {
          padding: 24px !important;
          border-radius: 24px !important;
          background: linear-gradient(135deg, #061826, #0f766e) !important;
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18) !important;
        }

        .labUploadFinalV3 .ohContainer > section div[style*="#061826"] *,
        .labUploadFinalV3 .ohContainer > section div[style*="#0f766e"] *,
        .labUploadFinalV3 .ohContainer > section div[style*="linear-gradient"] *,
        .labUploadFinalV3 aside div[style*="#061826"] *,
        .labUploadFinalV3 aside div[style*="#0f766e"] *,
        .labUploadFinalV3 aside div[style*="linear-gradient"] * {
          color: #ffffff !important;
          opacity: 1 !important;
        }

        /* Supported documents on the right */
        .labUploadFinalV3 .ohTimelineItem,
        .labUploadFinalV3 [class*="TimelineItem"],
        .labUploadFinalV3 aside article,
        .labUploadFinalV3 aside .ohCard {
          min-height: 96px !important;
          padding: 18px !important;
          border-radius: 20px !important;
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid rgba(15, 23, 42, 0.12) !important;
          border-inline-start: 7px solid #0f766e !important;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08) !important;
        }

        .labUploadFinalV3 .ohTimelineItem strong,
        .labUploadFinalV3 [class*="TimelineItem"] strong,
        .labUploadFinalV3 aside article strong,
        .labUploadFinalV3 aside .ohCard strong {
          font-size: 1rem !important;
          color: #0f172a !important;
          font-weight: 950 !important;
        }

        .labUploadFinalV3 .ohTimelineItem p,
        .labUploadFinalV3 [class*="TimelineItem"] p,
        .labUploadFinalV3 aside article p,
        .labUploadFinalV3 aside .ohCard p {
          color: #475569 !important;
          font-weight: 740 !important;
        }

        /* Buttons */
        .labUploadFinalV3 .primaryBtn,
        .labUploadFinalV3 button[type="submit"],
        .labUploadFinalV3 a[href*="reports"],
        .labUploadFinalV3 a[href*="intelligence"] {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 42px !important;
          padding: 0 16px !important;
          border-radius: 999px !important;
          background: linear-gradient(135deg, #06b6d4, #14b8a6) !important;
          color: #061826 !important;
          border: 0 !important;
          font-weight: 950 !important;
          box-shadow: 0 16px 40px rgba(6, 182, 212, 0.34) !important;
          text-decoration: none !important;
        }

        .labUploadFinalV3 .primaryBtn *,
        .labUploadFinalV3 button[type="submit"] *,
        .labUploadFinalV3 a[href*="reports"] *,
        .labUploadFinalV3 a[href*="intelligence"] * {
          color: #061826 !important;
        }

        .labUploadFinalV3 .secondaryBtn,
        .labUploadFinalV3 a[href*="file"] {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 40px !important;
          padding: 0 16px !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #0f766e !important;
          border: 1px solid rgba(15, 118, 110, 0.34) !important;
          font-weight: 950 !important;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.10) !important;
          text-decoration: none !important;
        }
      `}</style></main>
  );
}







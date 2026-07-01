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
          ? `تم اختيار الملف "${uploadedFileName}" من الصفحة الرئيسية. ارفعه هنا لحفظه بأمان والمتابعة إلى الاستخراج أو الذكاء الصحي.`
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

    setUploadedFiles((data || []) as UploadedFile[]);

    const params = new URLSearchParams(window.location.search);
    const wasUploadedFromHomepage = params.get("uploaded") === "1";

    if (wasUploadedFromHomepage && data && data.length > 0) {
      setLatestUploadedFileName(data[0].file_name);
      setLatestUploadedReportId(data[0].id);
      setMessage(
        `Your file "${data[0].file_name}" is saved. You can run extraction, open the report, or continue to Intelligence Center.`
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

  function removeSelectedFile(index: number) {
    setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function uploadFile() {
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

    for (const file of selectedFiles) {
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
            "Medical report uploaded successfully. Text extraction and health intelligence review are available from OrganHeal.",
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

      if (insertedFile) {
        await supabase.from("health_insights").insert([
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
              "Open Intelligence Center to generate a patient-friendly summary and doctor-ready brief.",
            doctor_brief: "Pending intelligence generation.",
            next_best_action:
              "Open Intelligence Center to generate structured report intelligence.",
          },
        ]);
      }

      uploadedCount++;
      setLatestUploadedFileName(file.name);
      setLatestUploadedReportId(insertedFile.id);
    }

    setSelectedFiles([]);
    setUploading(false);
    setUploadStep("saved");
    setMessage(
      text(
        `${uploadedCount} report(s) uploaded successfully. Next step: analyze this report now.`,
        `تم رفع ${uploadedCount} تقرير بنجاح. يمكنك تشغيل الاستخراج الآن، فتح مكتبة التقارير، أو المتابعة إلى مركز الذكاء.`
      )
    );

    await fetchUploadedFiles();
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
        "Report text extracted successfully. You can now open Intelligence Center.",
        "تم استخراج نص التقرير بنجاح. يمكنك الآن فتح مركز الذكاء."
      )
    );
    setExtractingReportId(null);
    setUploadStep("saved");
    await fetchUploadedFiles();
  }

  async function deleteFile(file: UploadedFile) {
    const confirmDelete = window.confirm(
      text(`Delete "${file.file_name}"?`, `هل تريد حذف "${file.file_name}"؟`)
    );

    if (!confirmDelete) return;

    const { error: storageError } = await supabase.storage
      .from("lab-reports")
      .remove([file.file_path]);

    if (storageError) {
      setMessage("Storage delete error: " + storageError.message);
      setUploadStep("error");
      return;
    }

    await supabase.from("health_insights").delete().eq("report_id", file.id);

    const { error: databaseError } = await supabase
      .from("uploaded_lab_files")
      .delete()
      .eq("id", file.id);

    if (databaseError) {
      setMessage("Database delete error: " + databaseError.message);
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
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"}>
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
                  "Upload your medical report and start health intelligence",
                  "ارفع تقريرك الطبي وابدأ الذكاء الصحي"
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "Upload lab reports, radiology reports, discharge summaries, prescriptions, or medical documents. After saving, you can run extraction or continue to Intelligence Center.",
                  "ارفع تقارير المختبر، الأشعة، ملخصات الخروج، الوصفات، أو المستندات الطبية. بعد الحفظ يمكنك تشغيل الاستخراج أو الانتقال إلى مركز الذكاء."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <a href="#medical-upload-panel" className="primaryBtn">
                  {text("Upload Report", "رفع تقرير")}
                </a>

                <Link href="/reports" className="secondaryBtn">
                  {text("Reports Library", "مكتبة التقارير")}
                </Link>

                <Link href="/intelligence" className="secondaryBtn">
                  {text("Intelligence Center", "مركز الذكاء")}
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
                      : text("Open Intelligence Center", "افتح مركز الذكاء")}
                  </h2>
                </div>

                <span className="ohStatusBadge neutral">
                  {stats.total} {text("saved", "محفوظ")}
                </span>
              </div>

              <p className="ohCardText">
                {stats.total === 0
                  ? text(
                      "After upload, the report will appear in Reports Library and Intelligence Center.",
                      "بعد الرفع، سيظهر التقرير في مكتبة التقارير ومركز الذكاء."
                    )
                  : text(
                      "You have saved reports. The next step is to generate or review health intelligence.",
                      "لديك تقارير محفوظة. الخطوة التالية هي توليد أو مراجعة الذكاء الصحي."
                    )}
              </p>

              <div className="ohDivider" />

              <Link
                href={latestUploadedReportId ? getReportAnalysisHref(latestUploadedReportId) : stats.total === 0 ? "/reports" : "/intelligence"}
                className="primaryBtn"
              >
                {stats.total === 0
                  ? text("Reports Library", "مكتبة التقارير")
                  : text("Intelligence Center", "مركز الذكاء")}
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
              {text("Ready for intelligence", "جاهزة للذكاء")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Pending / Processing", "بانتظار / جاري")}
            </span>
            <span className="ohMetricValue">{stats.pending + stats.processing}</span>
            <span className="ohMetricHint">
              {text("Need extraction or review", "تحتاج استخراجًا أو مراجعة")}
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
                  {selectedFiles.map((file, index) => (
                    <div className="ohTimelineItem" key={`${file.name}-${index}`}>
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
                        onClick={() => removeSelectedFile(index)}
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
                  onClick={uploadFile}
                  disabled={uploading}
                >
                  {uploading ? text("Saving...", "جاري الحفظ...") : text("Save Report", "حفظ التقرير")}
                </button>

                <Link href="/reports" className="secondaryBtn">
                  {text("Reports Library", "مكتبة التقارير")}
                </Link>

                <Link href="/intelligence" className="secondaryBtn">
                  {text("Intelligence Center", "مركز الذكاء")}
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
                        <Link href="/reports" className="primaryBtn">
                          {text("Open Reports Library", "فتح مكتبة التقارير")}
                        </Link>

                        <Link href="/intelligence" className="secondaryBtn">
                          {text("Open Intelligence", "فتح مركز الذكاء")}
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
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Recent Reports", "التقارير الأخيرة")}
              </p>

              <h2 className="ohCardTitle">
                {text("Track saving and extraction status", "تابع حالة الحفظ والاستخراج")}
              </h2>

              <p className="ohCardText">
                {text(
                  "You can open the original file, run extraction, or continue to Intelligence Center.",
                  "يمكنك فتح الملف الأصلي، تشغيل الاستخراج، أو الانتقال إلى مركز الذكاء."
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
              <option value="processing">
                {text("Processing", "جاري الاستخراج")}
              </option>
              <option value="completed">
                {text("Completed", "مكتمل")}
              </option>
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
          ) : (
            <div className="ohGrid cols2">
              {latestFiles.map((file) => (
                <article className="ohCard" key={file.id}>
                  <div className="ohCardHeader">
                    <div>
                      <p className="ohMetricLabel">
                        {getReportTypeLabel(file.report_type)}
                      </p>

                      <h3 className="ohCardTitle">{file.file_name}</h3>
                    </div>

                    <span className={`ohStatusBadge ${getExtractionTone(file.extraction_status)}`}>
                      {getExtractionLabel(file.extraction_status)}
                    </span>
                  </div>

                  <div className="ohGrid cols2" style={{ gap: "12px" }}>
                    <div className="ohMetricCard">
                      <span className="ohMetricLabel">
                        {text("Uploaded", "تاريخ الرفع")}
                      </span>
                      <span className="ohMetricValue" style={{ fontSize: "1.05rem" }}>
                        {formatDate(file.created_at)}
                      </span>
                    </div>

                    <div className="ohMetricCard">
                      <span className="ohMetricLabel">
                        {text("Extracted", "تاريخ الاستخراج")}
                      </span>
                      <span className="ohMetricValue" style={{ fontSize: "1.05rem" }}>
                        {formatDate(file.extracted_at)}
                      </span>
                    </div>
                  </div>

                  <p className="ohCardText">
                    {file.extraction_status === "Completed"
                      ? text(
                          "Text extraction is completed. Open Intelligence Center to generate summaries.",
                          "تم استخراج النص. يمكنك فتح مركز الذكاء لتوليد الملخص."
                        )
                      : text(
                          "The report is saved. You can run extraction or continue to Intelligence Center.",
                          "التقرير محفوظ. يمكنك تشغيل الاستخراج أو الانتقال إلى مركز الذكاء."
                        )}
                  </p>

                  <div className="ohButtonRow">
                    <button
                      type="button"
                      className="secondaryBtn"
                      onClick={() => openFile(file.file_path)}
                    >
                      {text("Open File", "فتح الملف")}
                    </button>

                    <button
                      type="button"
                      className="secondaryBtn"
                      onClick={() => runExtraction(file)}
                      disabled={extractingReportId === file.id}
                    >
                      {extractingReportId === file.id
                        ? text("Extracting...", "جاري الاستخراج...")
                        : text("Run Extraction", "تشغيل الاستخراج")}
                    </button>

                    <Link href="/intelligence" className="primaryBtn">
                      {text("Intelligence", "مركز الذكاء")}
                    </Link>

                    <button
                      type="button"
                      className="secondaryBtn"
                      onClick={() => deleteFile(file)}
                    >
                      {text("Delete", "حذف")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
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
                  "From upload to health intelligence",
                  "من الرفع إلى الذكاء الصحي"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Save the report, run extraction when needed, open Intelligence Center, then continue to your follow-up plan.",
                  "احفظ التقرير، شغّل الاستخراج عند الحاجة، افتح مركز الذكاء، ثم انتقل إلى خطة المتابعة."
                )}
              </p>
            </div>
          </div>

          <div className="ohButtonRow">
            <Link href="/reports" className="secondaryBtn">
              {text("Reports", "التقارير")}
            </Link>

            <Link href="/intelligence" className="primaryBtn">
              {text("Intelligence", "الذكاء")}
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
    </main>
  );
}



"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [latestUploadedFileName, setLatestUploadedFileName] = useState("");
  const [message, setMessage] = useState("");
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [uploading, setUploading] = useState(false);
  const [extractingReportId, setExtractingReportId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [reportFilter, setReportFilter] = useState<ReportFilter>("all");
  const [reportType, setReportType] = useState<ReportType>("lab");

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";
      setLanguage(currentLanguage);
    }, 300);

    fetchUploadedFiles();
    loadPendingHeroFile();

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  function loadPendingHeroFile() {
    const uploadedFileName = sessionStorage.getItem(
      "organheal-latest-uploaded-lab-file"
    );

    if (uploadedFileName) {
      setLatestUploadedFileName(uploadedFileName);
      setMessage(
        `Your file "${uploadedFileName}" was selected from the homepage. Upload it here to save it securely and continue to extraction or intelligence review.`
      );
      sessionStorage.removeItem("organheal-latest-uploaded-lab-file");
      return;
    }

    const savedFileName = sessionStorage.getItem("organheal-pending-lab-file");

    if (savedFileName) {
      setLatestUploadedFileName(savedFileName);
      setMessage(
        `You selected "${savedFileName}" from the homepage. Please upload it here to continue.`
      );
      sessionStorage.removeItem("organheal-pending-lab-file");
    }
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
        `Some files were not added: ${rejectedFiles.join(", ")}. Supported files: PDF, PNG, JPG, JPEG.`
      );
    } else if (combinedFiles.length > 0) {
      setMessage("");
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
        isArabic
          ? "يرجى اختيار ملف PDF أو صورة أولًا."
          : "Please select at least one PDF or image first."
      );
      return;
    }

    if (selectedFiles.length > MAX_FILES) {
      setMessage(
        isArabic
          ? `يمكنك رفع ${MAX_FILES} ملفات كحد أقصى في كل مرة.`
          : `You can upload up to ${MAX_FILES} files at a time.`
      );
      return;
    }

    setUploading(true);
    setUploadStep("uploading");
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage(
        isArabic
          ? "يرجى تسجيل الدخول أو إنشاء حساب لرفع التقارير."
          : "Please login or sign up to upload medical reports."
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
    }

    setSelectedFiles([]);
    setUploading(false);
    setUploadStep("saved");
    setMessage(
      `${uploadedCount} report(s) uploaded successfully. You can run extraction now, open Reports Library, or continue to Intelligence Center.`
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
        isArabic
          ? "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى."
          : "Session expired. Please login again."
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
      isArabic
        ? "تم استخراج نص التقرير بنجاح. يمكنك الآن فتح مركز الذكاء."
        : "Report text extracted successfully. You can now open Intelligence Center."
    );
    setExtractingReportId(null);
    setUploadStep("saved");
    await fetchUploadedFiles();
  }

  async function deleteFile(file: UploadedFile) {
    const confirmDelete = window.confirm(`Delete "${file.file_name}"?`);

    if (!confirmDelete) return;

    const { error: storageError } = await supabase.storage
      .from("lab-reports")
      .remove([file.file_path]);

    if (storageError) {
      setMessage("Storage delete error: " + storageError.message);
      return;
    }

    await supabase.from("health_insights").delete().eq("report_id", file.id);

    const { error: databaseError } = await supabase
      .from("uploaded_lab_files")
      .delete()
      .eq("id", file.id);

    if (databaseError) {
      setMessage("Database delete error: " + databaseError.message);
      return;
    }

    setMessage(`"${file.file_name}" deleted successfully.`);
    await fetchUploadedFiles();
  }

  async function openFile(filePath: string) {
    const { data, error } = await supabase.storage
      .from("lab-reports")
      .createSignedUrl(filePath, 60 * 60);

    if (error) {
      setMessage("File open error: " + error.message);
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
    if (!value) return isArabic ? "غير متاح" : "Not available";
    return new Date(value).toLocaleString();
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
    <main className="labUploadConversionPage" dir={isArabic ? "rtl" : "ltr"}>
      <section className="labUploadHero">
        <div>
          <p className="launchEyebrow">
            {isArabic ? "رفع التقارير الطبية" : "Medical Report Upload"}
          </p>

          <h1>
            {isArabic
              ? "ارفع تقريرك الطبي وابدأ الذكاء الصحي"
              : "Upload your medical report and start health intelligence"}
          </h1>

          <p>
            {isArabic
              ? "ارفع تقارير المختبر، الأشعة، ملخصات الخروج، الوصفات، أو المستندات الطبية. بعد الحفظ يمكنك تشغيل الاستخراج أو الانتقال إلى مركز الذكاء."
              : "Upload lab reports, radiology reports, discharge summaries, prescriptions, or medical documents. After saving, you can run extraction or continue to Intelligence Center."}
          </p>
        </div>

        <div className="labUploadHeroCard">
          <span>{isArabic ? "الخطوة التالية" : "Next step"}</span>
          <h2>
            {stats.total === 0
              ? isArabic
                ? "ارفع أول تقرير"
                : "Upload your first report"
              : isArabic
              ? "افتح مركز الذكاء"
              : "Open Intelligence Center"}
          </h2>
          <p>
            {stats.total === 0
              ? isArabic
                ? "بعد الرفع، سيظهر التقرير في مكتبة التقارير ومركز الذكاء."
                : "After upload, the report will appear in Reports Library and Intelligence Center."
              : isArabic
              ? "لديك تقارير محفوظة. الخطوة التالية هي توليد أو مراجعة الذكاء الصحي."
              : "You have saved reports. The next step is to generate or review health intelligence."}
          </p>

          <Link
            href={stats.total === 0 ? "/reports" : "/intelligence"}
            className="launchPrimary"
          >
            {stats.total === 0
              ? isArabic
                ? "مكتبة التقارير"
                : "Reports Library"
              : isArabic
              ? "مركز الذكاء"
              : "Intelligence Center"}
          </Link>
        </div>
      </section>

      <section className="labUploadStatsGrid">
        <article>
          <span>{isArabic ? "كل التقارير" : "Total reports"}</span>
          <strong>{stats.total}</strong>
          <p>{isArabic ? "محفوظة في حسابك" : "Saved in your account"}</p>
        </article>

        <article>
          <span>{isArabic ? "استخراج مكتمل" : "Extraction completed"}</span>
          <strong>{stats.completed}</strong>
          <p>{isArabic ? "جاهزة للذكاء" : "Ready for intelligence"}</p>
        </article>

        <article>
          <span>{isArabic ? "بانتظار" : "Pending"}</span>
          <strong>{stats.pending + stats.processing}</strong>
          <p>{isArabic ? "تحتاج تشغيل أو انتظار" : "Need extraction or review"}</p>
        </article>

        <article>
          <span>{isArabic ? "فشل" : "Failed"}</span>
          <strong>{stats.failed}</strong>
          <p>{isArabic ? "يمكن إعادة المحاولة" : "Can be retried"}</p>
        </article>
      </section>

      <section className="labUploadPanel">
        <div className="labUploadPanelHeader">
          <p className="launchEyebrow">
            {isArabic ? "ارفع ملفًا" : "Upload file"}
          </p>

          <h2>
            {isArabic
              ? "اسحب التقرير أو اختره من جهازك"
              : "Drop your report or choose it from your device"}
          </h2>

          <p>
            {isArabic
              ? "يدعم PDF و PNG و JPG و JPEG. يمكنك رفع حتى 10 ملفات في كل مرة."
              : "Supports PDF, PNG, JPG, and JPEG. You can upload up to 10 files at a time."}
          </p>
        </div>

        <div className="labUploadControls">
          <label>
            <span>{isArabic ? "نوع التقرير" : "Report type"}</span>
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value as ReportType)}
            >
              <option value="lab">{isArabic ? "مختبر" : "Laboratory"}</option>
              <option value="radiology">{isArabic ? "أشعة" : "Radiology"}</option>
              <option value="clinical">
                {isArabic ? "تقرير سريري" : "Clinical Summary"}
              </option>
              <option value="prescription">
                {isArabic ? "وصفة طبية" : "Prescription"}
              </option>
              <option value="medical">
                {isArabic ? "تقرير طبي عام" : "General Medical"}
              </option>
            </select>
          </label>
        </div>

        <label
          className="labUploadDropZone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={handleFileInput}
          />

          <div className="labDropIcon">PDF</div>

          <strong>
            {selectedFiles.length > 0
              ? `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`
              : latestUploadedFileName
              ? latestUploadedFileName
              : isArabic
              ? "اسحب حتى 10 ملفات أو اضغط للاختيار"
              : "Drop up to 10 files or click to upload"}
          </strong>

          <span>
            {selectedFiles.length > 0
              ? selectedFiles.map((file) => file.name).join(", ")
              : isArabic
              ? "PDF, PNG, JPG, JPEG"
              : "PDF, PNG, JPG, JPEG supported"}
          </span>
        </label>

        {selectedFiles.length > 0 && (
          <div className="labSelectedFiles">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`}>
                <span>{file.name}</span>
                <button type="button" onClick={() => removeSelectedFile(index)}>
                  {isArabic ? "إزالة" : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="labUploadActions">
          <button
            type="button"
            className="launchPrimary labUploadButton"
            onClick={uploadFile}
            disabled={uploading}
          >
            {uploading
              ? isArabic
                ? "جاري الحفظ..."
                : "Saving..."
              : isArabic
              ? "حفظ التقرير"
              : "Save Report"}
          </button>

          <Link href="/reports" className="launchSecondary">
            {isArabic ? "مكتبة التقارير" : "Reports Library"}
          </Link>

          <Link href="/intelligence" className="launchSecondary">
            {isArabic ? "مركز الذكاء" : "Intelligence Center"}
          </Link>
        </div>

        {message && (
          <div className={`labUploadMessage ${uploadStep === "error" ? "error" : "success"}`}>
            <p>{message}</p>

            {canShowNextStep && (
              <div className="labUploadMessageActions">
                <Link href="/reports" className="launchPrimary">
                  {isArabic ? "افتح مكتبة التقارير" : "Open Reports Library"}
                </Link>

                <Link href="/intelligence" className="launchSecondary">
                  {isArabic ? "افتح مركز الذكاء" : "Open Intelligence"}
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="labUploadReportsSection">
        <div className="labUploadReportsHeader">
          <div>
            <p className="launchEyebrow">
              {isArabic ? "التقارير الأخيرة" : "Recent reports"}
            </p>

            <h2>
              {isArabic
                ? "تابع حالة الحفظ والاستخراج"
                : "Track saving and extraction status"}
            </h2>

            <p>
              {isArabic
                ? "يمكنك فتح الملف الأصلي، تشغيل الاستخراج، أو الانتقال إلى مركز الذكاء."
                : "You can open the original file, run extraction, or continue to Intelligence Center."}
            </p>
          </div>

          <div className="labUploadFilters">
            <input
              type="text"
              placeholder={isArabic ? "ابحث باسم الملف" : "Search by file name"}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <select
              value={reportFilter}
              onChange={(event) => setReportFilter(event.target.value as ReportFilter)}
            >
              <option value="all">{isArabic ? "الكل" : "All"}</option>
              <option value="pending">{isArabic ? "بانتظار" : "Pending"}</option>
              <option value="processing">
                {isArabic ? "جاري الاستخراج" : "Processing"}
              </option>
              <option value="completed">
                {isArabic ? "مكتمل" : "Completed"}
              </option>
              <option value="failed">{isArabic ? "فشل" : "Failed"}</option>
            </select>
          </div>
        </div>

        {uploadedFiles.length === 0 ? (
          <div className="labUploadEmpty">
            <h3>
              {isArabic
                ? "لا توجد تقارير محفوظة بعد"
                : "No saved reports yet"}
            </h3>
            <p>
              {isArabic
                ? "ارفع أول تقرير طبي حتى يظهر هنا."
                : "Upload your first medical report so it appears here."}
            </p>
          </div>
        ) : latestFiles.length === 0 ? (
          <div className="labUploadEmpty">
            <h3>{isArabic ? "لا توجد نتائج مطابقة" : "No matching results"}</h3>
            <p>
              {isArabic
                ? "غيّر البحث أو الفلتر الحالي."
                : "Change the search term or current filter."}
            </p>
          </div>
        ) : (
          <div className="labUploadReportGrid">
            {latestFiles.map((file) => (
              <article className="labUploadReportCard" key={file.id}>
                <div className="labReportTop">
                  <span>{getReportTypeLabel(file.report_type)}</span>
                  <strong>{getExtractionLabel(file.extraction_status)}</strong>
                </div>

                <h3>{file.file_name}</h3>

                <div className="labReportMeta">
                  <div>
                    <span>{isArabic ? "تاريخ الرفع" : "Uploaded"}</span>
                    <strong>{formatDate(file.created_at)}</strong>
                  </div>

                  <div>
                    <span>{isArabic ? "تاريخ الاستخراج" : "Extracted"}</span>
                    <strong>{formatDate(file.extracted_at)}</strong>
                  </div>
                </div>

                <p>
                  {file.extraction_status === "Completed"
                    ? isArabic
                      ? "تم استخراج النص. يمكنك فتح مركز الذكاء لتوليد الملخص."
                      : "Text extraction is completed. Open Intelligence Center to generate summaries."
                    : isArabic
                    ? "التقرير محفوظ. يمكنك تشغيل الاستخراج أو الانتقال لمركز الذكاء."
                    : "The report is saved. You can run extraction or continue to Intelligence Center."}
                </p>

                <div className="labReportActions">
                  <button
                    type="button"
                    className="launchSecondary labUploadButton"
                    onClick={() => openFile(file.file_path)}
                  >
                    {isArabic ? "فتح الملف" : "Open File"}
                  </button>

                  <button
                    type="button"
                    className="launchSecondary labUploadButton"
                    onClick={() => runExtraction(file)}
                    disabled={extractingReportId === file.id}
                  >
                    {extractingReportId === file.id
                      ? isArabic
                        ? "جاري الاستخراج..."
                        : "Extracting..."
                      : isArabic
                      ? "تشغيل الاستخراج"
                      : "Run Extraction"}
                  </button>

                  <Link href="/intelligence" className="launchPrimary">
                    {isArabic ? "مركز الذكاء" : "Intelligence"}
                  </Link>

                  <button
                    type="button"
                    className="launchSecondary labUploadButton"
                    onClick={() => deleteFile(file)}
                  >
                    {isArabic ? "حذف" : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="labUploadBottomNav">
        <div>
          <p className="launchEyebrow">
            {isArabic ? "المسار الصحيح" : "Recommended path"}
          </p>

          <h2>
            {isArabic
              ? "من الرفع إلى الذكاء الصحي"
              : "From upload to health intelligence"}
          </h2>

          <p>
            {isArabic
              ? "احفظ التقرير، شغّل الاستخراج عند الحاجة، افتح مركز الذكاء، ثم انتقل إلى خطة المتابعة."
              : "Save the report, run extraction when needed, open Intelligence Center, then continue to your follow-up plan."}
          </p>
        </div>

        <div className="labUploadBottomLinks">
          <Link href="/reports">{isArabic ? "التقارير" : "Reports"}</Link>
          <Link href="/intelligence">{isArabic ? "الذكاء" : "Intelligence"}</Link>
          <Link href="/health-plan">{isArabic ? "الخطة" : "Health Plan"}</Link>
          <Link href="/dashboard">{isArabic ? "لوحة التحكم" : "Dashboard"}</Link>
        </div>
      </section>
    </main>
  );
}
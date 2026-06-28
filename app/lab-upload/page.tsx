"use client";
import { generateLabSummary } from "../../lib/labAnalyzer";
import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type UploadedFile = {
  id: number;
  file_name: string;
  file_path: string;
  file_url: string | null;
  created_at: string;
  analysis_status: string | null;
  extracted_text: string | null;
  ai_summary: string | null;
  extraction_status?: string | null;
  extracted_at?: string | null;
};

type AnalysisStep = "idle" | "uploading" | "extracting" | "analyzing" | "ready";

export default function LabUploadPage() {
 const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
const [fileNames, setFileNames] = useState<string[]>([]);
const [reportType, setReportType] = useState("medical");
const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [latestUploadedFileName, setLatestUploadedFileName] = useState("");
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>("idle");
  const [searchTerm, setSearchTerm] = useState("");
const [reportFilter, setReportFilter] = useState("all");
const [showIntelligenceLink, setShowIntelligenceLink] = useState(false);

useEffect(() => {
  checkAuth();
}, []);

async function checkAuth() {
  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    window.location.href = "/login";
    return;
  }

  fetchUploadedFiles();
  loadPendingHeroFile();
}
function loadPendingHeroFile() {
  const uploadedFileName = sessionStorage.getItem(
    "organheal-latest-uploaded-lab-file"
  );

  if (uploadedFileName) {
  setLatestUploadedFileName(uploadedFileName);

  setMessage(
    `Your file "${uploadedFileName}" was uploaded successfully from the homepage. AI extraction will be connected in the next phase.`
  );

  sessionStorage.removeItem("organheal-latest-uploaded-lab-file");
  return;
}

  const savedFileName = sessionStorage.getItem(
    "organheal-pending-lab-file-name"
  );

  if (!savedFileName) return;

  setMessage(
    `You selected "${savedFileName}" from the homepage. Please upload it here to continue analysis.`
  );

  sessionStorage.removeItem("organheal-pending-lab-file-name");
}
 function handleFiles(files: FileList | File[]) {
  const newFiles = Array.from(files);
setShowIntelligenceLink(false);
  setSelectedFiles((previousFiles) => {
    const combinedFiles = [...previousFiles, ...newFiles].slice(0, 10);

    setFileNames(combinedFiles.map((file) => file.name));

    if (combinedFiles.length >= 10) {
      setMessage("Maximum 10 files selected.");
    } else {
      setMessage("");
    }

    return combinedFiles;
  });

  setAnalysisStep("idle");
}

function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
  const files = event.target.files;
  if (files && files.length > 0) handleFiles(files);
}

 function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
  event.preventDefault();

  const files = event.dataTransfer.files;
  if (files && files.length > 0) handleFiles(files);
}

  function handleDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
  }

  async function fetchUploadedFiles() {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) return;

    const user = userData.user;

    const { data, error } = await supabase
      .from("uploaded_lab_files")
      .select("id, file_name, file_path, file_url, created_at, analysis_status, extracted_text, ai_summary, extraction_status, extracted_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Database error: " + error.message);
      return;
    }

setUploadedFiles(data || []);

const params = new URLSearchParams(window.location.search);
const wasUploadedFromHomepage = params.get("uploaded") === "1";

if (wasUploadedFromHomepage && data && data.length > 0) {
  setLatestUploadedFileName(data[0].file_name);

  setMessage(
    `Your file "${data[0].file_name}" was uploaded successfully and is ready for AI extraction.`
  );
}
}
function removeSelectedFile(index: number) {
  const updatedFiles = selectedFiles.filter((_, fileIndex) => fileIndex !== index);

  setSelectedFiles(updatedFiles);
  setFileNames(updatedFiles.map((file) => file.name));

  if (updatedFiles.length === 0) {
    setMessage("");
    setAnalysisStep("idle");
  }
}
async function uploadFile() {
  if (selectedFiles.length === 0) {
    setMessage("Please upload at least one PDF or image first.");
    return;
  }

  if (selectedFiles.length > 10) {
    setMessage("You can upload up to 10 files at a time.");
    return;
  }

  setUploading(true);
  setMessage("");
  setAnalysisStep("uploading");

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    setMessage("Please login or sign up to upload lab reports.");
    setUploading(false);
    setAnalysisStep("idle");
    return;
  }

  const user = userData.user;
  let uploadedCount = 0;

  for (const file of selectedFiles) {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
  .from("lab-reports")
  .upload(filePath, file, {
    upsert: false,
  });


    if (uploadError) {
      setMessage("Upload error: " + uploadError.message);
      setUploading(false);
      setAnalysisStep("idle");
      return;
    }
      if (!uploadData?.path) {
  setMessage("Upload error: Supabase did not return a saved file path.");
  setUploading(false);
  setAnalysisStep("idle");
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
      setAnalysisStep("idle");
      return;
    }

    setAnalysisStep("analyzing");

    const analysis = generateLabSummary(file.name);

   const { data: insertedFile, error: databaseError } = await supabase
  .from("uploaded_lab_files")
  .insert({
    user_id: user.id,
    file_name: file.name,
    file_path: savedFilePath,
    file_url: signedUrlData.signedUrl,
    report_type: reportType,
    analysis_status: analysis.status,
    ai_summary: analysis.summary,
    extraction_status: "Pending",
extracted_text: null,
extracted_at: null,
  })
  .select("id")
  .single();

  if (databaseError) {
  setMessage("Database error: " + databaseError.message);
  setUploading(false);
  setAnalysisStep("idle");
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

      summary: "Report uploaded successfully and awaiting AI extraction.",
      key_findings: "Pending analysis.",
      risk_signals: "Pending analysis.",
      recommendations: "Pending analysis.",
      doctor_brief: "Pending AI interpretation.",
    },
  ]);
}

uploadedCount++;
  }

  setAnalysisStep("ready");
  setShowIntelligenceLink(true);
setMessage(
  `${uploadedCount} report(s) uploaded successfully.

Your report is now ready for intelligence review.

Open Intelligence Center to view your Health Story, Forecast, Digital Twin, Risk Analysis, and Action Plan.`
);

  setSelectedFiles([]);
  setFileNames([]);
  setUploading(false);

  await fetchUploadedFiles();
}async function deleteFile(file: UploadedFile) {
  const confirmDelete = window.confirm(
    `Delete "${file.file_name}"?`
  );

  if (!confirmDelete) return;

  const { error: storageError } = await supabase.storage
    .from("lab-reports")
    .remove([file.file_path]);

  if (storageError) {
    setMessage("Storage delete error: " + storageError.message);
    return;
  }

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

  const steps = [
    {
      key: "uploading",
      title: "Uploading",
      description: "Securely saving the lab report.",
    },
    {
      key: "extracting",
      title: "Extracting",
      description: "Preparing lab values for AI extraction.",
    },
    {
      key: "analyzing",
      title: "Analyzing",
      description: "Generating educational health insights.",
    },
    {
      key: "ready",
      title: "Ready",
      description: "Report is saved and ready for the next AI phase.",
    },
  ];
const filteredFiles = uploadedFiles.filter((file) => {
  const matchesSearch = file.file_name
    .toLowerCase()
    .includes(searchTerm.toLowerCase());

  const matchesFilter =
    reportFilter === "all" || file.analysis_status === reportFilter;

  return matchesSearch && matchesFilter;
});
const latestFiles = filteredFiles.slice(0, 10);
return (
  <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">
  MEDICAL REPORT INTELLIGENCE
</p>
          <h1>Upload Medical Report</h1>
          <p>
  Upload laboratory reports, radiology reports, discharge summaries,
  prescriptions, or medical documents. OrganHeal will organize,
  explain, and prepare these reports for future health intelligence.
</p>
        </div>

        <div className="chatWindow">
          <div className="labUploadBox">
            <p className="sectionLabel">Medical Report Upload</p>
            <h2>Drop your medical report here</h2>
            <p>
  Laboratory Reports • Radiology Reports • Medical Reports •
  Discharge Summaries • PDF • JPG • PNG
</p>
<div style={{ marginBottom: "16px" }}>
  <select
    value={reportType}
    onChange={(event) => setReportType(event.target.value)}
    className="reportTypeSelect"
  >
    <option value="lab">Laboratory Report</option>
    <option value="radiology">Radiology Report</option>
    <option value="medical">Medical Report</option>
    <option value="discharge">Discharge Summary</option>
  </select>
</div>
  <label
  className="labDropZone"
  onDrop={handleDrop}
  onDragOver={handleDragOver}
>
  <input
    type="file"
    accept=".pdf,.jpg,.jpeg,.png"
    onChange={handleFileChange}
    multiple
    hidden
  />

  <div className="labDropIcon">📄</div>

  <strong>
    {fileNames.length > 0
      ? `${fileNames.length} file${fileNames.length > 1 ? "s" : ""} selected`
      : latestUploadedFileName
      ? latestUploadedFileName
      : "Drop up to 10 PDF or image files, or click to upload"}
  </strong>

  <span>
    {fileNames.length > 0
      ? fileNames.join(", ")
      : latestUploadedFileName
      ? "Ready for AI extraction"
      : "PDF, JPG, JPEG, PNG supported"}
  </span>

  {fileNames.length > 0 && (
    <div className="selectedFileList">
      {fileNames.map((name, index) => (
        <div key={name + index} className="selectedFileItem">
          <span>{name}</span>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              removeSelectedFile(index);
            }}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )}

<div
  style={{
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
  }}
>
  <button
    type="button"
    className="primaryBtn"
    onClick={(event) => {
      event.preventDefault();
      uploadFile();
    }}
    disabled={uploading}
  >
    {uploading ? "Processing..." : "Analyze Report"}
  </button>
</div>
</label>
            <div className="labAnalysisSteps">
              {steps.map((step) => (
                <div
                  key={step.key}
                  className={`labAnalysisStep ${
                    analysisStep === step.key ? "active" : ""
                  }`}
                >
                  <strong>{step.title}</strong>
                  <span>{step.description}</span>
                </div>
              ))}
            </div>
              

  {message && (
  <div className="resultBox">
    <p className="sectionLabel">
      {showIntelligenceLink ? "Report Saved" : "Upload Status"}
    </p>

    <h2>
      {showIntelligenceLink
        ? "Your report is ready for review"
        : "Upload update"}
    </h2>

    <p
      style={{
        whiteSpace: "pre-line",
        opacity: 0.82,
        lineHeight: 1.7,
        maxWidth: "760px",
        margin: "0 auto 20px",
      }}
    >
      {message}
    </p>

    {showIntelligenceLink && (
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button
          className="primaryBtn"
          onClick={() => {
            window.location.href = "/reports";
          }}
        >
          Open Reports Library
        </button>

        <button
          className="secondaryBtn"
          onClick={() => {
            window.location.href = "/intelligence";
          }}
        >
          Open Intelligence Center
        </button>
      </div>
    )}
  </div>
)}
{latestUploadedFileName && (
  <div className="resultBox">
    <p className="sectionLabel">Latest Uploaded File</p>
    <h3>{latestUploadedFileName}</h3>
    <p>Status: uploaded and ready for AI extraction</p>
  </div>
)}
</div>
<div className="resultBox">
  <p className="sectionLabel">Latest Uploaded Reports</p>
<h2>Recently Uploaded Medical Reports</h2>

  <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
    <input
      type="text"
      placeholder="Search reports..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="searchInput"
    />

    <select
      value={reportFilter}
      onChange={(e) => setReportFilter(e.target.value)}
      className="reportTypeSelect"
    >
      <option value="all">All</option>
      <option value="uploaded">Uploaded</option>
      <option value="analyzed">Analyzed</option>
      <option value="pending">Pending</option>
    </select>
  </div>

  {uploadedFiles.length === 0 ? (
    <p>No uploaded lab reports yet.</p>
  ) : (
    latestFiles.map((file) => (
      <div
        key={file.id}
        style={{
          padding: "14px 0",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <h3>{file.file_name}</h3>

        <p>Uploaded on: {new Date(file.created_at).toLocaleString()}</p>

        <p>
          Status: <strong>{file.analysis_status || "uploaded"}</strong>
        </p>

        {file.ai_summary && (
          <div className="resultBox">
            <p>{file.ai_summary}</p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            className="secondaryBtn"
            onClick={() => openFile(file.file_path)}
          >
            Open File
          </button>

          <button
            className="primaryBtn"
            onClick={() => {
              window.location.href = "/intelligence";
            }}
          >
            View Intelligence
          </button>

          <button
            className="secondaryBtn"
            onClick={() => deleteFile(file)}
          >
            Delete File
          </button>
        </div>
      </div>
    ))
  )}
</div>

<div className="trustBox">
  <p className="sectionLabel">Important Notice</p>

  <h2>Educational Use Only</h2>

  <p>
    OrganHeal AI is designed for educational health awareness and wellness
    tracking. It does not provide diagnosis, treatment, or emergency medical
    advice.
  </p>
</div>
</div>
</div>
</main>
);
}
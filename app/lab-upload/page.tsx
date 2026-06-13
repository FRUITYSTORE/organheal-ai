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
};

type AnalysisStep = "idle" | "uploading" | "extracting" | "analyzing" | "ready";

export default function LabUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [latestUploadedFileName, setLatestUploadedFileName] = useState("");
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>("idle");

  useEffect(() => {
  fetchUploadedFiles();
  loadPendingHeroFile();
}, []);
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
  function handleFile(file: File) {
    setSelectedFile(file);
    setFileName(file.name);
    setMessage("");
    setAnalysisStep("idle");
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  }

 function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
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
      .select("id, file_name, file_path, file_url, created_at, analysis_status, extracted_text, ai_summary")
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

async function uploadFile() {
    if (!selectedFile) {
      setMessage("Please upload a PDF or image first.");
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

    const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("lab-reports")
      .upload(filePath, selectedFile);

    if (uploadError) {
      setMessage("Upload error: " + uploadError.message);
      setUploading(false);
      setAnalysisStep("idle");
      return;
    }

    setAnalysisStep("extracting");

    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from("lab-reports")
        .createSignedUrl(filePath, 60 * 60);

    if (signedUrlError) {
      setMessage("Signed URL error: " + signedUrlError.message);
      setUploading(false);
      setAnalysisStep("idle");
      return;
    }

    setAnalysisStep("analyzing");

    const { error: databaseError } = await supabase
      .from("uploaded_lab_files")
      .insert({
        user_id: user.id,
        file_name: selectedFile.name,
        file_path: filePath,
        file_url: signedUrlData.signedUrl,
      });

    if (databaseError) {
      setMessage("Database error: " + databaseError.message);
      setUploading(false);
      setAnalysisStep("idle");
      return;
    }
const analysis = generateLabSummary(selectedFile.name);

await supabase
  .from("uploaded_lab_files")
  .update({
    analysis_status: analysis.status,
    ai_summary: analysis.summary,
  })
  .eq("file_path", filePath);
    setAnalysisStep("ready");
    setMessage(
      "File uploaded successfully. AI extraction and structured lab interpretation will be connected in the next phase."
    );

    setSelectedFile(null);
    setFileName("");
    setUploading(false);

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

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">PDF / PHOTO LAB ANALYZER</p>
          <h1>Upload Lab Report</h1>
          <p>
            Upload a laboratory report as PDF, JPG, JPEG, or PNG. OrganHeal AI
            will use this flow to extract lab values and generate structured
            health intelligence.
          </p>
        </div>

        <div className="chatWindow">
          <div className="labUploadBox">
            <p className="sectionLabel">Lab Report Upload</p>
            <h2>Drop your lab report here</h2>
            <p>Supported formats: PDF, JPG, JPEG, PNG</p>

            <label
              className="labDropZone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                hidden
              />

              <div className="labDropIcon">📄</div>

              <strong>
  {fileName || latestUploadedFileName
    ? fileName || latestUploadedFileName
    : "Drop PDF or image, or click to upload"}
</strong>

<span>
  {fileName || latestUploadedFileName
    ? "Ready for AI extraction"
    : "Laboratory reports, blood tests, or health documents"}
</span>
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

            <div style={{ marginTop: "24px" }}>
              <button
                className="primaryBtn"
                onClick={uploadFile}
                disabled={uploading}
              >
                {uploading ? "Processing..." : "Analyze Report"}
              </button>
            </div>

            {message && (
  <div className="resultBox">
    <p>{message}</p>
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
            <p className="sectionLabel">Uploaded Lab Reports</p>

            {uploadedFiles.length === 0 ? (
              <p>No uploaded lab reports yet.</p>
            ) : (
              uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  style={{
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <h3>{file.file_name}</h3>

                  <p>
                    Uploaded on: {new Date(file.created_at).toLocaleString()}
                  </p>
<p>
  Status: <strong>{file.analysis_status || "uploaded"}</strong>
</p>
{file.ai_summary && (
  <div className="resultBox">
    <p>{file.ai_summary}</p>
  </div>
)}
                  <button
                    className="secondaryBtn"
                    onClick={() => openFile(file.file_path)}
                  >
                    Open File
                  </button>
                </div>
              ))
            )}
          </div>

                    <div className="trustBox">
            <p className="sectionLabel">Important Notice</p>

            <h2>Educational Use Only</h2>

            <p>
              OrganHeal AI is designed for educational health awareness and
              wellness tracking. It does not provide diagnosis, treatment, or
              emergency medical advice.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
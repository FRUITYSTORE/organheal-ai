"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LabUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setMessage("");
  }

  async function uploadFile() {
    if (!selectedFile) {
      setMessage("Please upload a PDF or image first.");
      return;
    }

    setUploading(true);
    setMessage("Uploading file...");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Please login or sign up to upload lab reports.");
      setUploading(false);
      return;
    }

    const user = userData.user;

    const fileExt = selectedFile.name.split(".").pop();
    const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("lab-reports")
      .upload(filePath, selectedFile);

    if (uploadError) {
      setMessage("Upload error: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from("lab-reports")
        .createSignedUrl(filePath, 60 * 60);

    if (signedUrlError) {
      setMessage("Signed URL error: " + signedUrlError.message);
      setUploading(false);
      return;
    }

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
      return;
    }

    setMessage(
      "File uploaded successfully. AI analysis will be connected in the next phase."
    );

    setUploading(false);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">PDF / PHOTO LAB ANALYZER</p>

          <h1>Upload Lab Report</h1>

          <p>
            Upload a laboratory report as PDF, JPG, JPEG, or PNG. OrganHeal AI
            will later extract lab values and generate a health interpretation.
          </p>
        </div>

        <div className="chatWindow">
          <div className="labUploadBox">
            <h2>📄 Upload Laboratory Report</h2>

            <p>Supported formats: PDF, JPG, JPEG, PNG</p>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />

            {fileName && (
              <p
                style={{
                  marginTop: "18px",
                  fontWeight: "700",
                }}
              >
                Selected File: {fileName}
              </p>
            )}

            <div style={{ marginTop: "24px" }}>
              <button
                className="primaryBtn"
                onClick={uploadFile}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload File"}
              </button>
            </div>

            {message && (
              <div className="resultBox">
                <p>{message}</p>
              </div>
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
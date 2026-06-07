"use client";

import { useState } from "react";

export default function LabUploadPage() {
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setMessage("");
  }

  function analyzeFile() {
    if (!fileName) {
      setMessage("Please upload a PDF or image first.");
      return;
    }

    setMessage(
      "Demo Mode: File uploaded successfully. AI PDF & Photo analysis will be connected in the next phase."
    );
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">PDF / PHOTO LAB ANALYZER</p>

          <h1>Upload Lab Report</h1>

          <p>
            Upload a laboratory report as PDF, JPG, JPEG, or PNG.
            OrganHeal AI will soon automatically extract lab values
            and generate a health interpretation.
          </p>
        </div>

        <div className="chatWindow">
          <div className="labUploadBox">
            <h2>📄 Upload Laboratory Report</h2>

            <p>
              Supported formats:
              PDF, JPG, JPEG, PNG
            </p>

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
                onClick={analyzeFile}
              >
                Analyze File
              </button>
            </div>

            {message && (
              <div className="resultBox">
                <p>{message}</p>
              </div>
            )}
          </div>

          <div className="trustBox">
            <p className="sectionLabel">
              Important Notice
            </p>

            <h2>Educational Use Only</h2>

            <p>
              OrganHeal AI is designed for educational health
              awareness and wellness tracking.
              It does not provide diagnosis, treatment,
              or emergency medical advice.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
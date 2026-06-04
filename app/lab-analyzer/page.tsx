export default function LabAnalyzerPage() {
  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">LAB RESULTS ANALYZER</p>

          <h1>Understand Your Lab Results</h1>

          <p>
            Upload or enter your lab results to receive clear educational
            explanations about common laboratory values.
          </p>
        </div>

        <div className="chatWindow">
          <div className="labUploadBox">
            <div className="iconBox">📊</div>

            <h2>Upload Lab Report</h2>

            <p>
              PDF and image analysis will be available in the full version.
              For now, explore a demo interpretation below.
            </p>

            <button className="primaryBtn">Upload PDF or Image</button>
          </div>

          <div className="demoResult">
            <p className="sectionLabel">Demo Analysis</p>

            <div className="labItem">
              <strong>Total Cholesterol</strong>
              <span>240 mg/dL</span>
              <p>
                This value is considered elevated and may increase
                cardiovascular risk depending on other factors.
              </p>
            </div>

            <div className="labItem">
              <strong>LDL Cholesterol</strong>
              <span>160 mg/dL</span>
              <p>
                LDL is often called “bad cholesterol.” Higher levels may
                contribute to plaque buildup in arteries.
              </p>
            </div>

            <div className="labItem">
              <strong>HDL Cholesterol</strong>
              <span>42 mg/dL</span>
              <p>
                HDL helps remove excess cholesterol from the bloodstream.
                Higher HDL is generally considered protective.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
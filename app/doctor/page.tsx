import Link from "next/link";

export default function DoctorPortalPage() {
  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <section className="assistantHeader">
          <p className="assistantBadge">DOCTOR PORTAL MVP</p>

          <h1>Doctor Intelligence Portal</h1>

          <p>
            A future clinical workspace for reviewing patient health intelligence
            reports, organ scores, lab summaries, and follow-up notes.
          </p>

          <div className="buttons">
            <Link href="/dashboard">
              <button className="primaryBtn">Open Patient Dashboard</button>
            </Link>

            <Link href="/organ-report">
              <button className="secondaryBtn">View Patient Report</button>
            </Link>
          </div>
        </section>

        <section className="chatWindow">
          <div className="resultBox">
            <p className="sectionLabel">PORTAL STATUS</p>
            <h2>Doctor Portal Foundation</h2>
            <p>
              This is the first MVP version of the OrganHeal Doctor Portal. It
              is currently a protected concept area and will later include doctor
              authentication, patient report access, clinical notes, and shared
              health summaries.
            </p>
          </div>

          <div className="assessmentForm">
            <div className="resultBox">
              <p className="sectionLabel">PATIENT REPORTS</p>
              <h2>Shared Reports</h2>
              <p>
                Doctors will be able to review professional health intelligence
                reports shared by patients.
              </p>
            </div>

            <div className="resultBox">
              <p className="sectionLabel">ORGAN SCORES</p>
              <h2>Organ Health Overview</h2>
              <p>
                View heart, lung, kidney, liver, brain, metabolic, and lab
                intelligence scores in one clinical overview.
              </p>
            </div>

            <div className="resultBox">
              <p className="sectionLabel">LAB SUMMARY</p>
              <h2>Lab Intelligence</h2>
              <p>
                Review lab score, priority marker, affected organ, and suggested
                educational follow-up areas.
              </p>
            </div>

            <div className="resultBox">
              <p className="sectionLabel">FOLLOW-UP</p>
              <h2>Clinical Notes</h2>
              <p>
                Future versions will allow doctors to add structured follow-up
                notes and patient recommendations.
              </p>
            </div>
          </div>

          <div className="resultBox">
            <p className="sectionLabel">MVP ROADMAP</p>
            <h2>Next Doctor Portal Features</h2>

            <div
              style={{
                display: "grid",
                gap: "12px",
                textAlign: "left",
                marginTop: "18px",
              }}
            >
              <p>✅ Doctor Portal UI foundation</p>
              <p>⬜ Doctor authentication</p>
              <p>⬜ Patient report sharing</p>
              <p>⬜ Clinical notes</p>
              <p>⬜ Doctor dashboard analytics</p>
              <p>⬜ Role-based permissions</p>
            </div>
          </div>

          <div className="resultBox">
            <p className="sectionLabel">IMPORTANT NOTE</p>
            <h2>Educational and support use only</h2>
            <p>
              OrganHeal Doctor Portal is intended to support health education,
              health awareness, and better communication. It does not replace
              licensed clinical judgment, diagnosis, or treatment decisions.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
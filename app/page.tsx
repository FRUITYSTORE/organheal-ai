import Link from "next/link";

export default function HomePage() {
  return (
    <main className="launchPage">
      <section className="launchHero">
        <div>
          <p className="launchEyebrow">AI-Powered Health Intelligence</p>

          <h1>Understand your health data and know your next step.</h1>

          <p>
            OrganHeal helps you turn assessments, medical reports, and lab
            results into patient-friendly summaries, doctor-ready briefs, and a
            clear follow-up plan.
          </p>

          <div className="launchHeroActions">
            <Link href="/assessment" className="launchPrimary">
              Start Free Assessment
            </Link>

            <Link href="/lab-upload" className="launchSecondary">
              Upload Medical Report
            </Link>

            <Link href="/reports" className="launchSecondary">
              Reports Library
            </Link>

            <Link href="/intelligence" className="launchSecondary">
              Intelligence Center
            </Link>
          </div>

          <small>
            OrganHeal provides educational health intelligence only and does not
            replace medical diagnosis or licensed care.
          </small>
        </div>

        <div className="launchProductPreview">
          <div className="launchPreviewTop">
            <span>OrganHeal Intelligence</span>
            <small>Preview</small>
          </div>

          <div className="launchPreviewScore">
            <p>Health Plan Readiness</p>
            <h2>
              80<span>/100</span>
            </h2>
            <small>
              Based on assessments, reports, check-ins, and saved intelligence.
            </small>
          </div>

          <div className="launchPreviewGrid">
            <div>
              <span>Reports</span>
              <p>Saved medical reports organized in one library.</p>
            </div>

            <div>
              <span>Doctor Brief</span>
              <p>Structured summaries for medical visit preparation.</p>
            </div>

            <div>
              <span>Health Plan</span>
              <p>Personalized follow-up actions from connected data.</p>
            </div>

            <div>
              <span>History</span>
              <p>Track changes and progress over time.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="launchSection">
        <div className="launchSectionHeader">
          <p className="launchEyebrow">Why OrganHeal</p>
          <h2>Built for people who want clarity after health data.</h2>
          <p>
            Most people receive reports but do not know what to do next.
            OrganHeal organizes the journey from assessment to report
            intelligence to follow-up.
          </p>
        </div>

        <div className="launchValueGrid">
          <article className="launchValueCard">
            <div>01</div>
            <h3>Educational Health Intelligence</h3>
            <p>
              Understand health information in simple language without replacing
              doctors.
            </p>
          </article>

          <article className="launchValueCard">
            <div>02</div>
            <h3>Patient-Friendly Reports</h3>
            <p>
              Turn complex medical documents into summaries that are easier to
              understand.
            </p>
          </article>

          <article className="launchValueCard">
            <div>03</div>
            <h3>Doctor-Ready Briefs</h3>
            <p>
              Prepare organized briefs to support better conversations with
              clinicians.
            </p>
          </article>

          <article className="launchValueCard">
            <div>04</div>
            <h3>Private Health Data</h3>
            <p>
              Your reports and results stay connected to your own secure
              account.
            </p>
          </article>
        </div>
      </section>

      <section className="launchJourneySection">
        <div className="launchSectionHeader">
          <p className="launchEyebrow">How OrganHeal Works</p>
          <h2>Four steps to clearer health intelligence</h2>
          <p>
            Start with an assessment, upload your medical reports, generate
            organized intelligence, then continue with a personal follow-up plan.
          </p>
        </div>

        <div className="launchJourneyGrid">
          <article className="launchJourneyStep">
            <span>01</span>
            <p>Complete Assessment</p>
          </article>

          <article className="launchJourneyStep">
            <span>02</span>
            <p>Upload Medical Reports</p>
          </article>

          <article className="launchJourneyStep">
            <span>03</span>
            <p>Generate Intelligence</p>
          </article>

          <article className="launchJourneyStep">
            <span>04</span>
            <p>Continue Health Plan</p>
          </article>
        </div>
      </section>

      <section className="launchDarkSection">
        <div className="launchSectionHeader">
          <p className="launchEyebrow">Medical Report Intelligence</p>
          <h2>From medical reports to clear health understanding</h2>
          <p>
            OrganHeal helps organize and explain written reports without
            replacing doctors or providing medical diagnosis.
          </p>
        </div>

        <div className="launchWindowGrid">
          <article className="launchWindowCard">
            <span>Laboratory Reports</span>
            <h3>Blood tests and lab results</h3>
            <p>Review CBC, liver, kidney, lipid, glucose, and vitamin reports.</p>
          </article>

          <article className="launchWindowCard">
            <span>Radiology Reports</span>
            <h3>Imaging summaries</h3>
            <p>Organize written ultrasound, CT, MRI, and X-ray summaries.</p>
          </article>

          <article className="launchWindowCard">
            <span>Doctor Brief</span>
            <h3>Visit preparation</h3>
            <p>Create a structured summary before speaking with your doctor.</p>
          </article>

          <article className="launchWindowCard">
            <span>Follow-Up</span>
            <h3>Next step planning</h3>
            <p>Connect reports to Health Plan, Check-In, and History.</p>
          </article>
        </div>
      </section>

      <section className="launchSection">
        <div className="launchSectionHeader">
          <p className="launchEyebrow">Plans</p>
          <h2>Start free, then build continuous health follow-up</h2>
          <p>
            Free helps users start. Plus is designed for saved reports,
            generated intelligence, patient-friendly PDF, doctor-ready brief,
            Health Plan, and follow-up intelligence.
          </p>
        </div>

        <div className="launchPlanGrid">
          <article className="launchPlanCard">
            <h2>OrganHeal Free</h2>
            <p>Best for trying basic assessments and health explanations.</p>

            <ul>
              <li>Basic organ assessments</li>
              <li>Simple dashboard</li>
              <li>Basic check-ins</li>
              <li>Educational explanations</li>
            </ul>

            <Link href="/assessment" className="launchSecondary">
              Start Free
            </Link>
          </article>

          <article className="launchPlanCard launchPlanFeatured">
            <h2>OrganHeal Plus</h2>
            <p>
              A subscription-value experience for medical reports, generated
              intelligence, patient-friendly PDF, doctor-ready brief,
              personalized Health Plan, and Follow-Up Intelligence.
            </p>

            <ul>
              <li>Generated report intelligence</li>
              <li>Patient-friendly PDF</li>
              <li>Doctor-ready brief</li>
              <li>Saved intelligence results</li>
              <li>Personalized Health Plan</li>
              <li>Follow-Up Intelligence</li>
            </ul>

            <Link href="/pricing" className="launchPrimary">
              Explore Plus Value
            </Link>
          </article>
        </div>

        <p className="launchPlanNote">
          Payments are not enabled yet. The plans page explains Free and Plus
          value before subscriptions are activated.
        </p>
      </section>

      <section className="launchFinalCta">
        <h2>Start with your first health step.</h2>

        <p>
          Begin with an assessment, upload a report when available, and use
          OrganHeal to organize your next health follow-up.
        </p>

        <div className="launchHeroActions">
          <Link href="/signup" className="launchPrimary">
            Create Free Account
          </Link>

          <Link href="/pricing" className="launchSecondary">
            View Plans
          </Link>

          <Link href="/dashboard" className="launchSecondary">
            Open Dashboard
          </Link>
        </div>

        <small>
          OrganHeal AI is educational and organizational only. It does not
          diagnose, treat, prescribe, provide emergency advice, or replace
          licensed medical care.
        </small>
      </section>
    </main>
  );
}
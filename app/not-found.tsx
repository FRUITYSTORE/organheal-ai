import Link from "next/link";

export default function NotFound() {
  return (
    <main className="ohPageShell">
      <div className="ohContainer ohStack large" style={{ padding: "48px 0 72px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">Page unavailable / الصفحة غير موجودة</p>

              <h1 className="ohTitle">
                This OrganHeal section is not available.
              </h1>

              <p className="ohLead">
                The page may have moved, may still be under development, or the
                link may be incorrect. You can return home, open your dashboard,
                or continue your health journey from one of the main sections.
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/" className="primaryBtn">
                  Back Home
                </Link>

                <Link href="/dashboard" className="secondaryBtn">
                  Open Dashboard
                </Link>

                <Link href="/contact" className="secondaryBtn">
                  Contact Support
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">404</p>
                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    Page not found
                  </h2>
                </div>

                <span className="ohStatusBadge moderate">Unavailable</span>
              </div>

              <p className="ohCardText">
                لا تقلق، يمكنك الرجوع إلى الصفحات الرئيسية ومتابعة استخدام
                OrganHeal بشكل طبيعي.
              </p>

              <div className="ohDivider" />

              <div className="ohTimeline">
                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">Start Assessment</p>
                    <p className="ohTimelineMeta">
                      Begin with an organ health assessment.
                    </p>
                  </div>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">Upload Lab Report</p>
                    <p className="ohTimelineMeta">
                      Organize and understand uploaded medical reports.
                    </p>
                  </div>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">Health Intelligence</p>
                    <p className="ohTimelineMeta">
                      Turn your health data into clear next steps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ohGrid cols3">
          <Link href="/assessment" className="ohCard">
            <p className="ohMetricLabel">Assessment</p>
            <h2 className="ohCardTitle">Start Assessment</h2>
            <p className="ohCardText">
              Check heart, kidney, liver, lung, brain, and metabolic health.
            </p>
          </Link>

          <Link href="/lab-upload" className="ohCard">
            <p className="ohMetricLabel">Reports</p>
            <h2 className="ohCardTitle">Upload Lab Report</h2>
            <p className="ohCardText">
              Upload medical reports and prepare them for health intelligence.
            </p>
          </Link>

          <Link href="/health-plan" className="ohCard">
            <p className="ohMetricLabel">Next Step</p>
            <h2 className="ohCardTitle">Health Plan</h2>
            <p className="ohCardText">
              Continue with a practical action plan based on your health journey.
            </p>
          </Link>
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">🩺</span>
          <div>
            <strong>Medical safety reminder</strong>
            <br />
            OrganHeal provides educational and organizational health intelligence
            only and does not replace licensed medical care.
          </div>
        </section>
      </div>
    </main>
  );
}

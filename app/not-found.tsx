import Link from "next/link";

export default function NotFound() {
  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">Page unavailable</p>
          <h1>This section is not available yet</h1>
          <p>
            This area may still be under development. You can return home,
            open your dashboard, or start a health assessment.
          </p>
        </div>

        <div className="resultBox">
          <p className="sectionLabel">Continue</p>
          <h2>Your OrganHeal journey can continue</h2>

          <div className="homeFinalCTAActions">
            <Link href="/" className="secondaryBtn">
              Home
            </Link>

            <Link href="/dashboard" className="primaryBtn">
              Dashboard
            </Link>

            <Link href="/assessment" className="secondaryBtn">
              Start Assessment
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
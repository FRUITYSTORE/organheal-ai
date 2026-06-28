import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact OrganHeal AI for general platform, support, partnership, or business inquiries.",
};

export default function ContactPage() {
  const email = "contact@organheal.com";

  return (
    <main className="legalPage">
      <section className="legalHero">
        <p className="assistantBadge">CONTACT</p>
        <h1>Contact OrganHeal AI</h1>
        <p>
          For general platform questions, support requests, partnerships, or business inquiries, you can contact the OrganHeal AI team.
        </p>
      </section>

      <section className="legalContent">
        <div className="legalCard">
          <h2>General Contact</h2>
          <p>
            Email: <a href={`mailto:${email}`}>{email}</a>
          </p>
          <p>
            Please do not send emergency medical requests through this contact page.
          </p>
        </div>

        <div className="legalCard">
          <h2>Medical Safety</h2>
          <p>
            OrganHeal AI does not provide emergency medical care, diagnosis, treatment, or prescriptions. For urgent symptoms, contact emergency medical services or visit the nearest emergency department.
          </p>
        </div>

        <div className="legalCard">
          <h2>Useful Links</h2>
          <div className="legalLinkGrid">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Use</Link>
            <Link href="/medical-disclaimer">Medical Disclaimer</Link>
            <Link href="/about">About OrganHeal</Link>
          </div>
        </div>

        <div className="legalActions">
          <Link href="/" className="secondaryBtn">
            Back to Home
          </Link>

          <Link href="/signup" className="primaryBtn">
            Create Account
          </Link>
        </div>
      </section>
    </main>
  );
}

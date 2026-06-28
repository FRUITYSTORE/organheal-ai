import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of Use for OrganHeal AI, including educational use, user responsibilities, and medical limitations.",
};

export default function TermsPage() {
  return (
    <LegalPage
      badge="TERMS OF USE"
      title="Terms of Use"
      intro="These Terms of Use explain the basic rules for using OrganHeal AI and its health intelligence features."
      updated="June 2026"
      sections={[
        {
          title: "1. Educational Purpose",
          body: "OrganHeal AI is designed for educational health intelligence, personal organization, report explanation, and preparation for healthcare discussions. It is not a medical device and does not replace licensed medical care.",
        },
        {
          title: "2. No Medical Diagnosis or Treatment",
          body: "The platform does not diagnose disease, prescribe treatment, recommend emergency care decisions, or replace doctors, nurses, pharmacists, or other licensed healthcare professionals.",
        },
        {
          title: "3. User Account",
          body: "Users are responsible for maintaining the confidentiality of their account credentials and for all activity that occurs under their account.",
        },
        {
          title: "4. Uploaded Information",
          body: "Users should only upload reports, lab results, or health information that they have the right to use. Users are responsible for the accuracy and completeness of the information they provide.",
        },
        {
          title: "5. AI and System Limitations",
          body: "AI-generated summaries may be incomplete, inaccurate, or misinterpreted. Users should verify important health information with licensed healthcare professionals before making health-related decisions.",
        },
        {
          title: "6. Acceptable Use",
          body: "Users may not misuse the platform, attempt unauthorized access, upload harmful content, interfere with security controls, or use OrganHeal AI for unlawful purposes.",
        },
        {
          title: "7. Platform Changes",
          body: "OrganHeal AI may update, modify, suspend, or remove features as the platform develops.",
        },
      ]}
    />
  );
}

import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for OrganHeal AI, including how health information, uploaded reports, and account data may be handled.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      badge="PRIVACY POLICY"
      title="Privacy Policy"
      intro="This Privacy Policy explains how OrganHeal AI may collect, use, protect, and organize information when users interact with the platform."
      updated="June 2026"
      sections={[
        {
          title: "1. Information We May Collect",
          body: [
            "OrganHeal AI may collect account information such as email address, profile details, selected username, and authentication-related information.",
            "The platform may also process health-related inputs provided by the user, including organ assessments, daily check-ins, health history, uploaded medical reports, lab values, and generated health intelligence summaries.",
            "Technical information such as browser type, device information, session data, and basic usage activity may be processed to keep the service secure and functional.",
          ],
        },
        {
          title: "2. How Information Is Used",
          body: [
            "Information is used to provide health assessments, organize uploaded reports, generate educational health intelligence, create patient-friendly summaries, support doctor-ready briefs, and improve the user experience.",
            "OrganHeal AI does not use the platform to provide medical diagnosis, treatment, prescriptions, or emergency medical advice.",
          ],
        },
        {
          title: "3. Health Data",
          body: "Health-related information is sensitive. Users should only upload information they are comfortable storing and processing inside their OrganHeal AI account. Uploaded reports and generated insights are intended for education, organization, and preparation for discussions with licensed healthcare professionals.",
        },
        {
          title: "4. Data Protection",
          body: "OrganHeal AI uses technical safeguards such as authentication, database access controls, and secure production configuration to help protect user information. No online platform can guarantee absolute security.",
        },
        {
          title: "5. Third-Party Services",
          body: "OrganHeal AI may rely on trusted infrastructure and platform providers for hosting, authentication, storage, database services, and document processing. These services help operate the platform securely and reliably.",
        },
        {
          title: "6. User Responsibilities",
          body: "Users are responsible for keeping login credentials secure, reviewing information carefully, avoiding emergency use of the platform, and consulting licensed healthcare professionals for medical decisions.",
        },
        {
          title: "7. Changes to This Policy",
          body: "OrganHeal AI may update this Privacy Policy as the platform grows. Continued use of the platform after updates means the user accepts the updated policy.",
        },
      ]}
    />
  );
}

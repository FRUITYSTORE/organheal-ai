import type { Metadata } from "next";
import PrivacyContent from "./PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for OrganHeal AI, including how health information, uploaded reports, and account data may be handled.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}

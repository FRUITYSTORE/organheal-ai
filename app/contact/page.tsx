import type { Metadata } from "next";
import ContactContent from "./ContactContent";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact OrganHeal AI for general platform, support, partnership, or business inquiries.",
};

export default function ContactPage() {
  return <ContactContent />;
}

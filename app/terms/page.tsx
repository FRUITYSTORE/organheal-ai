import type { Metadata } from "next";
import TermsContent from "./TermsContent";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of Use for OrganHeal AI, including educational use, user responsibilities, and medical limitations.",
};

export default function TermsPage() {
  return <TermsContent />;
}



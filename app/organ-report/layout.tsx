import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Professional Health Report | OrganHeal AI",
  description:
    "Generate a professional educational health intelligence report with organ scores, lab summary, wellness check-ins, and health outlook.",
};

export default function OrganReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
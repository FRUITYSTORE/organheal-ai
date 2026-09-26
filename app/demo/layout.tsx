import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sample Lab Report Explained",
  description:
    "See how OrganHeal explains a blood test in plain language: what each result means, what to ask your doctor, and your health map. No sign-up needed.",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

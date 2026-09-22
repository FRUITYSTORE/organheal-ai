import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask OrganHeal AI",
  description:
    "Ask smarter questions about your health journey. Get plain-language answers about lab results, symptoms, and what to ask your doctor next.",
};

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

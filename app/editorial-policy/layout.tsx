import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editorial & Medical Review Policy",
  description:
    "How OrganHeal AI writes, sources, reviews and corrects its health content, and what it does not do.",
};

export default function EditorialPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Understand My Report",
  description:
    "Turn your report into clear learning steps: simple explanations, related topics, and better questions for your doctor.",
};

export default function LibraryReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

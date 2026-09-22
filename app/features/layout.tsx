import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "A health analysis workspace built around your health journey: upload reports, ask questions in plain language, and track what changes over time.",
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

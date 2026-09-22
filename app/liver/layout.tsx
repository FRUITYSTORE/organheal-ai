import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Liver Health Assessment",
  description:
    "Evaluate liver-related risk factors including ALT, AST, fatty liver history, alcohol exposure, and weight with OrganHeal AI.",
};

export default function LiverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

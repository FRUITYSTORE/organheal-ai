import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirm Email",
  robots: { index: false, follow: false },
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

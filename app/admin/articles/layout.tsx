import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articles",
  robots: { index: false, follow: false },
};

export default function ArticlesAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

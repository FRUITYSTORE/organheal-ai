"use client";

import Link from "next/link";

export default function PageBackActions() {
  return (
    <div className="pageBackActions">
      <Link href="/dashboard" className="secondaryBtn">
        ← Back to Dashboard
      </Link>

      <Link href="/" className="secondaryBtn">
        Home
      </Link>
    </div>
  );
}
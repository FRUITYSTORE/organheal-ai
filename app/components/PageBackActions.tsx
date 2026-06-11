"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PageBackActions() {
  const router = useRouter();

  return (
    <div className="pageBackActions">
      <button className="secondaryBtn" onClick={() => router.back()}>
        ← Back
      </button>

      <Link href="/" className="secondaryBtn">
        Home
      </Link>
    </div>
  );
}
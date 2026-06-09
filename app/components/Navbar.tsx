"use client";

import Image from "next/image";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function Navbar() {
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <nav className="navbar">
      <Link href="/" className="logo">
        <Image
          src="/icon.png"
          alt="OrganHeal logo"
          width={34}
height={34}
          priority
        />

        <span>OrganHeal</span>
      </Link>

      <div className="navLinks">
        <Link href="/">Home</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/assessment">Assessment</Link>
        <Link href="/checkin">Daily Check-In</Link>
        <Link href="/lab-analyzer">Labs</Link>
        <Link href="/lab-upload">PDF Analyzer</Link>
        <Link href="/organ-report">Report</Link>
        <Link href="/history">History</Link>
        <Link href="/profile">Profile</Link>

        <button className="navLogoutBtn" onClick={signOut}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
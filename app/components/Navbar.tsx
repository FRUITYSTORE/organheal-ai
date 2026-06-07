"use client";

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
        <span className="logoIcon">🧠❤️🫁</span>
        <span>OrganHeal AI</span>
      </Link>

      <div className="navLinks">
        <Link href="/">Home</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/assessment">Assessment</Link>
        <Link href="/lab-analyzer">Labs</Link>
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
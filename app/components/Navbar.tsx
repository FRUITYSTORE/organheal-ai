"use client";

import Link from "next/link";
import { supabase } from "../../lib/supabase";

function OrganHealLogo() {
  return (
    <svg
     width={56}
height={56}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OrganHeal logo"
    >
      <defs>
        <linearGradient id="ohGradient" x1="90" y1="380" x2="420" y2="110">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="50%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>

      <path
        d="M126 338 L126 190 L205 116 L282 91 L393 154"
        fill="none"
        stroke="url(#ohGradient)"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M394 354 L302 406 L217 399 L126 338"
        fill="none"
        stroke="url(#ohGradient)"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="393" cy="154" r="18" fill="#3B82F6" />
      <circle cx="126" cy="338" r="18" fill="#22C55E" />
      <circle cx="394" cy="354" r="18" fill="#3B82F6" />

      <text
        x="256"
        y="295"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="120"
        fontWeight="900"
        fill="#0F172A"
      >
        OH
      </text>
    </svg>
  );
}

export default function Navbar() {
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <nav className="navbar">
      <Link href="/" className="logo">
        <OrganHealLogo />
        <div
  style={{
    display: "flex",
    flexDirection: "column",
    lineHeight: "1",
  }}
>
  <span
    style={{
      fontWeight: 800,
      fontSize: "1.35rem",
    }}
  >
    OrganHeal
  </span>

  <span
    style={{
      fontSize: "0.7rem",
      opacity: 0.7,
      letterSpacing: "1px",
    }}
  >
    AI HEALTH INTELLIGENCE
  </span>
</div>
      </Link>

      <div className="navLinks">
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
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
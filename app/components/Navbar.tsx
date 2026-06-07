import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link href="/" className="logo">
        <span className="logoIcon">🧠❤️🫁</span>
        <span>OrganHeal AI</span>
      </Link>

      <div className="navLinks">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/assessment">Assessment</Link>
        <Link href="/lab-analyzer">Labs</Link>
        <Link href="/organ-report">Report</Link>
        <Link href="/history">History</Link>
        <Link href="/profile">Profile</Link>
      </div>
    </nav>
  );
}
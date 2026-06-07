import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link href="/" className="logo">
        <span className="logoIcon">🧠 ❤️ 🫁</span>
        <span>OrganHeal AI</span>
      </Link>

      <div className="navLinks">
        <Link href="/assistant">Assistant</Link>
        <Link href="/assessment">Organ Assessment</Link>
        <Link href="/lab-analyzer">Lab Analyzer</Link>
        <Link href="/library">Library</Link>
        <a href="/dashboard">Dashboard</a>
        <Link href="/organ-report">Report</Link>
        <a href="/history">History</a>
        <Link href="/login">Login</Link>
        <Link href="/signup">Sign Up</Link>
      </div>
    </nav>
  );
}
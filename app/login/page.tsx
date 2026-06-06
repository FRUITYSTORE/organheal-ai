"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");

  async function handleLogin() {
    setMessage("Signing in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Login successful. Redirecting...");
    window.location.href = "/dashboard";
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">USER LOGIN</p>
          <h1>Login to OrganHeal</h1>
          <p>Access your dashboard, organ scores, lab reports, and saved insights.</p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <button className="primaryBtn" onClick={handleLogin}>
              Login
            </button>

            <a href="/signup">
              <button className="secondaryBtn">Create New Account</button>
            </a>

            {message && <p>{message}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
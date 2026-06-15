"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setMessage("");
    setLoading(true);

    const cleanIdentifier = identifier.trim().toLowerCase();
    let loginEmail = cleanIdentifier;

    if (!cleanIdentifier.includes("@")) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .ilike("username", cleanIdentifier)
        .maybeSingle();

      if (profileError) {
        setMessage(profileError.message);
        setLoading(false);
        return;
      }

      if (!profile?.email) {
        setMessage("Username not found. Please check your username or use your email.");
        setLoading(false);
        return;
      }

      loginEmail = profile.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

   if (error) {
  if (error.message === "Invalid login credentials") {
    setMessage(
      "Incorrect email, username, or password. If you forgot your password, use Forgot Password below."
    );
  } else {
    setMessage(error.message);
  }

  setLoading(false);
  return;
}

    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      setMessage("Please confirm your email before signing in.");
      setLoading(false);
      return;
    }

    setMessage("Login successful. Redirecting...");
    window.location.href = "/dashboard";
  }

  async function handleResendVerification() {
    setMessage("");

    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier.includes("@")) {
      setMessage("Please enter your email address to resend verification.");
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: cleanIdentifier,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Verification email sent. Please check your inbox or spam folder.");
  }

  async function handleForgotPassword() {
    setMessage("");

    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier.includes("@")) {
      setMessage("Please enter your email address to reset your password.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanIdentifier, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password reset email sent. Please check your inbox or spam folder.");
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">USER LOGIN</p>
          <h1>Login to OrganHeal</h1>
          <p>
            Access your dashboard, organ scores, lab reports, and saved insights.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>Email or Username</label>
              <input
                type="text"
                placeholder="Enter your email or username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
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

            <button
              className="primaryBtn"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Login"}
            </button>
<button
  type="button"
  className="secondaryBtn"
  onClick={handleForgotPassword}
>
  Forgot Password?
</button>

            <button
              type="button"
              className="secondaryBtn"
              onClick={handleResendVerification}
            >
              Resend Verification Email
            </button>

            <Link href="/signup" className="secondaryBtn">
              Create New Account
            </Link>

            {message && <p>{message}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
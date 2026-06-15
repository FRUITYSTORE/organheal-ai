"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import "./signup.css";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrong =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password);

  const strengthScore =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);

  const strengthText =
    strengthScore === 0
      ? ""
      : strengthScore === 1
      ? "Weak"
      : strengthScore === 2
      ? "Fair"
      : strengthScore === 3
      ? "Good"
      : "Strong";

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanConfirmEmail = confirmEmail.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    if (cleanEmail !== cleanConfirmEmail) {
      setMessage("Emails do not match.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!passwordStrong) {
      setMessage(
        "Password must be at least 8 characters and include uppercase, lowercase, and a number."
      );
      return;
    }

    if (!terms) {
      setMessage("You must agree to the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);

    const { data: existingEmail, error: emailCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (emailCheckError) {
      setMessage(emailCheckError.message);
      setLoading(false);
      return;
    }

    if (existingEmail) {
      setMessage("This email is already registered. Please sign in instead.");
      setLoading(false);
      return;
    }

    const { data: existingUsername, error: usernameCheckError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", cleanUsername)
      .maybeSingle();

    if (usernameCheckError) {
      setMessage(usernameCheckError.message);
      setLoading(false);
      return;
    }

    if (existingUsername) {
      setMessage("This username is already taken.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
        },
      },
    });

if (error) {
  setMessage(error.message);
  setLoading(false);
  return;
}

setMessage(
  "Account created. If email confirmation is enabled, a verification email has been sent. Please check your inbox or spam folder."
);
setLoading(false);
  }

  return (
    <main className="signupPage">
      <section className="signupCard">
        <Link href="/" className="closeBtn">
          ×
        </Link>

        <p className="signupLabel">JOIN ORGANHEAL</p>
        <h1>REGISTER</h1>
        <p className="subtitle">Create your health intelligence account</p>
        <p className="trustLine">Secure • Private • AI-Powered</p>

        <form onSubmit={handleSignup} className="signupForm">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Confirm email address"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="passwordStrength">
            <span>Password strength:</span>

            <div className="strengthBoxes">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={
                    level <= strengthScore
                      ? "strengthBox active"
                      : "strengthBox"
                  }
                />
              ))}
            </div>

            <span className="strengthLabel">{strengthText}</span>
          </div>

          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <label className="terms">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <span>Terms & Privacy Policy</span>
          </label>

          {message && <p className="signupMessage">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>

          <Link href="/login" className="signinLink">
            Already have an account? Sign in
          </Link>
        </form>
      </section>
    </main>
  );
}
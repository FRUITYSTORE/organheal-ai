"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");

  async function handleSignup() {
    setMessage("Creating account...");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    const userId = data.user?.id;

    if (userId) {
      await supabase.from("profiles").insert({
        id: userId,
        email,
        full_name: fullName,
      });
    }

    setMessage("Account created. Please check your email to confirm your account.");
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">CREATE ACCOUNT</p>
          <h1>Create Your OrganHeal Account</h1>
          <p>
            Save your organ assessments, lab insights, and personal health
            intelligence reports.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>

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
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <button className="primaryBtn" onClick={handleSignup}>
              Create Account
            </button>

            <a href="/login">
              <button className="secondaryBtn">Already Have an Account?</button>
            </a>

            {message && <p>{message}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
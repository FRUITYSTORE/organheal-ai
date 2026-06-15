"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Checking reset link...");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function prepareResetSession() {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);

      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage(error.message);
          return;
        }

        setReady(true);
        setMessage("");
        return;
      }

      if (hash.includes("access_token")) {
        setReady(true);
        setMessage("");
        return;
      }

      setMessage("Invalid or expired reset link. Please request a new password reset email.");
    }

    prepareResetSession();
  }, []);

  const passwordStrong =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /\d/.test(newPassword);

  async function handleUpdatePassword() {
    setMessage("");

    if (!ready) {
      setMessage("Reset session is not ready. Please open the reset link again.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!passwordStrong) {
      setMessage(
        "Password must be at least 8 characters and include uppercase, lowercase, and a number."
      );
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated successfully. Redirecting to login...");

    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">PASSWORD RESET</p>
          <h1>Create a New Password</h1>
          <p>Enter a new secure password for your OrganHeal account.</p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={!ready}
              />
            </div>

            <div className="formGroup">
              <label>Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={!ready}
              />
            </div>

            <button
              className="primaryBtn"
              onClick={handleUpdatePassword}
              disabled={loading || !ready}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>

            {message && <p>{message}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
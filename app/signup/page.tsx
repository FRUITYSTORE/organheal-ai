"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (!password) return { label: "", level: 0 };
  if (score <= 2) return { label: "Weak", level: 1 };
  if (score <= 4) return { label: "Good", level: 2 };
  return { label: "Strong", level: 3 };
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!email.trim()) errors.email = "Email is required.";
    else if (!email.includes("@")) errors.email = "Enter a valid email.";

    if (!confirmEmail.trim()) errors.confirmEmail = "Confirm your email.";
    else if (email !== confirmEmail)
      errors.confirmEmail = "Emails do not match.";

    if (!username.trim()) errors.username = "Username is required.";
    else if (!/^[a-zA-Z0-9_]{4,20}$/.test(username))
      errors.username =
        "Username must be 4-20 characters, letters, numbers, or underscore only.";

    if (!password) errors.password = "Password is required.";
    else if (password.length < 8)
      errors.password = "Password must be at least 8 characters.";
    else if (passwordStrength.level < 2)
      errors.password =
        "Use uppercase, lowercase, numbers, and a symbol.";

    if (!confirmPassword) errors.confirmPassword = "Confirm your password.";
    else if (password !== confirmPassword)
      errors.confirmPassword = "Passwords do not match.";

    if (!acceptedTerms)
      errors.terms = "You must accept the terms and privacy policy.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSignup() {
    setMessage("");

    if (!validateForm()) {
      setMessage("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    setMessage("Creating your secure OrganHeal account...");

    const cleanUsername = username.trim().toLowerCase();

    const { data: existingUsername } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (existingUsername) {
      setFieldErrors({ username: "This username is already taken." });
      setMessage("Please choose another username.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    if (userId) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        email,
        username: cleanUsername,
      });

      if (profileError) {
        setMessage("Account created, but profile could not be saved.");
        setLoading(false);
        return;
      }
    }

    setMessage(
      "Account created. Please check your email and confirm your OrganHeal account before signing in."
    );

    setLoading(false);
  }

  function inputClass(field: string) {
    return fieldErrors[field] ? "inputError" : "";
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">JOIN ORGANHEAL</p>
          <h1>Create your health intelligence account</h1>
          <p>
            Register once, confirm your email, and start building your secure
            OrganHeal health profile.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <p className="sectionLabel">Account Details</p>

            <div className="formGroup">
              <label>Email Address</label>
              <input
                className={inputClass("email")}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldErrors.email && <small>{fieldErrors.email}</small>}
            </div>

            <div className="formGroup">
              <label>Confirm Email</label>
              <input
                className={inputClass("confirmEmail")}
                type="email"
                placeholder="Re-enter your email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />
              {fieldErrors.confirmEmail && (
                <small>{fieldErrors.confirmEmail}</small>
              )}
            </div>

            <div className="formGroup">
              <label>Username</label>
              <input
                className={inputClass("username")}
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              {fieldErrors.username && <small>{fieldErrors.username}</small>}
            </div>

            <div className="formGroup">
              <label>Password</label>
              <input
                className={inputClass("password")}
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {passwordStrength.label && (
                <small>
                  Password strength: <strong>{passwordStrength.label}</strong>
                </small>
              )}

              {fieldErrors.password && <small>{fieldErrors.password}</small>}
            </div>

            <div className="formGroup">
              <label>Confirm Password</label>
              <input
                className={inputClass("confirmPassword")}
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {fieldErrors.confirmPassword && (
                <small>{fieldErrors.confirmPassword}</small>
              )}
            </div>

            <label style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span>
                I agree to the Terms and Privacy Policy.
              </span>
            </label>

            {fieldErrors.terms && <small>{fieldErrors.terms}</small>}

            <button
              className="primaryBtn"
              onClick={handleSignup}
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Register"}
            </button>

            <Link href="/login" className="secondaryBtn">
              Already have an account? Sign in
            </Link>

            {message && (
              <div className="resultBox">
                <p>{message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
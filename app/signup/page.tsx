"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

const countries = [
  "United Arab Emirates",
  "Jordan",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Egypt",
  "Lebanon",
  "Syria",
  "Iraq",
  "Palestine",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Turkey",
  "India",
  "Pakistan",
  "Philippines",
  "Other",
];

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

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

  const [country, setCountry] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [ageRange, setAgeRange] = useState("");

  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = "Email is required.";
    }

    if (email && !email.includes("@")) {
      errors.email = "Enter a valid email address.";
    }

    if (!confirmEmail.trim()) {
      errors.confirmEmail = "Please confirm your email.";
    }

    if (email.trim() && confirmEmail.trim() && email !== confirmEmail) {
      errors.confirmEmail = "Email addresses do not match.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    if (password && password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (password && passwordStrength.level < 2) {
      errors.password =
        "Use a stronger password with uppercase, lowercase, numbers, and a symbol.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    }

    if (password && confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (!firstName.trim()) {
      errors.firstName = "First name is required.";
    }

    if (!lastName.trim()) {
      errors.lastName = "Last name is required.";
    }

    if (!country) {
      errors.country = "Please select your country.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSignup() {
    setMessage("");

    if (!validateForm()) {
      setMessage("Please fix the highlighted fields before creating your account.");
      return;
    }

    setLoading(true);
    setMessage("Creating your OrganHeal account...");

    const fullName = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(" ");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName,
          middle_name: middleName || null,
          last_name: lastName,
          country,
          phone_number: phoneNumber || null,
          age_range: ageRange || null,
        },
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
        full_name: fullName,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        country,
        phone_number: phoneNumber || null,
        age_range: ageRange || null,
      });

      if (profileError) {
        setMessage(
          "Account created, but profile details could not be saved: " +
            profileError.message
        );
        setLoading(false);
        return;
      }
    }

    setMessage(
      "Account created. Please check your email to confirm your OrganHeal account."
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
          <p className="assistantBadge">CREATE ACCOUNT</p>
          <h1>Create Your OrganHeal Account</h1>
          <p>
            Build your personal health profile, save medical reports, and
            access your Health Intelligence Center securely.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <p className="sectionLabel">Account Access</p>

            <div className="formGroup">
              <label>Email</label>
              <input
                className={inputClass("email")}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                onChange={(event) => setConfirmEmail(event.target.value)}
              />
              {fieldErrors.confirmEmail && (
                <small>{fieldErrors.confirmEmail}</small>
              )}
            </div>

            <div className="formGroup">
              <label>Password</label>
              <input
                className={inputClass("password")}
                type="password"
                placeholder="Use letters, numbers, and a symbol"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              {fieldErrors.confirmPassword && (
                <small>{fieldErrors.confirmPassword}</small>
              )}
            </div>

            <p className="sectionLabel">Personal Profile</p>

            <div className="formGroup">
              <label>First Name</label>
              <input
                className={inputClass("firstName")}
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
              {fieldErrors.firstName && <small>{fieldErrors.firstName}</small>}
            </div>

            <div className="formGroup">
              <label>Middle Name</label>
              <input
                type="text"
                placeholder="Middle name optional"
                value={middleName}
                onChange={(event) => setMiddleName(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Last Name</label>
              <input
                className={inputClass("lastName")}
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
              {fieldErrors.lastName && <small>{fieldErrors.lastName}</small>}
            </div>

            <div className="formGroup">
              <label>Country</label>
              <select
                className={inputClass("country")}
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                <option value="">Select your country</option>
                {countries.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              {fieldErrors.country && <small>{fieldErrors.country}</small>}
            </div>

            <p className="sectionLabel">Optional Details</p>

            <div className="formGroup">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="Optional phone number"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Age Range</label>
              <select
                value={ageRange}
                onChange={(event) => setAgeRange(event.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="under_18">Under 18</option>
                <option value="18_24">18 - 24</option>
                <option value="25_34">25 - 34</option>
                <option value="35_44">35 - 44</option>
                <option value="45_54">45 - 54</option>
                <option value="55_64">55 - 64</option>
                <option value="65_plus">65+</option>
              </select>
            </div>

            <div className="trustBox">
              <p className="sectionLabel">Privacy Notice</p>
              <p>
                Optional details help OrganHeal personalize future health
                intelligence. OrganHeal is educational and does not replace
                licensed medical diagnosis or care.
              </p>
            </div>

            <button
              className="primaryBtn"
              onClick={handleSignup}
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <Link href="/login" className="secondaryBtn">
              Already Have an Account?
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
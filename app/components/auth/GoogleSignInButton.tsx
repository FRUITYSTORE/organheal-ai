"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";

import "./google-auth.css";

// Only shown once the Google provider is switched on in Supabase, so a visitor
// never meets a button that cannot work.
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export default function GoogleSignInButton({ isArabic }: { isArabic: boolean }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!GOOGLE_ENABLED) {
    return null;
  }

  async function start() {
    setBusy(true);
    setFailed(false);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/continue` },
    });

    if (error) {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <div className="googleAuth">
      <button type="button" className="googleAuthButton" onClick={() => void start()} disabled={busy}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5Z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5Z" />
          <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7L2.4 13.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1Z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48Z" />
        </svg>
        <span>{isArabic ? "المتابعة عبر Google" : "Continue with Google"}</span>
      </button>

      {failed && (
        <p className="googleAuthError" role="alert">
          {isArabic
            ? "تعذّر الدخول عبر Google الآن. جرّب البريد وكلمة المرور."
            : "Google sign-in is unavailable right now. Please use email and password."}
        </p>
      )}

      <p className="googleAuthOr">
        <span>{isArabic ? "أو بالبريد الإلكتروني" : "or with email"}</span>
      </p>
    </div>
  );
}

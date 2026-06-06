"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    }

    getUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">USER DASHBOARD</p>
          <h1>Welcome to OrganHeal AI</h1>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">

            <h2>User Information</h2>

            <p>
              <strong>Email:</strong>{" "}
              {user?.email || "Loading..."}
            </p>

            <p>
              <strong>User ID:</strong>{" "}
              {user?.id || "Loading..."}
            </p>

            <br />

            <button
              className="primaryBtn"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>
        </div>
      </div>
    </main>
  );
}
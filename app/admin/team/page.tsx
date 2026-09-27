"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

import { useAdminLanguage } from "../use-admin-language";

import "../videos/admin-videos.css";

type Member = { id: string; email: string; createdAt: string };

export default function AdminTeamPage() {
  const { isArabic, language, text } = useAdminLanguage();
  const [admins, setAdmins] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const authorizedFetch = useCallback(async (input: string, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("signin");
    }

    return fetch(input, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await authorizedFetch("/api/admin/team");
      const body = await response.json();

      if (!response.ok) {
        setMessage({
          kind: "error",
          text:
            response.status === 403
              ? language === "ar"
                ? "هذا الحساب ليس لديه صلاحية المسؤول."
                : "This account does not have administrator access."
              : body.error || "Unable to load the team.",
        });
        return;
      }

      setAdmins(body.admins ?? []);
      setCurrentUserId(body.currentUserId ?? "");
    } catch {
      setMessage({
        kind: "error",
        text:
          language === "ar"
            ? "يرجى تسجيل الدخول بحساب المسؤول."
            : "Please sign in with the administrator account.",
      });
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, language]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function grant(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await authorizedFetch("/api/admin/team", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const body = await response.json();

      if (!response.ok) {
        setMessage({ kind: "error", text: body.error || text("Unable to save.", "تعذر الحفظ.") });
        return;
      }

      setMessage({
        kind: "ok",
        text: body.alreadyAdmin
          ? text("This person is already an administrator.", "هذا الشخص مسؤول بالفعل.")
          : text("Administrator access granted.", "تم منح صلاحية المسؤول."),
      });
      setEmail("");
      await load();
    } catch {
      setMessage({ kind: "error", text: text("Unable to save.", "تعذر الحفظ.") });
    } finally {
      setSaving(false);
    }
  }

  async function revoke(member: Member) {
    if (
      !window.confirm(
        text(
          `Remove administrator access for ${member.email}?`,
          `إزالة صلاحية المسؤول عن ${member.email}؟`
        )
      )
    ) {
      return;
    }

    const response = await authorizedFetch(`/api/admin/team?id=${member.id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));

    setMessage(
      response.ok
        ? { kind: "ok", text: text("Access removed.", "تمت إزالة الصلاحية.") }
        : { kind: "error", text: body.error || text("Unable to remove.", "تعذرت الإزالة.") }
    );
    await load();
  }

  return (
    <main className="ohPageShell adminVideos" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <header>
        <p className="ohEyebrow">{text("Administrator", "المسؤول")}</p>
        <h1>{text("Team access", "صلاحيات الفريق")}</h1>
        <p>
          {text(
            "Administrators can edit the homepage notes and videos, see reports, and manage this list. Only add people you trust. The person must already have an OrganHeal account.",
            "يستطيع المسؤولون تعديل ملاحظات الصفحة الرئيسية والفيديوهات، والاطلاع على التقارير، وإدارة هذه القائمة. أضف من تثق بهم فقط. ويجب أن يكون لدى الشخص حساب في OrganHeal."
          )}
        </p>
        <Link href="/admin">{text("Back to site management", "العودة إلى إدارة الموقع")}</Link>
      </header>

      <form className="adminVideosForm" onSubmit={grant}>
        <label>
          {text("Email of the account to promote", "بريد الحساب المراد ترقيته")}
          <input
            required
            type="email"
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
          />
        </label>

        <div className="adminVideosActions">
          <button type="submit" disabled={saving}>
            {saving ? text("Saving…", "جارٍ الحفظ…") : text("Grant access", "منح الصلاحية")}
          </button>
        </div>

        {message && (
          <p className="adminVideosMessage" data-kind={message.kind} role="status">
            {message.text}
          </p>
        )}
      </form>

      <section className="adminVideosList" aria-label={text("Administrators", "المسؤولون")}>
        <h2>
          {text("Administrators", "المسؤولون")} ({admins.length})
        </h2>
        {loading && <p>{text("Loading…", "جارٍ التحميل…")}</p>}
        <ul>
          {admins.map((member) => (
            <li key={member.id}>
              <div>
                <strong dir="ltr">{member.email}</strong>
                {member.id === currentUserId && <span>{text("You", "أنت")}</span>}
              </div>
              {member.id !== currentUserId && (
                <div className="adminVideosRowActions">
                  <button type="button" onClick={() => void revoke(member)}>
                    {text("Remove access", "إزالة الصلاحية")}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

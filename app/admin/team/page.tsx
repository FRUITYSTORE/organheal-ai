"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import {
  STAFF_PERMISSIONS,
  STAFF_PERMISSION_LABELS,
  type StaffPermission,
} from "@/lib/staff-permissions";

import { useAdminLanguage } from "../use-admin-language";

import "../videos/admin-videos.css";

type Role = "admin" | "moderator";

type Member = {
  id: string;
  email: string;
  role: Role | null;
  permissions: StaffPermission[];
  createdAt: string;
};

type FormState = {
  id: string | null;
  email: string;
  role: Role;
  permissions: StaffPermission[];
};

const EMPTY_FORM: FormState = {
  id: null,
  email: "",
  role: "moderator",
  permissions: [],
};

export default function AdminTeamPage() {
  const { isArabic, language, text } = useAdminLanguage();
  const [staff, setStaff] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
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
                ? "هذه الصفحة للمسؤولين فقط."
                : "This page is for administrators only."
              : body.error || "Unable to load the team.",
        });
        return;
      }

      setStaff(body.staff ?? []);
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

  function togglePermission(permission: StaffPermission) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await authorizedFetch("/api/admin/team", {
        method: form.id ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      const body = await response.json();

      if (!response.ok) {
        setMessage({ kind: "error", text: body.error || text("Unable to save.", "تعذر الحفظ.") });
        return;
      }

      setMessage({ kind: "ok", text: text("Access saved.", "تم حفظ الصلاحية.") });
      setForm(EMPTY_FORM);
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
        text(`Remove all access for ${member.email}?`, `إزالة كل صلاحيات ${member.email}؟`)
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

  const permissionLabel = (permission: StaffPermission) =>
    isArabic ? STAFF_PERMISSION_LABELS[permission].ar : STAFF_PERMISSION_LABELS[permission].en;

  return (
    <main className="ohPageShell adminVideos" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <header>
        <p className="ohEyebrow">{text("Administrator", "المسؤول")}</p>
        <h1>{text("Team access", "صلاحيات الفريق")}</h1>
        <p>
          {text(
            "Give a colleague access to exactly the areas you choose. A moderator can only use the areas ticked for them. An administrator can do everything, including this page. The person must already have an OrganHeal account.",
            "امنح زميلاً صلاحية الوصول إلى الأقسام التي تحددها أنت فقط. المشرف يستطيع استخدام الأقسام المحددة له فقط، أما المسؤول فيستطيع كل شيء بما فيه هذه الصفحة. ويجب أن يكون لدى الشخص حساب في OrganHeal."
          )}
        </p>
        <p>
          {text(
            "Members' uploaded lab reports stay visible to administrators only, because they are private health data.",
            "تقارير التحاليل التي يرفعها الأعضاء تبقى للمسؤولين فقط لأنها بيانات صحية خاصة."
          )}
        </p>
        <Link href="/admin">{text("Back to site management", "العودة إلى إدارة الموقع")}</Link>
      </header>

      <form className="adminVideosForm" onSubmit={save}>
        <label>
          {text("Email of the account", "بريد الحساب")}
          <input
            required
            type="email"
            dir="ltr"
            disabled={form.id !== null}
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="name@example.com"
          />
        </label>

        <label>
          {text("Role", "الدور")}
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
          >
            <option value="moderator">{text("Moderator (chosen areas only)", "مشرف (أقسام محددة فقط)")}</option>
            <option value="admin">{text("Administrator (everything)", "مسؤول (كل شيء)")}</option>
          </select>
        </label>

        {form.role === "moderator" && (
          <fieldset className="adminTeamAreas">
            <legend>{text("Areas this moderator may manage", "الأقسام التي يستطيع المشرف إدارتها")}</legend>
            {STAFF_PERMISSIONS.map((permission) => (
              <label key={permission} className="adminVideosCheck">
                <input
                  type="checkbox"
                  checked={form.permissions.includes(permission)}
                  onChange={() => togglePermission(permission)}
                />
                {permissionLabel(permission)}
              </label>
            ))}
          </fieldset>
        )}

        <div className="adminVideosActions">
          <button type="submit" disabled={saving}>
            {saving ? text("Saving…", "جارٍ الحفظ…") : form.id ? text("Save changes", "حفظ التعديلات") : text("Give access", "منح الصلاحية")}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(EMPTY_FORM)}>
              {text("Cancel edit", "إلغاء التعديل")}
            </button>
          )}
        </div>

        {message && (
          <p className="adminVideosMessage" data-kind={message.kind} role="status">
            {message.text}
          </p>
        )}
      </form>

      <section className="adminVideosList" aria-label={text("Team", "الفريق")}>
        <h2>
          {text("Team", "الفريق")} ({staff.length})
        </h2>
        {loading && <p>{text("Loading…", "جارٍ التحميل…")}</p>}
        <ul>
          {staff.map((member) => (
            <li key={member.id}>
              <div>
                <strong dir="ltr">{member.email}</strong>
                <span>
                  {member.id === currentUserId ? `${text("You", "أنت")} · ` : ""}
                  {member.role === "admin"
                    ? text("Administrator", "مسؤول")
                    : `${text("Moderator", "مشرف")}: ${
                        member.permissions.map(permissionLabel).join(isArabic ? "، " : ", ") ||
                        text("no areas", "بلا أقسام")
                      }`}
                </span>
              </div>
              {member.id !== currentUserId && (
                <div className="adminVideosRowActions">
                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        id: member.id,
                        email: member.email,
                        role: member.role ?? "moderator",
                        permissions: member.permissions,
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    {text("Edit", "تعديل")}
                  </button>
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

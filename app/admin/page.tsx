"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import {
  getStaffPermissions,
  isSiteAdmin,
  type StaffPermission,
} from "@/lib/staff-permissions";

import { useAdminLanguage } from "./use-admin-language";

import "./admin-hub.css";

type Access = "checking" | "staff" | "member" | "visitor";

export default function AdminHubPage() {
  const { isArabic, language, text } = useAdminLanguage();
  const [access, setAccess] = useState<Access>("checking");
  const [admin, setAdmin] = useState(false);
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;

      const granted = getStaffPermissions(data.user);

      setAdmin(isSiteAdmin(data.user));
      setPermissions(granted);
      setAccess(!data.user ? "visitor" : granted.length > 0 ? "staff" : "member");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const tools = [
    {
      href: "/admin/announcements",
      permission: "announcements" as StaffPermission | null,
      title: text("Homepage health notes", "ملاحظات صحية للصفحة الرئيسية"),
      body: text(
        "Write your own health tips. They appear on the homepage and in the moving top bar.",
        "اكتب نصائحك الصحية بنفسك. تظهر في الصفحة الرئيسية وفي الشريط العلوي المتحرك."
      ),
    },
    {
      href: "/admin/videos",
      permission: "videos" as StaffPermission | null,
      title: text("Health videos", "الفيديوهات الصحية"),
      body: text(
        "Add trusted videos to the Watch & understand section and to chat suggestions.",
        "أضف فيديوهات موثوقة إلى قسم شاهد وافهم وإلى اقتراحات الدردشة."
      ),
    },
    {
      href: "/admin/articles",
      permission: "articles" as StaffPermission | null,
      title: text("Articles", "المقالات"),
      body: text(
        "Write and publish health articles in English and Arabic.",
        "اكتب المقالات الصحية وانشرها بالعربية والإنجليزية."
      ),
    },
    {
      href: "/admin/reports",
      permission: null,
      title: text("Reports", "التقارير"),
      body: text(
        "Review uploaded lab reports and their processing status.",
        "راجع تقارير التحاليل المرفوعة وحالة معالجتها."
      ),
    },
    {
      href: "/admin/studio-video",
      permission: null,
      title: text("Video studio (pilot)", "مصنع الفيديو (تجريبي)"),
      body: text(
        "Generate one real rendered video from a topic to judge quality and cost before it reaches members.",
        "أنشئ فيديو حقيقيًا واحدًا من موضوع لتقييم الجودة والتكلفة قبل إتاحته للأعضاء."
      ),
    },
    {
      href: "/admin/team",
      permission: null,
      title: text("Team access", "صلاحيات الفريق"),
      body: text(
        "Give trusted colleagues administrator access, or remove it.",
        "امنح زملاءك الموثوقين صلاحية الإدارة، أو أزلها."
      ),
    },
  ];

  // Reports and team access are administrator-only; the rest follow the
  // areas an administrator has ticked for a moderator.
  const visibleTools = tools.filter((tool) =>
    tool.permission === null ? admin : permissions.includes(tool.permission)
  );

  return (
    <main className="ohPageShell adminHub" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <header>
        <p className="ohEyebrow">{text("Administrator", "المسؤول")}</p>
        <h1>{text("Site management", "إدارة الموقع")}</h1>
        <p>
          {text(
            "Everything you can manage on OrganHeal, in one place.",
            "كل ما يمكنك إدارته في OrganHeal في مكان واحد."
          )}
        </p>
      </header>

      {access === "checking" && <p className="adminHubNote">{text("Checking access…", "جارٍ التحقق من الصلاحية…")}</p>}

      {access === "visitor" && (
        <p className="adminHubNote">
          {text("Please sign in with the administrator account.", "يرجى تسجيل الدخول بحساب المسؤول.")}{" "}
          <Link href="/login">{text("Sign in", "تسجيل الدخول")}</Link>
        </p>
      )}

      {access === "member" && (
        <p className="adminHubNote">
          {text(
            "This account does not have administrator access.",
            "هذا الحساب ليس لديه صلاحية المسؤول."
          )}
        </p>
      )}

      {access === "staff" && (
        <div className="adminHubGrid">
          {visibleTools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="adminHubCard">
              <strong>{tool.title}</strong>
              <span>{tool.body}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

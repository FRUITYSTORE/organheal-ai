"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

import { useAdminLanguage } from "./use-admin-language";

import "./admin-hub.css";

type Access = "checking" | "admin" | "member" | "visitor";

export default function AdminHubPage() {
  const { isArabic, language, text } = useAdminLanguage();
  const [access, setAccess] = useState<Access>("checking");

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;

      setAccess(
        !data.user
          ? "visitor"
          : data.user.app_metadata?.organheal_role === "admin"
            ? "admin"
            : "member"
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const tools = [
    {
      href: "/admin/announcements",
      title: text("Homepage health notes", "ملاحظات صحية للصفحة الرئيسية"),
      body: text(
        "Write your own health tips. They appear on the homepage and in the moving top bar.",
        "اكتب نصائحك الصحية بنفسك. تظهر في الصفحة الرئيسية وفي الشريط العلوي المتحرك."
      ),
    },
    {
      href: "/admin/videos",
      title: text("Health videos", "الفيديوهات الصحية"),
      body: text(
        "Add trusted videos to the Watch & understand section and to chat suggestions.",
        "أضف فيديوهات موثوقة إلى قسم شاهد وافهم وإلى اقتراحات الدردشة."
      ),
    },
    {
      href: "/admin/reports",
      title: text("Reports", "التقارير"),
      body: text(
        "Review uploaded lab reports and their processing status.",
        "راجع تقارير التحاليل المرفوعة وحالة معالجتها."
      ),
    },
    {
      href: "/admin/team",
      title: text("Team access", "صلاحيات الفريق"),
      body: text(
        "Give trusted colleagues administrator access, or remove it.",
        "امنح زملاءك الموثوقين صلاحية الإدارة، أو أزلها."
      ),
    },
  ];

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

      {access === "admin" && (
        <div className="adminHubGrid">
          {tools.map((tool) => (
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

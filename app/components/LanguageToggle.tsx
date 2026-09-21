"use client";

import { useEffect, useState } from "react";

import NavIcon from "./navigation/NavIcons";

type Language = "en" | "ar";

type LanguageToggleProps = {
  variant?: "compact" | "row";
};

function readLanguage(): Language {
  return (
    (localStorage.getItem("organheal-language") as Language | null) || "en"
  );
}

export default function LanguageToggle({
  variant = "compact",
}: LanguageToggleProps) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    function syncLanguage() {
      const savedLanguage = readLanguage();

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  function toggleLanguage() {
    const nextLanguage: Language = language === "en" ? "ar" : "en";

    setLanguage(nextLanguage);
    localStorage.setItem("organheal-language", nextLanguage);

    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";

    window.dispatchEvent(new Event("organheal-language-change"));
  }

  const targetLabel = language === "en" ? "العربية" : "English";
  const ariaLabel =
    language === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية";

  if (variant === "row") {
    return (
      <button
        type="button"
        className="ohLangRow"
        onClick={toggleLanguage}
        aria-label={ariaLabel}
      >
        <span className="ohNavRowIcon">
          <NavIcon name="globe" size={24} />
        </span>
        <span className="ohLangRowLabel">{targetLabel}</span>
        <NavIcon name="chevron" size={18} className="ohNavDirectional" />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="ohLangCompact"
      onClick={toggleLanguage}
      aria-label={ariaLabel}
    >
      <NavIcon name="globe" size={18} />
      <span>{targetLabel}</span>
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";

export default function LanguageToggle() {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("organheal-language") || "en";
    setLanguage(savedLanguage);
    document.documentElement.lang = savedLanguage;
    document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
  }, []);

  function toggleLanguage() {
    const nextLanguage = language === "en" ? "ar" : "en";

    setLanguage(nextLanguage);
    localStorage.setItem("organheal-language", nextLanguage);

    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";
  }

  return (
    <button className="languageToggleBtn" onClick={toggleLanguage}>
      {language === "en" ? "العربية" : "English"}
    </button>
  );
}
import type { CSSProperties } from "react";

type ArabicSafeTextProps = {
  text?: string | null;
  fallback?: string;
  as?: "p" | "span" | "div";
  className?: string;
  style?: CSSProperties;
};

function hasArabicText(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

export default function ArabicSafeText({
  text,
  fallback = "N/A",
  as = "p",
  className,
  style,
}: ArabicSafeTextProps) {
  const safeText =
    typeof text === "string" && text.trim().length > 0 ? text : fallback;

  const isArabic = hasArabicText(safeText);

  const sharedStyle: CSSProperties = {
    whiteSpace: "pre-line",
    unicodeBidi: "plaintext",
    direction: isArabic ? "rtl" : "ltr",
    textAlign: isArabic ? "right" : "left",
    lineHeight: 1.7,
    ...style,
  };

  const props = {
    dir: isArabic ? "rtl" : "ltr",
    lang: isArabic ? "ar" : "en",
    className,
    style: sharedStyle,
  };

  if (as === "span") {
    return <span {...props}>{safeText}</span>;
  }

  if (as === "div") {
    return <div {...props}>{safeText}</div>;
  }

  return <p {...props}>{safeText}</p>;
}



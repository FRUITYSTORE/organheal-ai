import type {
  CSSProperties,
} from "react";

import {
  presentIntelligenceClinicalText,
} from "@/lib/services/intelligence/intelligence-presentation";

type ArabicSafeTextProps = {
  text?:
    | string
    | null;

  isArabic:
    boolean;

  fallbackAr?:
    string;

  fallbackEn?:
    string;

  as?:
    | "p"
    | "span"
    | "div";

  className?:
    string;

  style?:
    CSSProperties;
};

export default function ArabicSafeText({
  text,
  isArabic,
  fallbackAr =
    "المحتوى العربي غير متاح لهذا السجل.",
  fallbackEn =
    "N/A",
  as = "p",
  className,
  style,
}: ArabicSafeTextProps) {
  const safeText =
    presentIntelligenceClinicalText(
      text,
      isArabic
        ? "ar"
        : "en",
      fallbackAr,
      fallbackEn
    );

  const sharedStyle:
    CSSProperties = {
      whiteSpace:
        "pre-line",

      unicodeBidi:
        "plaintext",

      direction:
        isArabic
          ? "rtl"
          : "ltr",

      textAlign:
        isArabic
          ? "right"
          : "left",

      lineHeight:
        1.7,

      ...style,
    };

  const props = {
    dir:
      isArabic
        ? "rtl"
        : "ltr",

    lang:
      isArabic
        ? "ar"
        : "en",

    className,
    style:
      sharedStyle,
  };

  if (
    as === "span"
  ) {
    return (
      <span {...props}>
        {safeText}
      </span>
    );
  }

  if (
    as === "div"
  ) {
    return (
      <div {...props}>
        {safeText}
      </div>
    );
  }

  return (
    <p {...props}>
      {safeText}
    </p>
  );
}
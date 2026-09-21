"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import NavIcon, { type NavIconName } from "../navigation/NavIcons";
import {
  DEFAULT_THEME_PREFERENCE,
  type ThemePreference,
} from "./theme-init-script";
import {
  applyTheme,
  readThemePreference,
  saveThemePreference,
  subscribeToThemePreference,
} from "./theme-store";

type ThemeToggleProps = {
  isArabic: boolean;
  variant: "menu" | "segmented";
};

const OPTIONS: {
  value: ThemePreference;
  icon: NavIconName;
  en: string;
  ar: string;
}[] = [
  { value: "light", icon: "sun", en: "Light", ar: "فاتح" },
  { value: "dark", icon: "moon", en: "Dark", ar: "داكن" },
  { value: "system", icon: "monitor", en: "System", ar: "النظام" },
];

function usePreference(): ThemePreference {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    readThemePreference,
    () => DEFAULT_THEME_PREFERENCE
  );

  // React resets <html> attributes on the dev-mode remount, so re-apply
  // the stored choice before paint. A no-op in production.
  useLayoutEffect(() => {
    applyTheme(preference);
  }, [preference]);

  return preference;
}

export default function ThemeToggle({
  isArabic,
  variant,
}: ThemeToggleProps) {
  const preference = usePreference();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const label = (option: (typeof OPTIONS)[number]) =>
    isArabic ? option.ar : option.en;

  const choose = useCallback((value: ThemePreference) => {
    saveThemePreference(value);
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const groupLabel = isArabic ? "المظهر" : "Appearance";

  if (variant === "segmented") {
    return (
      <div
        className="ohThemeSegmented"
        role="group"
        aria-label={groupLabel}
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={preference === option.value}
            className="ohThemeSegment"
            onClick={() => choose(option.value)}
          >
            <NavIcon name={option.icon} size={18} />
            <span>{label(option)}</span>
          </button>
        ))}
      </div>
    );
  }

  const current = OPTIONS.find((option) => option.value === preference);

  return (
    <div className="ohThemeMenu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ohNavIconBtn"
        aria-expanded={open}
        aria-label={`${groupLabel}: ${current ? label(current) : ""}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="ohThemeIconLight">
          <NavIcon name="sun" size={20} />
        </span>
        <span className="ohThemeIconDark">
          <NavIcon name="moon" size={20} />
        </span>
      </button>

      {open && (
        <div className="ohNavPopover" role="group" aria-label={groupLabel}>
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={preference === option.value}
              className="ohNavPopoverItem"
              onClick={() => choose(option.value)}
            >
              <NavIcon name={option.icon} size={18} />
              <span>{label(option)}</span>
              {preference === option.value && (
                <span className="ohNavPopoverCheck" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

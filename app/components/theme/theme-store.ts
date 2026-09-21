import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "./theme-init-script";

export const THEME_CHANGE_EVENT = "organheal-theme-change";

function isPreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);

    return isPreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function resolveTheme(
  preference: ThemePreference
): "light" | "dark" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return preference;
}

export function applyTheme(preference: ThemePreference): void {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;

  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-preference", preference);
  root.style.colorScheme = resolved;
}

export function saveThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;

  // Lets the stylesheet fade colors for the moment of the switch only,
  // instead of animating every element all the time.
  root.classList.add("themeSwitching");
  window.setTimeout(() => root.classList.remove("themeSwitching"), 240);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies
    // for this page view.
  }

  applyTheme(preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function subscribeToThemePreference(
  onChange: () => void
): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  function handleSystemChange() {
    if (readThemePreference() === "system") {
      applyTheme("system");
    }

    onChange();
  }

  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleSystemChange);
  media.addEventListener("change", handleSystemChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleSystemChange);
    media.removeEventListener("change", handleSystemChange);
  };
}

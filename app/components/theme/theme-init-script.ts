export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "organheal-theme";

// The preference used before a visitor has chosen one.
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "light";

// Runs synchronously in <head> so data-theme is set before the first paint,
// which is what prevents a light-to-dark flash on load. It must stay a plain
// string (no imports) because it is inlined into the HTML.
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");if(p!=="light"&&p!=="dark"&&p!=="system")p="${DEFAULT_THEME_PREFERENCE}";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.setAttribute("data-theme",d?"dark":"light");r.setAttribute("data-theme-preference",p);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

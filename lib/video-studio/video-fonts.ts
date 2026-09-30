import { SITE_URL } from "@/lib/seo/organization";

// Shotstack has no built-in font with Arabic glyphs: asking it for "Cairo"
// without supplying the file rendered every Arabic caption as empty boxes.
// These are Google's static Cairo builds (SIL Open Font License — see
// public/fonts/OFL.txt), served from our own site so every render fetches
// the same file.
export const CAIRO_BOLD_URL = `${SITE_URL}/fonts/Cairo-Bold.ttf`;
export const CAIRO_REGULAR_URL = `${SITE_URL}/fonts/Cairo-Regular.ttf`;

/** The family name inside the font files, which is what Shotstack matches on. */
export const ARABIC_FONT_FAMILY = "Cairo";

/**
 * @font-face rules for our html5 scenes (heart-hero-scene.ts,
 * organ-hero-scene.ts), which render in their own page and do not see the
 * timeline's fonts.
 */
export const ARABIC_FONT_FACE_CSS = `
  @font-face { font-family: 'Cairo'; font-weight: 400 600; src: url('${CAIRO_REGULAR_URL}') format('truetype'); }
  @font-face { font-family: 'Cairo'; font-weight: 700 900; src: url('${CAIRO_BOLD_URL}') format('truetype'); }
`.trim();

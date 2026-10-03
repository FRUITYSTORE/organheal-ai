import "server-only";
import sharp from "sharp";
import type { PersonalizationSpecification } from "../contracts/personalization";

const xml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
export type OverlayImage = { bytes: Buffer; start: number; end: number };
/** Rasterized private side panel. XML escaping, fixed layout, no hyperlinks/fonts/remote resources.
 * The anatomy occupies a separate fit-only viewport and is never covered by these overlays. */
export async function rasterizeOverlays(spec: PersonalizationSpecification, width: number, height: number): Promise<OverlayImage[]> {
  const result: OverlayImage[] = [];
  const slots = ["text-value", "risk-band", "caption", "educational-label", "chart", "subtitle"];
  const rowHeight = Math.floor(height / slots.length);
  const base = (content: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${content}</svg>`;
  const typography = (value: string, row: number) => {
    const size = Math.min(18, Math.floor((width - 24) / Math.max(1, ...value.split("\n").map(line => [...line].length))));
    if (size < 10) throw Error("OVERLAY_LAYOUT_EXCEEDED");
    return value.split("\n").map((line, index) =>
      `<text x="${width / 2}" y="${row * rowHeight + 25 + index * 23}" font-family="Arial,sans-serif" font-size="${size}" text-anchor="middle" direction="${spec.language === "ar" ? "rtl" : "ltr"}" unicode-bidi="plaintext" fill="white">${xml(line)}</text>`).join("");
  };
  for (const overlay of [...spec.textOverlays, ...spec.numericOverlays.map(o => ({ ...o, text: `${o.value} ${o.unit}` }))]) {
    const svg = base(typography(overlay.text, slots.indexOf(overlay.slot)));
    result.push({ start: overlay.start, end: overlay.end, bytes: await sharp(Buffer.from(svg)).png().toBuffer() });
  }
  for (const chart of spec.chartOverlays) {
    const y = slots.indexOf("chart") * rowHeight;
    const points = chart.values.map((value, index) => `${12 + (width - 24) * index / Math.max(1, chart.values.length - 1)},${y + rowHeight - 10 - (value - chart.minimum) / (chart.maximum - chart.minimum) * Math.max(1, rowHeight - 48)}`).join(" ");
    const marker = (value: number) => 12 + (width - 24) * (value - chart.minimum) / (chart.maximum - chart.minimum);
    let graphics: string;
    if (chart.kind === "trend") graphics = `<polyline points="${points}" fill="none" stroke="#7dd3fc" stroke-width="3"/>`;
    else if (chart.kind === "comparison") graphics = chart.values.map((value, i) => {
      const bar = (rowHeight - 48) * (value - chart.minimum) / (chart.maximum - chart.minimum);
      return `<rect x="${12 + i * (width - 24) / chart.values.length}" y="${y + rowHeight - 10 - bar}" width="${(width - 24) / chart.values.length - 4}" height="${bar}" fill="#7dd3fc"/>`;
    }).join("");
    else graphics = `<line x1="12" x2="${width - 12}" y1="${y + 55}" y2="${y + 55}" stroke="#7dd3fc"/>` +
      (chart.kind === "range-marker" ? `<circle cx="${marker(chart.values[0])}" cy="${y + 55}" r="5" fill="#7dd3fc"/>` :
        `<rect x="${marker(Math.min(...chart.values))}" y="${y + 48}" width="${Math.max(2, marker(Math.max(...chart.values)) - marker(Math.min(...chart.values)))}" height="14" fill="#7dd3fc"/>`);
    result.push({ start: chart.start, end: chart.end,
      bytes: await sharp(Buffer.from(base(typography(chart.label, slots.indexOf("chart")) + graphics))).png().toBuffer() });
  }
  return result;
}

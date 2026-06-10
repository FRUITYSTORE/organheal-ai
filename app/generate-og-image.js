const sharp = require("sharp");
const fs = require("fs");

async function generateOgImage() {
  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="630" x2="1200" y2="0">
        <stop offset="0%" stop-color="#020617"/>
        <stop offset="50%" stop-color="#0f766e"/>
        <stop offset="100%" stop-color="#1d4ed8"/>
      </linearGradient>
    </defs>

    <rect width="1200" height="630" fill="url(#bg)"/>

    <circle cx="1000" cy="120" r="220" fill="rgba(255,255,255,0.08)"/>
    <circle cx="170" cy="520" r="180" fill="rgba(255,255,255,0.06)"/>

    <text x="90" y="210" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="900" fill="#ffffff">
      OrganHeal AI
    </text>

    <text x="90" y="285" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" fill="#ccfbf1">
      AI-Powered Health Intelligence
    </text>

    <text x="90" y="365" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#e2e8f0">
      Understand organ health, track wellness,
    </text>

    <text x="90" y="405" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#e2e8f0">
      interpret labs, and generate health reports.
    </text>

    <text x="90" y="530" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#ffffff">
      organheal.com
    </text>

    <rect x="830" y="180" width="260" height="260" rx="48" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)" />

    <text x="960" y="335" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="100" font-weight="900" fill="#ffffff">
      OH
    </text>
  </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .resize(1200, 630)
    .toFile("public/og-image.png");

  console.log("✅ public/og-image.png generated successfully.");
}

generateOgImage();
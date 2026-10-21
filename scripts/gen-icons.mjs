// Renders the app icon (violet tile, white "S" over a yellow highlighter stroke) to PNG/ICO.
// Usage: node scripts/gen-icons.mjs   (needs network for the Nunito webfont)
import fs from "node:fs";
import { chromium } from "@playwright/test";

const VIOLET_FROM = "#6A4CF5";
const VIOLET_TO = "#4B3EE0";
const HIGHLIGHT = "#FFD43B";

/** @param {number} size @param {{ maskable?: boolean, rounded?: boolean }} o */
function svg(size, { maskable = false, rounded = true } = {}) {
  // Maskable icons keep content inside the central 80% safe zone.
  const k = maskable ? 0.8 : 1;
  const pad = (size * (1 - k)) / 2;
  const s = (v) => pad + v * size * k;
  const radius = rounded && !maskable ? size * 0.22 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <clipPath id="c"><rect width="${size}" height="${size}" rx="${radius}"/></clipPath>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${VIOLET_FROM}"/><stop offset="1" stop-color="${VIOLET_TO}"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#c)">
    <rect width="${size}" height="${size}" fill="url(#g)"/>
    <rect x="${s(0.22)}" y="${s(0.58)}" width="${size * k * 0.56}" height="${size * k * 0.15}" rx="${size * k * 0.05}"
      fill="${HIGHLIGHT}" transform="rotate(-5 ${size / 2} ${size / 2})"/>
    <text x="${s(0.5)}" y="${s(0.74)}" text-anchor="middle" font-family="Nunito" font-weight="900"
      font-size="${size * k * 0.7}" fill="#ffffff">S</text>
  </g>
</svg>`;
}

const targets = [
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
  { file: "public/icons/maskable-512.png", size: 512, maskable: true },
  { file: "app/apple-icon.png", size: 180, rounded: false }, // iOS rounds it itself
  { file: "public/icons/favicon-32.png", size: 32 },
  { file: "public/icons/favicon-16.png", size: 16 },
];

fs.mkdirSync("public/icons", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@900&display=block">
    <style>html,body{margin:0;background:transparent}</style></head><body>${svg(t.size, t)}</body></html>`,
    { waitUntil: "networkidle" },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.locator("svg").screenshot({ path: t.file, omitBackground: true });
  console.log(t.file);
}
await browser.close();

// favicon.ico = 16 + 32 px PNGs in an ICO container.
const pngs = ["public/icons/favicon-16.png", "public/icons/favicon-32.png"].map((f) => fs.readFileSync(f));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const size = [16, 32][i];
  const e = 6 + 16 * i;
  header.writeUInt8(size, e);
  header.writeUInt8(size, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(png.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
fs.writeFileSync("app/favicon.ico", Buffer.concat([header, ...pngs]));
for (const f of ["public/icons/favicon-16.png", "public/icons/favicon-32.png"]) fs.unlinkSync(f);
console.log("app/favicon.ico");

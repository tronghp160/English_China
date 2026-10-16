// Renders the app icon (notebook page: ruled lines, red margin, blue "S") to PNG/ICO.
// Usage: node scripts/gen-icons.mjs   (needs network for the Be Vietnam Pro webfont)
import fs from "node:fs";
import { chromium } from "@playwright/test";

const PAPER = "#F7F9FC";
const RULE = "#DCE3EE";
const MARGIN = "#E0484E";
const BLUE = "#2F5BD3";

/** @param {number} size @param {{ maskable?: boolean, rounded?: boolean }} o */
function svg(size, { maskable = false, rounded = true } = {}) {
  // Maskable icons keep content inside the central 80% safe zone.
  const k = maskable ? 0.8 : 1;
  const pad = (size * (1 - k)) / 2;
  const s = (v) => pad + v * size * k;
  const radius = rounded && !maskable ? size * 0.22 : 0;
  const lines = [0.3, 0.5, 0.7, 0.9]
    .map((y) => `<line x1="0" x2="${size}" y1="${s(y)}" y2="${s(y)}" stroke="${RULE}" stroke-width="${size * 0.012}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><clipPath id="c"><rect width="${size}" height="${size}" rx="${radius}"/></clipPath></defs>
  <g clip-path="url(#c)">
    <rect width="${size}" height="${size}" fill="${PAPER}"/>
    ${size >= 64 ? lines : ""}
    <rect x="${s(0.24)}" y="0" width="${Math.max(2, size * 0.035)}" height="${size}" fill="${MARGIN}"/>
    <text x="${s(0.6)}" y="${s(0.74)}" text-anchor="middle" font-family="Be Vietnam Pro" font-weight="700"
      font-size="${size * k * 0.66}" fill="${BLUE}">S</text>
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
    `<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@700&display=block">
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

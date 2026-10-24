// Renders the app icon (flat ink-violet tile, a thin 田字格 cell with a serif "S") to PNG/ICO.
// Same art as components/brand/logo.tsx. Usage: node scripts/gen-icons.mjs   (needs network for the Literata webfont)
import fs from "node:fs";
import { chromium } from "@playwright/test";

const INK_VIOLET = "#3B2E8C";

/** @param {number} size @param {{ maskable?: boolean, rounded?: boolean }} o */
function svg(size, { maskable = false, rounded = true } = {}) {
  // Maskable icons keep content inside the central 80% safe zone.
  const k = maskable ? 0.8 : 1;
  const pad = (size * (1 - k)) / 2;
  const s = (v) => pad + v * size * k;
  const radius = rounded && !maskable ? size * 0.22 : 0;
  const cell = size * k * 0.6;
  const x0 = s(0.2);
  const fontSize = size * k * 0.46;
  const sw = Math.max(1, size * 0.014);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><clipPath id="c"><rect width="${size}" height="${size}" rx="${radius}"/></clipPath></defs>
  <g clip-path="url(#c)">
    <rect width="${size}" height="${size}" fill="${INK_VIOLET}"/>
    <rect x="${x0}" y="${x0}" width="${cell}" height="${cell}" rx="${size * 0.012}" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="${sw}"/>
    <path d="M${s(0.5)} ${x0}V${x0 + cell}M${x0} ${s(0.5)}H${x0 + cell}" stroke="#fff" stroke-opacity="0.35" stroke-width="${sw * 0.8}" stroke-dasharray="${sw * 3} ${sw * 3}"/>
    <text x="${s(0.5)}" y="${s(0.5) + fontSize * 0.35}" text-anchor="middle" font-family="Literata" font-weight="600"
      font-size="${fontSize}" fill="#ffffff">S</text>
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
    `<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,600&display=block">
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

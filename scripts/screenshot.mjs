// Usage: node scripts/screenshot.mjs <path> [outPrefix] [--dark]
// Captures the page at phone (390px) and desktop (1280px) widths.
import { chromium } from "@playwright/test";

const [, , path = "/", out = "shot", ...flags] = process.argv;
const base = process.env.BASE_URL ?? "http://localhost:3000";
const dark = flags.includes("--dark");
const cookie = process.env.SHOT_COOKIES; // optional JSON array of cookies

const browser = await chromium.launch();
for (const [name, width, height] of [
  ["mobile", 390, 844],
  ["desktop", 1280, 860],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: name === "mobile" ? 2 : 1,
    colorScheme: dark ? "dark" : "light",
    locale: "vi-VN",
  });
  if (cookie) await context.addCookies(JSON.parse(cookie));
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("pageerror:", e.message));
  page.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const file = `${process.env.SHOT_DIR ?? "."}/${out}-${name}${dark ? "-dark" : ""}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
  await context.close();
}
await browser.close();

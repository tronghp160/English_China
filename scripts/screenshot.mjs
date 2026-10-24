// Usage:
//   node scripts/screenshot.mjs <path> [outPrefix] [--dark]
//   node scripts/screenshot.mjs --all <outDir> [--dark]
// Captures the page at phone (390px) and desktop (1280px) widths.
// SHOT_LOGIN=email:password signs in through /login first (the demo account from `pnpm db:seed`).
// --all walks the main routes (public pages, then the app with SHOT_LOGIN); deck/word ids are read from the pages.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const [first = "/", second = "shot"] = args.filter((a) => !a.startsWith("--"));
const base = process.env.BASE_URL ?? "http://localhost:3000";
const dark = flags.includes("--dark");
const all = flags.includes("--all");
const cookie = process.env.SHOT_COOKIES; // optional JSON array of cookies
const login = process.env.SHOT_LOGIN; // "email:password"
const SIZES = [
  ["mobile", 390, 844],
  ["desktop", 1280, 860],
];

async function newContext(browser, width, height, name) {
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
  return { context, page };
}

async function signIn(page) {
  if (!login) return;
  const [email, ...rest] = login.split(":");
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(rest.join(":"));
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(/\/(today|welcome)/, { timeout: 30000 });
}

async function shoot(page, path, out, name) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const file = `${out}-${name}${dark ? "-dark" : ""}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

async function firstHref(page, path, pattern) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
  return hrefs.find((h) => h && pattern.test(h)) ?? null;
}

const browser = await chromium.launch();

if (!all) {
  for (const [name, width, height] of SIZES) {
    const { context, page } = await newContext(browser, width, height, name);
    await signIn(page);
    await shoot(page, first, `${process.env.SHOT_DIR ?? "."}/${second}`, name);
    await context.close();
  }
} else {
  const dir = first === "/" ? "." : first;
  mkdirSync(dir, { recursive: true });
  const publicRoutes = [
    ["/", "landing"],
    ["/login", "login"],
    ["/signup", "signup"],
    ["/forgot-password", "forgot-password"],
    ["/lien-he", "lien-he"],
    ["/offline", "offline"],
  ];
  const appRoutes = [
    ["/today", "today"],
    ["/decks", "decks"],
    ["/decks/new", "deck-new"],
    ["/review", "review"],
    ["/practice", "practice"],
    ["/hard-words", "hard-words"],
    ["/chat", "chat"],
    ["/explore", "explore"],
    ["/groups", "groups"],
    ["/stats", "stats"],
    ["/settings", "settings"],
  ];
  for (const [name, width, height] of SIZES) {
    const { context, page } = await newContext(browser, width, height, name);
    for (const [path, out] of publicRoutes) await shoot(page, path, `${dir}/${out}`, name);
    if (login) {
      await signIn(page);
      for (const [path, out] of appRoutes) await shoot(page, path, `${dir}/${out}`, name);
      const deck = await firstHref(page, "/decks", /^\/decks\/[0-9a-f-]{36}$/);
      if (deck) {
        await shoot(page, deck, `${dir}/deck`, name);
        await shoot(page, `${deck}/add`, `${dir}/word-add`, name);
        const id = deck.split("/").pop();
        await shoot(page, `/practice/learn?deck=${id}`, `${dir}/practice-learn`, name);
        await shoot(page, `/practice/test?deck=${id}`, `${dir}/practice-test`, name);
        await shoot(page, `/practice/match?deck=${id}`, `${dir}/practice-match`, name);
        const word = await firstHref(page, deck, /^\/words\/[0-9a-f-]{36}$/);
        if (word) await shoot(page, word, `${dir}/word`, name);
      }
      const group = await firstHref(page, "/groups", /^\/groups\/[0-9a-f-]{36}$/);
      if (group) await shoot(page, group, `${dir}/group`, name);
    }
    await context.close();
  }
}
await browser.close();

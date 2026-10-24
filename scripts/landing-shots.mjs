// Takes the three pictures of the landing page from the real app and saves them as WebP in public/landing/.
// Usage (dev server running, demo data seeded):
//   BASE_URL=http://localhost:3100 SHOT_LOGIN=demo@example.com:sotu1234 node scripts/landing-shots.mjs
// The word form is filled from a fixed dictionary answer so the picture does not depend on the network.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const [email, ...pw] = (process.env.SHOT_LOGIN ?? "demo@example.com:sotu1234").split(":");
const OUT = "public/landing";
mkdirSync(OUT, { recursive: true });

const ENRICH = {
  language: "en",
  is_valid_word: true,
  did_you_mean: null,
  lemma: "resilient",
  ipa_us: "/rɪˈzɪliənt/",
  ipa_uk: null,
  cefr: "B2",
  senses: [
    {
      pos: ["adj"],
      meaning_vi: "kiên cường, mau phục hồi",
      meaning_en: "Able to recover quickly from difficulties.",
      examples: [{ text: "She's remarkably resilient.", vi: "Cô ấy kiên cường đáng kinh ngạc." }],
    },
    {
      pos: ["adj"],
      meaning_vi: "co giãn, đàn hồi",
      meaning_en: "Able to spring back into shape.",
      examples: [{ text: "Rubber is a resilient material.", vi: "Cao su là vật liệu đàn hồi." }],
    },
  ],
  synonyms: ["tough", "hardy"],
  antonyms: ["fragile"],
  collocations: [{ text: "resilient economy", vi: "nền kinh tế vững vàng" }],
  word_family: [{ text: "resilience", pos: "noun", vi: "sự kiên cường" }],
  verb_forms: null,
  plural: null,
  topic_vi: "Tính cách",
  emoji: null,
  image_query: "tree growing through rock",
  memory_tip_vi: null,
  checks: {},
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 480, height: 900 }, deviceScaleFactor: 2, colorScheme: "light", locale: "vi-VN" });
const page = await context.newPage();
// Keep the dev overlay and the phone tab bar out of the pictures
await page.addInitScript(() => {
  const style = document.createElement("style");
  style.textContent = "nextjs-portal{display:none!important} nav[aria-label='Điều hướng chính']{display:none!important}";
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
});

/** PNG buffer -> WebP buffer, converted by the browser's own encoder. */
async function toWebp(png, quality = 0.82) {
  const dataUrl = await page.evaluate(
    async ({ b64, q }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      return c.toDataURL("image/webp", q);
    },
    { b64: png.toString("base64"), q: quality },
  );
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

/** `target` is a locator, or a clip rectangle of the viewport. */
async function save(name, target, quality = 0.75) {
  await page.waitForTimeout(800);
  const png = "clip" in target ? await page.screenshot({ clip: target.clip }) : await target.screenshot();
  const webp = await toWebp(png, quality);
  writeFileSync(`${OUT}/${name}.webp`, webp);
  const dims = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/webp;base64,${b64}`;
    await img.decode();
    return [img.width, img.height];
  }, webp.toString("base64"));
  console.log(`${OUT}/${name}.webp ${dims.join("x")} ${(webp.length / 1024).toFixed(0)} KB`);
}

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.getByLabel("Email").fill(email);
await page.getByLabel("Mật khẩu", { exact: true }).fill(pw.join(":"));
await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
await page.waitForURL(/today/);

// An English deck with words
await page.goto(`${base}/decks?lang=en`, { waitUntil: "networkidle" });
const deckHref = (await page.$$eval("a[href]", (a) => a.map((x) => x.getAttribute("href")))).find((h) => /^\/decks\/[0-9a-f-]{36}$/.test(h ?? ""));
if (!deckHref) throw new Error("no English deck for the demo account; run pnpm db:seed");
const deckId = deckHref.split("/").pop();

// 1. Add-word form with suggestions filled in
await page.route("**/api/dict", (route) => route.fulfill({ json: { result: ENRICH } }));
await page.route("**/api/ai/enrich", (route) => route.fulfill({ json: { cached: false, remaining: null, result: ENRICH } }));
await page.route("**/api/images/search**", (route) => route.fulfill({ json: { results: [] } }));
await page.goto(`${base}/decks/${deckId}/add`, { waitUntil: "networkidle" });
await page.getByLabel("Từ", { exact: true }).fill("resilient");
await page.getByRole("button", { name: /Gợi ý/ }).click();
await page.getByLabel("Nghĩa tiếng Việt").waitFor();
await page.waitForFunction(() => document.querySelector("#meaning_vi")?.value);
await save("word-form", { clip: { x: 0, y: 64, width: 480, height: 620 } });

// 2. Back of a review card with the four rating buttons
await page.unroute("**/api/dict");
await page.unroute("**/api/ai/enrich");
await page.setViewportSize({ width: 480, height: 760 });
await page.goto(`${base}/review?deck=${deckId}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Lật thẻ/ }).click();
await page.waitForTimeout(900);
await save("review", { clip: { x: 0, y: 0, width: 480, height: 760 } });

// 3. The practice modes
await page.setViewportSize({ width: 480, height: 900 });
await page.goto(`${base}/practice`, { waitUntil: "networkidle" });
await save("modes", page.locator("form fieldset").first());

await browser.close();

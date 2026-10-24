import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

// REDESIGN_V3 §10.3: every main screen at five widths must not scroll sideways, clip its text or hide
// a control that is too small to tap. One account with the sample decks (onboarding default) serves all routes.
// Tests are independent of each other so one broken page does not hide the next; a failing test restarts
// the worker, which signs up a fresh account (and deletes the old one in afterAll).
// Text that must never be cut off carries `data-check-overflow` (headings, mode names, stat chips).

const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
  { width: 844, height: 390 }, // a phone on its side
] as const;

const MIN_TARGET = 40;

const email = testEmail();
let page: Page;
let errors: string[];
let deckId = "";

/** Public pages run without a session, the rest with the account made in beforeAll. */
const PUBLIC_ROUTES = ["/", "/login", "/signup"];
const APP_ROUTES = [
  "/today",
  "/decks",
  "/practice",
  "/stats",
  "/groups",
  "/chat",
  "/settings",
  "/explore",
  "/hard-words",
  "/review",
];

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  errors = watchErrors(page);
  await signUp(page, email, "Người Thử", { samples: true });
  const userId = await userIdByEmail(email);
  const { data } = await admin()
    .from("decks")
    .select("id")
    .eq("owner_id", userId!)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  deckId = data?.id ?? "";
});

test.afterAll(async () => {
  await page.close();
  await deleteUserByEmail(email);
});

type Problem = string;

/** Runs in the page: the three checks of §10.3. Returns a readable list of what is wrong. */
async function audit(p: Page): Promise<Problem[]> {
  return p.evaluate((min) => {
    const out: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth) {
      out.push(`horizontal scroll: scrollWidth ${doc.scrollWidth} > ${window.innerWidth}`);
    }

    const label = (el: Element) => {
      const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      const id = el.getAttribute("aria-label") ?? "";
      return `<${el.tagName.toLowerCase()}> ${id || text || el.className.toString().slice(0, 40)}`;
    };

    for (const el of document.querySelectorAll("[data-check-overflow]")) {
      const e = el as HTMLElement;
      if (e.scrollWidth > e.clientWidth + 1) {
        out.push(`clipped text: ${label(e)} (${e.scrollWidth} > ${e.clientWidth})`);
      }
    }

    // Nothing a person reads is set below 13px (REDESIGN_V3 §3.7); badges, decorative (aria-hidden) text and screen-reader text are exempt.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const small = new Set<string>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const e = n.parentElement;
      if (!e || e.closest("svg, script, style, [aria-hidden='true'], [data-slot='badge'], [data-small-text-ok], .sr-only, [class*='next-route']")) continue;
      const box = e.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const size = parseFloat(getComputedStyle(e).fontSize);
      if (size < 12.9) small.add(`${size}px: ${(n.textContent ?? "").trim().slice(0, 30)}`);
    }
    for (const t of small) out.push(`text under 13px ${t}`);

    for (const el of document.querySelectorAll("button, a")) {
      const e = el as HTMLElement;
      if (e.closest("[data-inline-link]") || e.hasAttribute("data-inline-link")) continue;
      // A switch is drawn small but its ::after extends the hit area to 64×48 (components/ui/switch.tsx), which a bounding box cannot see.
      if (e.getAttribute("data-slot") === "switch") continue;
      if (e.closest("[aria-hidden='true']") || e.closest("[hidden]")) continue;
      const style = getComputedStyle(e);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Links that sit inside a sentence are exempt: they are as tall as the line.
      if (e.tagName === "A" && style.display === "inline") continue;
      if (r.width < min || r.height < min) {
        out.push(`small target ${Math.round(r.width)}×${Math.round(r.height)}: ${label(e)}`);
      }
    }
    return out;
  }, MIN_TARGET);
}

async function check(route: string) {
  const problems: string[] = [];
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.goto(route, { waitUntil: "networkidle" });
    for (const p of await audit(page)) problems.push(`${vp.width}px  ${p}`);
  }
  // Collapsed to one line per distinct message so the report stays readable.
  expect(Array.from(new Set(problems)), `${route}\n`).toEqual([]);
}

test.describe("public pages", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} fits every width`, async ({ browser }) => {
      // A fresh context without the session cookie.
      const anon = await browser.newPage({ locale: "vi-VN", reducedMotion: "reduce" });
      const problems: string[] = [];
      for (const vp of VIEWPORTS) {
        await anon.setViewportSize(vp);
        await anon.goto(route, { waitUntil: "networkidle" });
        for (const p of await audit(anon)) problems.push(`${vp.width}px  ${p}`);
      }
      await anon.close();
      expect(Array.from(new Set(problems)), `${route}\n`).toEqual([]);
    });
  }
});

test.describe("app pages", () => {
  for (const route of APP_ROUTES) {
    test(`${route} fits every width`, async () => {
      await check(route);
    });
  }

  test("a deck page fits every width", async () => {
    test.skip(!deckId, "the sample decks were not created");
    await check(`/decks/${deckId}`);
  });

  for (const mode of ["learn", "test", "match"]) {
    test(`/practice/${mode} fits every width`, async () => {
      test.skip(!deckId, "the sample decks were not created");
      await check(`/practice/${mode}?deck=${deckId}&n=6`);
    });
  }

  test("no page raised an error", () => {
    expect(errors).toEqual([]);
  });
});

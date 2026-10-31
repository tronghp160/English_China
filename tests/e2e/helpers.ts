import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("E2E needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function testEmail() {
  return `e2e.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;
}

/** The link a magic-link email would contain, without sending an email. */
export async function magicLinkPath(email: string, next = "/today") {
  // For an unknown email Supabase returns a sign-up token instead; create the (confirmed) user first,
  // which is what signInWithOtp does for a new address.
  const sb = admin();
  const created = await sb.auth.admin.createUser({ email, email_confirm: true });
  if (created.error && created.error.status !== 422) throw created.error;
  const { data, error } = await sb.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  return `/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`;
}

/** Signs a fresh account in through the callback and finishes onboarding (English only). */
export async function signUp(page: Page, email: string, displayName = "Người Thử", opts: { samples?: boolean } = {}) {
  await page.goto(await magicLinkPath(email));
  await page.waitForURL(/\/welcome/);
  const username = `e2e_${Date.now().toString(36)}`;
  await page.getByLabel("Tên hiển thị").fill(displayName);
  await page.getByLabel("Tên người dùng").fill(username);
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("radio", { name: /Tiếng Anh/ }).click();
  // Tests start from an empty notebook unless they ask for the sample decks (the switch is on by default).
  if (!opts.samples) await page.getByRole("switch", { name: "Thêm bộ từ mẫu" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click(); // step 3 of 3: the summary
  await page.getByRole("button", { name: /Bắt đầu học/ }).click();
  await page.waitForURL(/\/today/);
  return { username };
}

export async function userIdByEmail(email: string) {
  const { data } = await admin().auth.admin.listUsers({ perPage: 200 });
  return data?.users.find((u) => u.email === email)?.id ?? null;
}

/**
 * For tests that mock POST /api/chat: does what the route does with a first question that carries
 * `newThread` (the client picks the thread id), so the conversation exists on reload.
 */
export async function createMockedThread(email: string, body: unknown) {
  const b = body as { id?: string; newThread?: { deckId?: string | null }; message?: { parts?: { text?: string }[] } } | null;
  if (!b?.id || !b.newThread) return;
  const userId = await userIdByEmail(email);
  if (!userId) return;
  const title = b.message?.parts?.[0]?.text?.slice(0, 60) ?? null;
  await admin()
    .from("chat_threads")
    .upsert({ id: b.id, user_id: userId, language: "en", deck_id: b.newThread.deckId ?? null, title }, { onConflict: "id", ignoreDuplicates: true });
}

export async function deleteUserByEmail(email: string) {
  const sb = admin();
  const { data } = await sb.auth.admin.listUsers({ perPage: 200 });
  const user = data?.users.find((u) => u.email === email);
  if (user) await sb.auth.admin.deleteUser(user.id);
}

/** Collects uncaught page errors and 5xx responses so a test can assert none happened. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
  });
  return errors;
}

/** Fixed /api/ai/enrich answer shaped like lib/ai (capEnrichResult + checks). */
export const ENRICH_RESILIENT = {
  cached: false,
  remaining: 99,
  result: {
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
        examples: [{ text: "Children are often very resilient.", vi: "Trẻ em thường rất kiên cường." }],
      },
    ],
    synonyms: ["tough", "hardy"],
    antonyms: ["fragile"],
    collocations: [{ text: "resilient economy", vi: "nền kinh tế vững vàng" }],
    word_family: [{ text: "resilience", pos: "noun", vi: "sự kiên cường" }],
    verb_forms: null,
    plural: null,
    topic_vi: "Tính cách",
    emoji: "🌱",
    image_query: "tree growing through rock",
    memory_tip_vi: null,
    checks: {},
  },
};

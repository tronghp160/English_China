import { expect, test, type Locator, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

// docs/PLAN-study-games.md: match, test and learn on a deck made through the admin API.
test.describe.configure({ mode: "serial" });

const email = testEmail();
let page: Page;
let errors: string[];
let userId: string;

const WORDS: [string, string][] = [
  ["apple", "quả táo"],
  ["river", "dòng sông"],
  ["window", "cửa sổ"],
  ["teacher", "giáo viên"],
  ["yellow", "màu vàng"],
  ["mountain", "ngọn núi"],
  ["kitchen", "nhà bếp"],
  ["bridge", "cây cầu"],
  ["pencil", "bút chì"],
  ["garden", "khu vườn"],
];
const meaningOf = new Map(WORDS);
const termOf = new Map(WORDS.map(([t, m]) => [m, t]));

async function createDeck(name: string, words: [string, string][]) {
  const sb = admin();
  const { data: deck, error } = await sb
    .from("decks")
    .insert({ owner_id: userId, name, language: "en" })
    .select("id")
    .single();
  if (error) throw error;
  const rows = words.map(([term, meaning_vi], i) => ({
    deck_id: deck.id,
    created_by: userId,
    language: "en" as const,
    term,
    normalized: term,
    meaning_vi,
    // keep the deck order stable for learn
    created_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
  }));
  const { error: wordsError } = await sb.from("words").insert(rows);
  if (wordsError) throw wordsError;
  return deck.id as string;
}

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  errors = watchErrors(page);
  await signUp(page, email);
  userId = (await userIdByEmail(email))!;
});

test.afterAll(async () => {
  await page.close();
  await deleteUserByEmail(email);
});

test("ghép thẻ: ghép đủ 6 cặp và thấy kỷ lục", async () => {
  const deckId = await createDeck("Ghép thẻ E2E", WORDS.slice(0, 6));
  await page.goto(`/practice/match?deck=${deckId}&n=6`);
  await page.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(page.getByText("Bảng 1/1")).toBeVisible();

  for (const [term, meaning] of WORDS.slice(0, 6)) {
    await page.getByRole("button", { name: term, exact: true }).click();
    await page.getByRole("button", { name: meaning, exact: true }).click();
    await expect(page.getByRole("button", { name: term, exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("heading", { name: "Kỷ lục đầu tiên!" })).toBeVisible();
  await expect(page.getByText("lần ghép sai")).toBeVisible();

  // Match logs nothing: guessing pairs says little about each word.
  const { data } = await admin().from("review_logs").select("id").eq("user_id", userId);
  expect(data ?? []).toHaveLength(0);
  expect(errors).toEqual([]);
});

/** Answers one test question from the deck data; `right = false` picks a wrong answer. */
async function answerTestQuestion(card: Locator, right: boolean) {
  const text = (await card.textContent()) ?? "";
  const term = WORDS.map(([t]) => t).find((t) => text.includes(t));
  const meaning = WORDS.map(([, m]) => m).find((m) => text.includes(m));
  if (await card.getByRole("group", { name: "Đúng hay sai?" }).count()) {
    const isTrue = meaningOf.get(term!) === meaning;
    await card.getByRole("button", { name: isTrue === right ? "Đúng" : "Sai", exact: true }).click();
    return;
  }
  const options = card.getByRole("group", { name: "Các đáp án" }).getByRole("button");
  const askedTerm = text.includes("Nghĩa của từ này là gì?");
  const correct = askedTerm ? meaningOf.get(term!)! : termOf.get(meaning!)!;
  if (right) await options.filter({ hasText: correct }).click();
  else await options.filter({ hasNotText: correct }).first().click();
}

test("kiểm tra: sai 2 câu được 80% và làm lại 2 câu sai", async () => {
  const deckId = await createDeck("Kiểm tra E2E", WORDS);
  await page.goto(`/practice/test?deck=${deckId}&n=10&types=choice,tf`);
  const cards = page.locator("section[aria-labelledby]");
  await expect(cards).toHaveCount(10);
  for (let i = 0; i < 10; i++) await answerTestQuestion(cards.nth(i), i >= 2);
  await expect(page.getByText("Đã làm 10/10")).toBeVisible();
  await page.getByRole("button", { name: "Nộp bài" }).click();

  await expect(page.getByText("80%")).toBeVisible();
  await expect(page.getByText("Đúng 8/10")).toBeVisible();
  // every answer reaches review_logs through the outbox
  await expect
    .poll(async () => (await admin().from("review_logs").select("id").eq("user_id", userId)).data?.length ?? 0)
    .toBe(10);

  await page.getByRole("button", { name: "Làm lại câu sai (2)" }).click();
  await expect(cards).toHaveCount(2);
  await expect(page.getByText("Đã làm 0/2")).toBeVisible();
  // submitting with blanks asks first
  await page.getByRole("button", { name: "Nộp bài" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Còn 2 câu chưa làm");
  await page.getByRole("button", { name: "Làm tiếp" }).click();
  expect(errors).toEqual([]);
});

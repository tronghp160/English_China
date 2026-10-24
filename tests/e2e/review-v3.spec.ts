import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

// REDESIGN_V3 §8.1 and §8.2: the review card stack and the free flashcards.
test.describe.configure({ mode: "serial" });

const WORDS: [string, string][] = [
  ["apple", "quả táo"],
  ["river", "dòng sông"],
  ["window", "cửa sổ"],
  ["teacher", "giáo viên"],
  ["yellow", "màu vàng"],
];

const email = testEmail();
let page: Page;
let errors: string[];
let deckId = "";

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  errors = watchErrors(page);
  await signUp(page, email);
  const userId = (await userIdByEmail(email))!;
  const sb = admin();
  const { data: deck, error } = await sb.from("decks").insert({ owner_id: userId, name: "Thẻ E2E", language: "en" }).select("id").single();
  if (error) throw error;
  deckId = deck.id;
  const { error: wordsError } = await sb.from("words").insert(
    WORDS.map(([term, meaning_vi], i) => ({
      deck_id: deckId,
      created_by: userId,
      language: "en" as const,
      term,
      normalized: term,
      meaning_vi,
      created_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    })),
  );
  if (wordsError) throw wordsError;
});

test.afterAll(async () => {
  await page.close();
  await deleteUserByEmail(email);
});

test("ôn tập: lật thẻ, chấm Nhớ, XP và combo của phiên tăng, thẻ sau hiện ra", async () => {
  await page.goto("/today"); // makes the cards of the new words
  await page.goto("/review");
  await expect(page.getByText("Từ mới", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Lật thẻ/ }).click();
  const group = page.getByRole("group", { name: "Bạn nhớ từ này thế nào?" });
  await expect(group).toBeVisible();
  await group.getByRole("button", { name: /Nhớ/ }).click();
  await expect(page.getByText("XP phiên này: 1")).toBeVisible();
  // the next card is up and still turned face down
  await expect(page.getByRole("button", { name: /Lật thẻ/ })).toBeVisible();
  await page.getByRole("button", { name: /Lật thẻ/ }).click();
  await group.getByRole("button", { name: /Quên/ }).click();
  // "Quên" breaks the combo and gives no XP
  await expect(page.getByText("XP phiên này: 1")).toBeVisible();
  await expect(page.getByText(/Combo ×/)).toHaveCount(0);
});

test("lật thẻ tự do: đánh dấu đã thuộc và chưa thuộc, bộ đếm hai bên", async () => {
  await page.goto(`/practice/flashcard?deck=${deckId}&n=200&from=deck`);
  await expect(page.getByText("Thẻ 1/5")).toBeVisible();
  const marks = page.getByRole("group", { name: "Đánh dấu thẻ" });
  await marks.getByRole("button", { name: /^Đã thuộc/ }).click();
  await expect(page.getByText("Thẻ 2/5")).toBeVisible();
  await expect(page.getByText("Đã thuộc: 1")).toBeVisible();
  await marks.getByRole("button", { name: /^Chưa thuộc/ }).click();
  await expect(page.getByText("Thẻ 3/5")).toBeVisible();
  await expect(page.getByText("Chưa thuộc: 1")).toBeVisible();
  await expect(page.getByText("Đã thuộc: 1")).toBeVisible();
  expect(errors).toEqual([]);
});

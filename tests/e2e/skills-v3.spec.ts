import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

// REDESIGN_V3 §8.7: the typing question's hint and letter diff, and the listening question's slow button.
test.describe.configure({ mode: "serial" });

const email = testEmail();
let page: Page;
let errors: string[];
let deckId = "";

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ locale: "vi-VN", reducedMotion: "reduce" });
  errors = watchErrors(page);
  await signUp(page, email, "Người Thử", { samples: false });
  const userId = (await userIdByEmail(email))!;
  const sb = admin();
  const { data: deck, error } = await sb.from("decks").insert({ owner_id: userId, name: "Kỹ năng E2E", language: "en" }).select("id").single();
  if (error) throw error;
  deckId = deck.id;
  const words: [string, string][] = [["bridge", "cây cầu"], ["pencil", "bút chì"], ["garden", "khu vườn"], ["window", "cửa sổ"]];
  const { error: wordsError } = await sb.from("words").insert(
    words.map(([term, meaning_vi], i) => ({
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

test("gõ từ: gợi ý hiện thêm một chữ mỗi lần và câu sai được so từng chữ", async () => {
  await page.goto(`/practice/typing?deck=${deckId}&n=4`);
  const input = page.getByLabel("Gõ từ tiếng Anh");
  await expect(input).toBeVisible();
  await page.getByRole("button", { name: "Gợi ý", exact: true }).click();
  const hint = page.locator("p[aria-live=polite]");
  await expect(hint).toHaveText(/Gợi ý: [a-z]_+$/);
  await page.getByRole("button", { name: "Gợi ý thêm" }).click();
  await expect(hint).toHaveText(/Gợi ý: [a-z]{2}_+$/);
  await input.fill("zzzz");
  await input.press("Enter");
  await expect(page.getByText("Bạn gõ")).toBeVisible();
  await expect(page.getByText("Đáp án", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("nghe: nút nghe to và nút nghe chậm", async () => {
  await page.goto(`/practice/listening?deck=${deckId}&n=4`);
  await expect(page.getByRole("button", { name: "Nghe lại" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nghe chậm" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("chọn luyện tập: gợi ý một trò, thẻ có mô tả và dòng tóm tắt đổi theo lựa chọn", async () => {
  await page.goto(`/practice?deck=${deckId}`);
  await expect(page.getByText("Gợi ý cho bạn")).toHaveCount(1);
  const summary = page.locator("p[aria-live=polite]").filter({ hasText: "câu" }).or(page.locator("p[aria-live=polite]").filter({ hasText: "từ" }));
  await expect(summary.first()).toContainText("Học · Kỹ năng E2E");
  await page.getByRole("radio", { name: /Kiểm tra/ }).check({ force: true });
  await expect(summary.first()).toContainText("Kiểm tra · Kỹ năng E2E");
  await expect(page.getByRole("button", { name: "Bắt đầu luyện" })).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page).toHaveURL(/\/practice\/test/);
  expect(errors).toEqual([]);
});

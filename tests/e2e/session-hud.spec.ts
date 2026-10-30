import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

// REDESIGN_V3 §7.1 and §7.2: the bar of a practice session (combo, XP, sound switch) and the answer feedback.
test.describe.configure({ mode: "serial" });

const WORDS: [string, string][] = [
  ["apple", "quả táo"],
  ["river", "dòng sông"],
  ["window", "cửa sổ"],
  ["teacher", "giáo viên"],
  ["yellow", "màu vàng"],
  ["mountain", "ngọn núi"],
  ["kitchen", "nhà bếp"],
  ["bridge", "cây cầu"],
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
  const { data: deck, error } = await sb.from("decks").insert({ owner_id: userId, name: "HUD E2E", language: "en" }).select("id").single();
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

/** Answers the question on screen: right or wrong. Works for the two choice prompts (word to meaning and back). */
async function answer(right: boolean) {
  const options = page.getByRole("group", { name: "Các đáp án" });
  await expect(options).toBeVisible();
  const text = (await page.locator("main").textContent()) ?? "";
  const askedTerm = text.includes("Nghĩa của từ này là gì?");
  const pair = askedTerm ? WORDS.find(([t]) => text.includes(t))! : WORDS.find(([, m]) => text.includes(m))!;
  const correct = askedTerm ? pair[1] : pair[0];
  const buttons = options.getByRole("button");
  await (right ? buttons.filter({ hasText: correct }) : buttons.filter({ hasNotText: correct }).first()).click();
}

const next = () => page.getByRole("button", { name: /^Tiếp tục/ }).click();

test("ba câu đúng liên tiếp: chip combo, XP và lời khen", async () => {
  await page.goto(`/practice/quiz?deck=${deckId}&n=8`);
  for (let i = 1; i <= 3; i++) {
    await answer(true);
    await expect(page.getByText("Đúng rồi!")).toBeVisible();
    await expect(page.getByText(`XP phiên này: ${i}`)).toBeVisible();
    if (i < 3) await next();
  }
  await expect(page.getByText("Combo ×3")).toBeVisible();
  // the praise line under the verdict is one of the five
  await expect(page.getByRole("status").filter({ hasText: /Chuẩn luôn!|Giỏi quá!|Nhớ dai ghê!|Quá đỉnh!|Đúng rồi đó!/ })).toBeVisible();
  await next();
});

test("một câu sai: combo về 0, XP giữ nguyên, có lời an ủi", async () => {
  await answer(false);
  await expect(page.getByText("Chưa đúng")).toBeVisible();
  await expect(page.getByText("Combo ×3")).toHaveCount(0);
  await expect(page.getByText("XP phiên này: 3")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /Không sao, lần sau nhớ nha|Sai một lần là nhớ lâu hơn|Từ này sẽ quay lại, đừng lo/ })).toBeVisible();
  // the right answer stays marked
  await expect(page.getByRole("group", { name: "Các đáp án" }).getByLabel("Đáp án đúng")).toBeVisible();
});

test("công tắc âm thanh trên thanh phiên", async () => {
  const off = page.getByRole("button", { name: "Tắt âm thanh" });
  await expect(off).toHaveAttribute("aria-pressed", "true");
  await off.click();
  const on = page.getByRole("button", { name: "Bật âm thanh" });
  await expect(on).toHaveAttribute("aria-pressed", "false");
  await on.click();
  await expect(page.getByRole("button", { name: "Tắt âm thanh" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("trả lời đúng 5 câu liên tiếp: Bin hiện bong bóng chứa số 5", async () => {
  await page.goto(`/practice/quiz?deck=${deckId}&n=8`);
  for (let i = 1; i <= 5; i++) {
    await answer(true);
    await expect(page.getByText("Đúng rồi!")).toBeVisible();
    if (i === 5) {
      await expect(page.getByText(/5 câu liền|Combo 5|5 câu đúng/)).toBeVisible();
    } else {
      await next();
    }
  }
});

import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

test.describe.configure({ mode: "serial" });

const email = testEmail();
let page: Page;
let errors: string[];
let userId: string;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  errors = watchErrors(page);
  await signUp(page, email, "Người Thử", { samples: false });
  userId = (await userIdByEmail(email))!;

  const sb = admin();
  // 1. Create a Chinese deck
  const { data: deck, error: deckErr } = await sb
    .from("decks")
    .insert({ owner_id: userId, name: "Tiếng Trung", language: "zh" })
    .select("id")
    .single();
  if (deckErr) throw deckErr;

  // 2. Insert 25 Chinese words
  const wordRows = Array.from({ length: 25 }, (_, i) => ({
    deck_id: deck.id,
    created_by: userId,
    language: "zh",
    term: `测试${i + 1}`,
    normalized: `测试${i + 1}`,
    meaning_vi: `Thử nghiệm ${i + 1}`,
  }));
  const { data: words, error: wordErr } = await sb.from("words").insert(wordRows).select("id");
  if (wordErr) throw wordErr;

  // 3. Insert 25 user_cards for these words (mastered: recognize, review, scheduled_days >= 21)
  const cardRows = words.map((w) => ({
    user_id: userId,
    word_id: w.id,
    direction: "recognize",
    state: "review",
    scheduled_days: 30,
    due: new Date().toISOString(),
    lapses: 0,
    reps: 5,
    suspended: false,
  }));
  const { error: cardErr } = await sb.from("user_cards").insert(cardRows);
  if (cardErr) throw cardErr;

  // 4. Insert daily_stats with correct = 100
  const { error: statsErr } = await sb
    .from("daily_stats")
    .insert({ user_id: userId, day: "2026-01-01", reviews: 100, correct: 100, new_learned: 0, xp: 100 });
  if (statsErr) throw statsErr;
});

test.afterAll(async () => {
  await page.close();
  await deleteUserByEmail(email);
});

const bin = (p: Page) => p.getByRole("dialog", { name: "Góc của Bin" });

async function openBinHome(p: Page) {
  await p.goto("/today");
  await p.getByRole("button", { name: "Tài khoản và cài đặt" }).click();
  await p.getByRole("menuitem", { name: "Góc của Bin" }).click();
  await expect(bin(p)).toBeVisible();
}

test("1. vào Góc của Bin -> Bạn nhỏ -> Panda là trứng: Còn 30 câu đúng để nở", async () => {
  await openBinHome(page);
  const buddiesBtn = bin(page).getByRole("button", { name: /Bạn nhỏ/ });
  await expect(buddiesBtn).toBeVisible();
  await buddiesBtn.click();

  await expect(bin(page).getByRole("heading", { name: "Bạn nhỏ" })).toBeVisible();
  // Panda is earned because user has 25 mastered Chinese cards
  const pandaCard = bin(page).locator('[data-species="panda"]');
  await expect(pandaCard).toBeVisible();
  await expect(pandaCard.getByText("Còn 30 câu đúng để nở")).toBeVisible();
});

test("2. cập nhật daily_stats correct = 130 -> Trứng sẵn sàng nở, chạm 3 lần nở ra Panda và đổi tên Gấu", async () => {
  // Update daily_stats to 130 correct (now totalCorrect - start_correct = 130 - 100 = 30 >= 30)
  const sb = admin();
  const { error } = await sb
    .from("daily_stats")
    .update({ correct: 130, reviews: 130, xp: 130 })
    .eq("user_id", userId)
    .eq("day", "2026-01-01");
  if (error) throw error;

  // Close and re-open to sync
  await bin(page).getByRole("button", { name: "Đóng" }).click();
  await expect(bin(page)).toHaveCount(0);

  await openBinHome(page);
  await bin(page).getByRole("button", { name: /Bạn nhỏ/ }).click();

  // Panda card should now be ready
  const pandaCard = bin(page).locator('[data-species="panda"]');
  await expect(pandaCard.getByText("Sẵn sàng nở!")).toBeVisible();

  // Tap 3 times on Panda's hatch button
  const hatchBtn = pandaCard.getByRole("button", { name: /Chạm/ });
  await hatchBtn.click();
  await hatchBtn.click();
  await hatchBtn.click();

  // Hatch dialog appears
  await expect(page.getByRole("dialog").getByText("Chào Panda!")).toBeVisible();

  // Rename to "Gấu"
  const nameInput = page.locator("#buddy-name-input");
  await expect(nameInput).toBeVisible();
  await nameInput.fill("Gấu");
  await page.getByRole("button", { name: "Xong" }).click();

  // Hatched buddy appears in list with name "Gấu"
  await expect(pandaCard.getByText("Gấu")).toBeVisible();
});

test("3. Đi cùng Bin và hiển thị bạn nhỏ cạnh Bin trên trang Hôm nay", async () => {
  // Click "Đi cùng Bin" if not already following
  const pandaCard = bin(page).locator('[data-species="panda"]');
  const followBtn = pandaCard.getByRole("button", { name: /Đi cùng/ });
  if (await followBtn.isVisible()) {
    await followBtn.click();
  }

  // Close Bin Corner
  await bin(page).getByRole("button", { name: "Đóng" }).click();
  await expect(bin(page)).toHaveCount(0);

  // Today hero shows companion beside Bin
  await page.goto("/today");
  const buddyElement = page.getByTestId("buddy").first();
  await expect(buddyElement).toBeVisible();

  // Tap buddy to trigger cheer reaction
  await buddyElement.click();

  expect(errors).toEqual([]);
});

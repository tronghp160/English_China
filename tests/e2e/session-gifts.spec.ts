import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

// REDESIGN_V3 §9: the end of a session opens its gifts, a new level opens a dialog, and /review shows the "done" screen.
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

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  errors = watchErrors(page);
  await signUp(page, email, "Người Thử", { samples: false });
  const userId = (await userIdByEmail(email))!;
  const sb = admin();
  const { data: deck, error } = await sb.from("decks").insert({ owner_id: userId, name: "Quà E2E", language: "en" }).select("id").single();
  if (error) throw error;
  const { error: wordsError } = await sb.from("words").insert(
    WORDS.map(([term, meaning_vi], i) => ({
      deck_id: deck.id,
      created_by: userId,
      language: "en" as const,
      term,
      normalized: term,
      meaning_vi,
      created_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    })),
  );
  if (wordsError) throw wordsError;
  // 35 XP earned two days ago plus 10 XP for the five words added make 45: five right cards today reach 50 and open level 2
  const day = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
  const { error: statsError } = await sb.from("daily_stats").insert({ user_id: userId, day, reviews: 35, correct: 35, xp: 35 });
  if (statsError) throw statsError;
});

test.afterAll(async () => {
  await page.close();
  await deleteUserByEmail(email);
});

test("hết phiên ôn: 3 sao, quà được mở và lên cấp 2 có hộp thoại", async () => {
  await page.goto("/today"); // makes the cards of the new words
  await page.goto("/review");
  const group = page.getByRole("group", { name: "Bạn nhớ từ này thế nào?" });
  // every word has two cards, and a new card comes back once before the session ends
  const done = page.getByRole("heading", { name: "Xong phiên rồi!" });
  const flip = page.getByRole("button", { name: /Lật thẻ/ });
  for (let i = 0; i < 20; i++) {
    await flip.or(done).waitFor();
    if (await done.isVisible()) break;
    await flip.click();
    await group.getByRole("button", { name: /Nhớ/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Xong phiên rồi!" })).toBeVisible();
  await expect(page.getByRole("img", { name: "3 sao" })).toBeVisible();
  const gifts = page.getByRole("group", { name: "Phần thưởng của phiên" });
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Lên cấp 2!" })).toBeVisible({ timeout: 20_000 });
  await dialog.getByRole("button", { name: "Tuyệt vời!" }).click();
  await expect(dialog).toHaveCount(0);
  // behind the dialog the page is hidden from the accessibility tree, so the level bar is read after closing it
  await expect(gifts.getByRole("progressbar", { name: "Kinh nghiệm trong cấp này" })).toBeVisible();
  // every answer reached the server before the next test looks at what is still due
  await expect(page.getByText(/chưa gửi được/)).toHaveCount(0, { timeout: 30_000 });
  // after the dialog the level card shows the new level
  await expect(gifts.getByText("Cấp 2", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("/review khi hết thẻ: nhiệm vụ còn lại và gợi ý tiếp theo", async () => {
  // the reverse cards of the five words are still new: put every card aside so nothing is due
  const { error } = await admin().from("user_cards").update({ suspended: true }).eq("user_id", (await userIdByEmail(email))!);
  expect(error).toBeNull();
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Bạn đã ôn xong hôm nay." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nhiệm vụ còn lại hôm nay" })).toBeVisible();
  const next = page.getByRole("region", { name: "Gợi ý cho bạn" });
  await expect(next.getByRole("link", { name: /Hỏi gia sư/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Về trang Hôm nay" })).toBeVisible();
  expect(errors).toEqual([]);
});

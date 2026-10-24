import { expect, test, type Page } from "@playwright/test";
import { studyDay } from "../../lib/srs/streak";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

// REDESIGN_V3 §6: level bar and daily quests on Today, the phone bar with the review button in the middle,
// the floating add button only where it belongs.
test.describe.configure({ mode: "serial" });

const email = testEmail();
let page: Page;
let errors: string[];

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  errors = watchErrors(page);
  await signUp(page, email, "Người Thử", { samples: true });
  // Today: 25 reviews, all right, 6 new words, 40 XP. With the sample decks nothing is due yet, so all three quests are done.
  const userId = (await userIdByEmail(email))!;
  const day = studyDay(new Date(), "Asia/Ho_Chi_Minh");
  const { error } = await admin()
    .from("daily_stats")
    .upsert({ user_id: userId, day, reviews: 25, correct: 25, new_learned: 6, xp: 40 }, { onConflict: "user_id,day" });
  if (error) throw error;
});

test.afterAll(async () => {
  await page.close();
  await deleteUserByEmail(email);
});

test("hôm nay: thanh cấp độ và ba nhiệm vụ đã xong", async () => {
  await page.goto("/today");
  await expect(page.getByRole("progressbar", { name: "Kinh nghiệm trong cấp này" })).toBeVisible();
  await expect(page.getByText("Cấp 1", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("40/50 XP")).toBeVisible();
  const quests = page.getByRole("region", { name: "Nhiệm vụ hôm nay" });
  await expect(quests.getByText("3/3")).toBeVisible();
  await expect(quests.getByRole("button", { name: "Nhận 2 xương" })).toHaveCount(3);
});

test("nhận thưởng một nhiệm vụ: xương tăng và được lưu", async () => {
  const quests = page.getByRole("region", { name: "Nhiệm vụ hôm nay" });
  // 25 right answers = 2 bones before any reward
  await expect(quests.getByText("Xương: 2")).toBeVisible();
  await quests.getByRole("button", { name: "Nhận 2 xương" }).first().click();
  await expect(quests.getByText("Đã nhận 2 xương")).toBeVisible();
  await expect(quests.getByText("Xương: 4")).toBeVisible();
  await expect(quests.getByRole("button", { name: "Nhận 2 xương" })).toHaveCount(2);

  await page.reload();
  const again = page.getByRole("region", { name: "Nhiệm vụ hôm nay" });
  await expect(again.getByText("Đã nhận 2 xương")).toBeVisible();
  await expect(again.getByText("Xương: 4")).toBeVisible();
});

test("thanh dưới trên điện thoại: nút Ôn ở giữa, Nhóm nằm trong menu tài khoản", async () => {
  const bar = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(bar.getByRole("link", { name: /^Ôn ngay/ })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Hôm nay" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Bộ từ" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Luyện tập" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Gia sư" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Nhóm" })).toHaveCount(0);

  await page.getByRole("button", { name: "Tài khoản và cài đặt" }).click();
  await page.getByRole("menuitem", { name: "Nhóm" }).click();
  await expect(page).toHaveURL(/\/groups$/);
});

test("nút nổi chỉ có ở danh sách bộ từ và trang một bộ từ", async () => {
  await page.goto("/decks");
  await expect(page.getByRole("link", { name: "Tạo bộ từ" })).toBeVisible();
  await page.goto("/today");
  await expect(page.getByRole("link", { name: "Tạo bộ từ" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Thêm từ", exact: true }).and(page.locator("a.fixed"))).toHaveCount(0);

  await page.goto("/decks");
  await page.locator("main a[href^='/decks/']:not([href='/decks/new'])").first().click();
  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}$/);
  const fab = page.locator("a.fixed", { hasText: "Thêm từ" });
  await expect(fab).toBeVisible();
  const box = (await fab.boundingBox())!;
  const viewport = page.viewportSize()!;
  // above the bar: 88px from the bottom edge
  expect(Math.round(viewport.height - (box.y + box.height))).toBeGreaterThanOrEqual(80);
  expect(errors).toEqual([]);
});

test("thêm từ nhanh: gõ từ và chuyển trang đúng query", async () => {
  await page.goto("/today");
  await page.getByLabel("Từ muốn thêm").fill("resilient");
  await page.getByRole("button", { name: "Thêm", exact: true }).click();
  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}\/add\?term=resilient$/);
});

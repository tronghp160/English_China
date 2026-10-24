import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

// REDESIGN_V3 §5: pat Bin on Today, open "Góc của Bin", feed a bone (saved), see locked outfits.
test.describe.configure({ mode: "serial" });

const email = testEmail();
let page: Page;
let errors: string[];

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  errors = watchErrors(page);
  await signUp(page, email);
  // 50 right answers and 60 XP in the past: 5 bones in hand and level 2, with no streak.
  const userId = (await userIdByEmail(email))!;
  const { error } = await admin()
    .from("daily_stats")
    .insert({ user_id: userId, day: "2026-01-01", reviews: 50, correct: 50, new_learned: 0, xp: 60 });
  if (error) throw error;
});

test.afterAll(async () => {
  await page.close();
  await deleteUserByEmail(email);
});

const bin = (p: Page) => p.getByRole("dialog", { name: "Góc của Bin" });

test("vỗ về Bin rồi mở Góc của Bin từ lời thoại", async () => {
  await page.goto("/stats");
  await page.getByRole("button", { name: "Xoa đầu Bin" }).first().click();
  const play = page.getByRole("button", { name: "Chơi với Bin" });
  await expect(play).toBeVisible();
  await play.click();
  await expect(bin(page)).toBeVisible();
  await expect(bin(page).getByText("5 xương")).toBeVisible();
  await expect(bin(page).getByText("Cấp 2")).toBeVisible();
});

test("cho Bin ăn: số xương giảm và được lưu", async () => {
  await bin(page).getByRole("button", { name: "Cho ăn" }).click();
  await expect(bin(page).getByText("4 xương")).toBeVisible();
  await expect(bin(page).getByText("Tâm trạng:")).toBeVisible();

  // The count survives a reload: the feeding was saved on the server (the tile is enabled again once it is).
  await expect(bin(page).getByRole("button", { name: "Cho ăn" })).toBeEnabled();
  await page.reload();
  await page.getByRole("button", { name: "Tài khoản và cài đặt" }).click();
  await page.getByRole("menuitem", { name: "Góc của Bin" }).click();
  await expect(bin(page).getByText("4 xương")).toBeVisible();
});

test("trang phục chưa mở thì khóa và nói rõ điều kiện", async () => {
  await expect(bin(page).getByRole("button", { name: "Nơ hồng, mở khi cấp 3" })).toBeDisabled();
  await expect(bin(page).getByRole("button", { name: "Kính râm, mở khi chuỗi 7 ngày" })).toBeDisabled();
  await expect(bin(page).getByRole("button", { name: "Không mặc, đang mặc" })).toBeVisible();
});

test("hết xương: Bin buồn và có đường đi học", async () => {
  for (let left = 4; left > 0; left--) {
    await bin(page).getByRole("button", { name: "Cho ăn" }).click();
    await expect(bin(page).getByText(`${left - 1} xương`)).toBeVisible();
  }
  await bin(page).getByRole("button", { name: "Cho ăn" }).click();
  await expect(bin(page).getByText("Học thêm 10 câu đúng để có xương nhé.")).toBeVisible();
  await expect(bin(page).getByRole("link", { name: "Đi học" })).toBeVisible();
});

test("đóng Góc của Bin bằng nút Đóng", async () => {
  await bin(page).getByRole("button", { name: "Đóng" }).click();
  await expect(bin(page)).toBeHidden();
  expect(errors).toEqual([]);
});

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
  await signUp(page, email);
  userId = (await userIdByEmail(email))!;
  // 200 right answers -> 20 bones. 200 XP -> level 3.
  const { error } = await admin()
    .from("daily_stats")
    .insert({ user_id: userId, day: "2026-01-01", reviews: 200, correct: 200, new_learned: 0, xp: 200 });
  if (error) throw error;
});

test.afterAll(async () => {
  await page.close();
  await deleteUserByEmail(email);
});

const bin = (p: Page) => p.getByRole("dialog", { name: "Góc của Bin" });

async function openBinHome(p: Page) {
  await p.goto("/stats");
  await p.getByRole("button", { name: "Tài khoản và cài đặt" }).click();
  await p.getByRole("menuitem", { name: "Góc của Bin" }).click();
  await expect(bin(p)).toBeVisible();
}

test("mở Trang trí trong Góc của Bin và xem các vị trí", async () => {
  await openBinHome(page);
  await expect(bin(page).getByText("20 xương")).toBeVisible();

  await bin(page).getByRole("button", { name: "Trang trí" }).click();
  await expect(bin(page).getByRole("heading", { name: "Trang trí phòng" })).toBeVisible();

  // 6 tabs for slots
  await expect(bin(page).getByRole("tab", { name: "Bát ăn" })).toBeVisible();
  await expect(bin(page).getByRole("tab", { name: "Nệm" })).toBeVisible();
  await expect(bin(page).getByRole("tab", { name: "Tranh" })).toBeVisible();
  await expect(bin(page).getByRole("tab", { name: "Đồ chơi" })).toBeVisible();
  await expect(bin(page).getByRole("tab", { name: "Thảm" })).toBeVisible();
  await expect(bin(page).getByRole("tab", { name: "Góc phòng" })).toBeVisible();
});

test("mua Đệm tròn: xác nhận 2 lần, trừ xương và tự đặt vào phòng", async () => {
  await bin(page).getByRole("tab", { name: "Nệm" }).click();
  const cushion = bin(page).getByRole("button", { name: "Đệm tròn" });
  await expect(cushion).toBeVisible();
  await cushion.click();

  const buyBtn = bin(page).getByRole("button", { name: "Mua · 12 xương" });
  await expect(buyBtn).toBeVisible();
  await buyBtn.click();

  const confirmBtn = bin(page).getByRole("button", { name: "Chắc chắn mua?" });
  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();

  // Wait for buy and auto-place to complete on server
  await expect(bin(page).locator("[data-busy]")).toBeHidden();

  // Bones updated to 8 and item is marked as placed
  await expect(bin(page).getByText("8 xương")).toBeVisible();
  await expect(cushion).toContainText("Đang dùng");
});

test("tải lại trang: Đệm tròn vẫn đang dùng", async () => {
  await page.reload();
  await openBinHome(page);
  await expect(bin(page).getByText("8 xương")).toBeVisible();

  await bin(page).getByRole("button", { name: "Trang trí" }).click();
  await bin(page).getByRole("tab", { name: "Nệm" }).click();
  await expect(bin(page).getByRole("button", { name: "Đệm tròn" })).toContainText("Đang dùng");
});

test("món bị khóa cấp độ: Nệm mây hiện Cấp 6 và không có nút mua", async () => {
  const cloud = bin(page).getByRole("button", { name: "Nệm mây" });
  await expect(cloud).toBeVisible();
  await expect(cloud).toContainText("Cấp 6");
  await cloud.click();

  await expect(bin(page).getByText("Chưa mở khóa: Cấp 6")).toBeVisible();
  await expect(bin(page).getByRole("button", { name: /Mua/ })).toBeHidden();
});

test("đủ cấp nhưng thiếu xương: Bát vàng hiện Còn thiếu … xương", async () => {
  // Update XP to reach level 8 (XP >= 1400)
  const { error } = await admin().from("daily_stats").update({ xp: 1500 }).eq("user_id", userId);
  if (error) throw error;

  await page.reload();
  await openBinHome(page);
  await expect(bin(page).getByText("Cấp 8")).toBeVisible();
  await expect(bin(page).getByText("8 xương")).toBeVisible();

  await bin(page).getByRole("button", { name: "Trang trí" }).click();
  // Default tab is "Bát ăn"
  const goldBowl = bin(page).getByRole("button", { name: "Bát vàng" });
  await expect(goldBowl).toBeVisible();
  await goldBowl.click();

  // Price is 40 bones, user has 8 bones -> short 32 bones
  const shortBtn = bin(page).getByRole("button", { name: "Còn thiếu 32 xương" });
  await expect(shortBtn).toBeDisabled();
  await expect(bin(page).getByRole("link", { name: "Đi học" })).toBeVisible();
});

test("responsive 390px và không có lỗi console", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(bin(page)).toBeVisible();

  // Close with back button or Close button
  const backBtn = bin(page).getByRole("button", { name: "Quay lại" });
  await expect(backBtn).toBeVisible();
  await backBtn.click();
  await expect(bin(page).getByRole("button", { name: "Trang trí" })).toBeVisible();

  await bin(page).getByRole("button", { name: "Đóng" }).click();
  await expect(bin(page)).toBeHidden();

  expect(errors).toEqual([]);
});

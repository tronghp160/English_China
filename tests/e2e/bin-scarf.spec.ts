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
  await signUp(page, email, "Người Thử", { samples: true });
  userId = (await userIdByEmail(email))!;
  // 600 right answers -> 60 bones
  const { error } = await admin()
    .from("daily_stats")
    .insert({ user_id: userId, day: "2026-01-01", reviews: 600, correct: 600, new_learned: 0, xp: 600 });
  if (error) throw error;
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

test("1. vào Trang trí -> chip Đặc biệt -> thấy Khăn giữ chuỗi và Đang có 0/2", async () => {
  await openBinHome(page);
  await bin(page).getByRole("button", { name: "Trang trí" }).click();
  await expect(bin(page).getByRole("heading", { name: "Trang trí phòng" })).toBeVisible();

  const specialTab = bin(page).getByRole("tab", { name: "Đặc biệt" });
  await expect(specialTab).toBeVisible();
  await specialTab.click();

  await expect(bin(page).getByRole("heading", { name: "Khăn giữ chuỗi" })).toBeVisible();
  await expect(bin(page).getByText("Đang có 0/2")).toBeVisible();
});

test("2. mua khăn: xác nhận 2 lần -> trừ 20 xương và hiện Đang có 1/2", async () => {
  const buyBtn = bin(page).getByRole("button", { name: "Mua · 20 xương" });
  await expect(buyBtn).toBeVisible();
  await buyBtn.click();

  const confirmBtn = bin(page).getByRole("button", { name: "Chắc chắn mua? (20 xương)" });
  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();

  await expect(bin(page).getByText("Đang có 1/2")).toBeVisible();
  // Header bones decreased from 60 to 40
  await expect(bin(page).getByText("40 xương")).toBeVisible();
});

test("3. tải lại Today -> thấy 'Có 1 khăn giữ chuỗi'", async () => {
  await bin(page).getByRole("button", { name: "Đóng" }).click();
  await expect(bin(page)).toHaveCount(0);

  await page.goto("/today");
  // On Today card, verify "Có 1 khăn giữ chuỗi" is visible
  await expect(page.getByText("Có 1 khăn giữ chuỗi")).toBeVisible();
  expect(errors).toEqual([]);
});

import { expect, test, type Page } from "@playwright/test";
import { studyDay } from "../../lib/srs/streak";
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

  // User has 25 reviews on current study day
  const day = studyDay(new Date(), "Asia/Ho_Chi_Minh");
  const { error } = await admin()
    .from("daily_stats")
    .insert({ user_id: userId, day, reviews: 25, correct: 25, new_learned: 0, xp: 50 });
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

test("mở Góc của Bin, vào Đi dạo và cho Bin đi dạo", async () => {
  await openBinHome(page);
  await bin(page).getByRole("button", { name: "Đi dạo" }).click();
  await expect(bin(page).getByRole("heading", { name: "Đi dạo", exact: true })).toBeVisible();
  await expect(bin(page).getByText("Bin muốn đi dạo!")).toBeVisible();

  await bin(page).getByRole("button", { name: "Cho Bin đi dạo" }).click();
  await expect(bin(page).getByText(/đang ở/)).toBeVisible();
});

test("Bin về: trang Today hiện thẻ Đón Bin, đón Bin nhận bưu thiếp và xương", async () => {
  // Update returns_at to past so trip is back
  const { error } = await admin()
    .from("bin_trips")
    .update({ returns_at: new Date(Date.now() - 60_000).toISOString() })
    .eq("user_id", userId);
  if (error) throw error;

  await page.goto("/today");
  await expect(page.getByText("Bin về rồi!")).toBeVisible();

  // Click Đón Bin from Today page to open Bin's corner directly at trip panel
  await page.getByRole("button", { name: "Đón Bin" }).click();
  await expect(bin(page)).toBeVisible();

  const collectBtn = bin(page).getByRole("button", { name: "Đón Bin" });
  await expect(collectBtn).toBeVisible();
  await collectBtn.click();

  // Postcard, story lines, and rewards appear
  await expect(bin(page).getByText("Chuyện chuyến đi")).toBeVisible({ timeout: 10000 });
  await expect(bin(page).getByText("Phần thưởng")).toBeVisible({ timeout: 10000 });
  await expect(bin(page).getByText(/\+\d+\s+xương/)).toBeVisible();

  // Finish collection
  await bin(page).getByRole("button", { name: "Xong" }).click();
  await expect(bin(page).getByText(/Hôm nay Bin đi dạo rồi/)).toBeVisible();
});

test("mở /bin/postcards thấy Đã sưu tầm 1/24 nơi", async () => {
  await page.goto("/bin/postcards");
  await expect(page.getByRole("heading", { name: "Bưu thiếp của Bin" })).toBeVisible();
  await expect(page.getByText("Đã sưu tầm 1/24 nơi")).toBeVisible();
});

test("mở lại Đi dạo thấy thông báo đã đi dạo hôm nay", async () => {
  await openBinHome(page);
  await bin(page).getByRole("button", { name: "Đi dạo" }).click();
  await expect(bin(page).getByText("Hôm nay Bin đi dạo rồi. Mai đi tiếp nhé.")).toBeVisible();
});

test("không có lỗi console", () => {
  expect(errors).toEqual([]);
});

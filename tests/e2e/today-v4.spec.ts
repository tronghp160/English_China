import { expect, test, type Page } from "@playwright/test";
import { studyDay } from "../../lib/srs/streak";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

// PLAN §5.1: Today v4 E2E test verifying QuickAdd, 26-week desktop Heatmap, and zero-remaining review stats.
test.describe.configure({ mode: "serial" });

const email = testEmail();
let page: Page;
let errors: string[];

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  errors = watchErrors(page);
  await signUp(page, email, "Người Thử", { samples: true });

  const userId = (await userIdByEmail(email))!;
  const day = studyDay(new Date(), "Asia/Ho_Chi_Minh");
  // "Done for today" needs no due cards and no new cards left: the sample decks only have new cards,
  // so today's new-card allowance (daily_new_limit) is marked as used.
  const { data: settings } = await admin().from("user_settings").select("daily_new_limit").eq("user_id", userId).single();
  const { error } = await admin()
    .from("daily_stats")
    .upsert(
      { user_id: userId, day, reviews: 25, correct: 20, new_learned: settings?.daily_new_limit ?? 15, xp: 40 },
      { onConflict: "user_id,day" },
    );
  if (error) throw error;
});

test.afterAll(async () => {
  await page.close();
  await deleteUserByEmail(email);
});

test("thêm từ nhanh: điều hướng tới /decks/<uuid>/add?term=resilient", async () => {
  await page.goto("/today");
  await page.getByLabel("Từ muốn thêm").fill("resilient");
  await page.getByRole("button", { name: "Thêm", exact: true }).click();
  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}\/add\?term=resilient$/);
});

test("ở 1280px thẻ Hoạt động có heatmap 26 cột hiển thị", async () => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/today");
  const heatmap26 = page.locator('[role=img][aria-label^="Hoạt động 26 tuần"]');
  await expect(heatmap26).toBeVisible();
  const heatmap12 = page.locator('[role=img][aria-label^="Hoạt động 12 tuần"]');
  await expect(heatmap12).not.toBeVisible();
});

test("khi đã ôn xong hiện dòng Bạn đã ôn … lượt, nhớ đúng …%", async () => {
  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Hôm nay ôn xong rồi" })).toBeVisible(); // one heading per layout, the other is hidden
  await expect(page.getByText(/Bạn đã ôn 25 lượt, nhớ đúng 80%/)).toBeVisible();
  expect(errors).toEqual([]);
});

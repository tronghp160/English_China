import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, ENRICH_RESILIENT, magicLinkPath, testEmail, userIdByEmail, watchErrors } from "./helpers";

// PLAN §14 Phase 6: sign in → add a word with AI → review it. One account, three steps in order.
test.describe.configure({ mode: "serial" });

const email = testEmail();
let page: Page;
let errors: string[];

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  errors = watchErrors(page);
});

test.afterAll(async () => {
  await page.close();
  await deleteUserByEmail(email);
});

test("đăng nhập bằng link email và hoàn tất màn hình chào", async () => {
  // Don't send a real email (Supabase's built-in mailer allows only a few per hour).
  await page.route("**/auth/v1/otp**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.goto("/login");
  await page.getByRole("button", { name: /Đăng nhập không cần mật khẩu/ }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Gửi link đăng nhập" }).click();
  await expect(page.getByText(`Đã gửi link đăng nhập tới ${email}.`)).toBeVisible();
  await page.unroute("**/auth/v1/otp**");

  // Open the link the email would contain.
  await page.goto(await magicLinkPath(email));
  await expect(page).toHaveURL(/\/welcome/);
  await page.getByLabel("Tên hiển thị").fill("Người Thử");
  await page.getByLabel("Tên người dùng").fill(`e2e_${Date.now().toString(36)}`);
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("radio", { name: /Tiếng Anh/ }).click();
  await page.getByRole("button", { name: "Bắt đầu học" }).click();
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByText("Chào Người Thử")).toBeVisible();
});

test("thêm từ bằng AI", async () => {
  // Third-party APIs are mocked unless E2E_REAL_AI=1 (needs ANTHROPIC_API_KEY and PEXELS_API_KEY).
  if (process.env.E2E_REAL_AI !== "1") {
    await page.route("**/api/ai/enrich", (route) => route.fulfill({ json: ENRICH_RESILIENT }));
    await page.route("**/api/images/search**", (route) => route.fulfill({ json: { results: [] } }));
  }
  await page.goto("/decks");
  await page.getByRole("link", { name: /Từ vựng tiếng Anh của tôi/ }).click();
  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}$/);
  await page.getByRole("link", { name: "Thêm từ" }).first().click();

  await page.getByLabel("Từ", { exact: true }).fill("resilient");
  await page.getByRole("button", { name: /Gợi ý/ }).click();
  await expect(page.getByLabel("Nghĩa tiếng Việt")).toHaveValue(/kiên cường/);
  await page.getByRole("button", { name: "Lưu từ" }).click();
  await expect(page.getByText("Đã lưu resilient")).toBeVisible();

  await page.goBack();
  await page.reload();
  await expect(page.getByRole("link", { name: /resilient/ })).toBeVisible();
});

test("ôn từ vừa thêm và cập nhật chuỗi ngày", async () => {
  await page.goto("/today");
  await page.getByRole("link", { name: /Bắt đầu ôn/ }).click();
  await expect(page).toHaveURL(/\/review/);
  await expect(page.getByText("resilient").first()).toBeVisible();
  // A new card answered "Nhớ" enters a short learning step and comes back in the same session.
  const done = page.getByText("Xong phiên rồi!");
  let answers = 0;
  for (; answers < 5 && !(await done.isVisible()); answers++) {
    await page.getByRole("button", { name: /Lật thẻ/ }).click();
    await expect(page.getByText(/kiên cường/).first()).toBeVisible();
    await page.getByRole("group", { name: "Bạn nhớ từ này thế nào?" }).getByRole("button", { name: /Nhớ/ }).click();
    await expect(done.or(page.getByRole("button", { name: /Lật thẻ/ }))).toBeVisible();
  }
  await expect(done).toBeVisible();

  // Every answer reaches the database (via the outbox) and the streak starts.
  const sb = admin();
  const userId = (await userIdByEmail(email))!;
  await expect
    .poll(async () => (await sb.from("review_logs").select("rating").eq("user_id", userId)).data?.length ?? 0)
    .toBe(answers);
  await page.goto("/today");
  await expect(page.getByText("Chuỗi ngày")).toBeVisible();
  await expect(page.getByText(/^1$/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

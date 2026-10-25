import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, ENRICH_RESILIENT, testEmail, userIdByEmail, watchErrors } from "./helpers";

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

test("đăng ký bằng email + mật khẩu (không cần xác nhận email) và hoàn tất màn hình chào", async () => {
  await page.goto("/signup");
  await page.getByLabel("Tên của bạn").fill("Người Thử");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Matkhau123");
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page).toHaveURL(/\/welcome/);
  await expect(page.getByLabel("Tên hiển thị")).toHaveValue("Người Thử");
  await page.getByLabel("Tên người dùng").fill(`e2e_${Date.now().toString(36)}`);
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("radio", { name: /Tiếng Anh/ }).click();
  await page.getByRole("switch", { name: "Thêm bộ từ mẫu" }).click(); // start from an empty notebook
  await page.getByRole("button", { name: "Tiếp tục" }).click(); // the summary
  await page.getByRole("button", { name: /Bắt đầu học/ }).click();
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByRole("heading", { name: /Chào buổi .+, Thử!/ })).toBeVisible();
});

test("thêm từ bằng AI", async () => {
  // Third-party APIs are mocked unless E2E_REAL_AI=1 (needs ANTHROPIC_API_KEY and PEXELS_API_KEY; the free dictionary is live then too).
  if (process.env.E2E_REAL_AI !== "1") {
    await page.route("**/api/ai/enrich", (route) => route.fulfill({ json: ENRICH_RESILIENT }));
    await page.route("**/api/dict", (route) => route.fulfill({ json: { result: null } }));
    // Dictionary and shared cache have nothing, so the word goes to the AI batch queue.
    await page.route("**/api/lookup", (route) => route.fulfill({ json: { result: null, source: null } }));
    await page.route("**/api/ai/enrich-batch", (route) =>
      route.fulfill({ json: { outcomes: [{ term: "resilient", ok: true, result: ENRICH_RESILIENT.result, cached: false }] } }),
    );
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

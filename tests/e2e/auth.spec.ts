import { expect, test } from "@playwright/test";
import { admin, deleteUserByEmail, magicLinkPath, signUp, testEmail, watchErrors } from "./helpers";

const PASSWORD = "Matkhau123";

test.describe("đăng ký, đăng nhập bằng mật khẩu", () => {
  const emails: string[] = [];
  const fresh = () => {
    const e = testEmail();
    emails.push(e);
    return e;
  };
  test.afterAll(async () => {
    for (const e of emails) await deleteUserByEmail(e);
  });

  test("đăng nhập bằng email + mật khẩu, sai mật khẩu thì báo lỗi", async ({ page }) => {
    const errors = watchErrors(page);
    const email = fresh();
    await admin().auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("SaiMatKhau1");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.getByText("Email hoặc mật khẩu không đúng.")).toBeVisible();

    await page.getByLabel("Mật khẩu", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/welcome/); // new account → onboarding
    expect(errors).toEqual([]);
  });

  test("form đăng ký kiểm tra dữ liệu và báo đã gửi email xác nhận", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill("ban@gmail");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("ngan");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByText("Email chưa đúng định dạng")).toBeVisible();
    await expect(page.getByText("Mật khẩu cần ít nhất 8 ký tự")).toBeVisible();

    // Show/hide toggle
    await page.getByRole("button", { name: "Hiện mật khẩu" }).click();
    await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveAttribute("type", "text");

    // Supabase would email a confirmation link: answer like it does, without sending mail.
    let body: { email?: string; password?: string } = {};
    await page.route("**/auth/v1/signup**", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({
        json: { id: crypto.randomUUID(), aud: "authenticated", role: "", email: body.email, identities: [{ id: "x" }], created_at: new Date().toISOString() },
      });
    });
    const email = testEmail();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByText(`Gần xong! Kiểm tra email ${email}.`)).toBeVisible();
    expect(body).toMatchObject({ email, password: PASSWORD });

    // An address that already has an account comes back without identities.
    await page.unroute("**/auth/v1/signup**");
    await page.route("**/auth/v1/signup**", (route) =>
      route.fulfill({ json: { id: crypto.randomUUID(), aud: "authenticated", role: "", email, identities: [], created_at: new Date().toISOString() } }),
    );
    await page.getByRole("button", { name: "Dùng email khác" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByText("Email này đã có tài khoản.", { exact: false })).toBeVisible();
  });

  test("quên mật khẩu → đặt mật khẩu mới → đăng nhập bằng mật khẩu mới", async ({ page, context }) => {
    const errors = watchErrors(page);
    const email = fresh();
    await signUp(page, email); // account made with an email link, no password yet

    await context.clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("link", { name: "Quên mật khẩu?" }).click();
    await expect(page).toHaveURL(/\/forgot-password\?email=/);
    await expect(page.getByLabel("Email")).toHaveValue(email);
    await page.route("**/auth/v1/recover**", (route) => route.fulfill({ json: {} }));
    await page.getByRole("button", { name: "Gửi link đặt lại mật khẩu" }).click();
    await expect(page.getByText(`Nếu ${email} có tài khoản Sổ Từ`)).toBeVisible();

    // The reset email's link signs the user in and lands on /reset-password.
    await page.goto(await magicLinkPath(email, "/reset-password"));
    await expect(page.getByRole("heading", { name: "Đặt mật khẩu mới" })).toBeVisible();
    await page.getByLabel("Mật khẩu mới", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Nhập lại mật khẩu mới").fill(PASSWORD + "x");
    await page.getByRole("button", { name: "Lưu mật khẩu" }).click();
    await expect(page.getByText("Hai mật khẩu chưa khớp")).toBeVisible();
    await page.getByLabel("Nhập lại mật khẩu mới").fill(PASSWORD);
    await page.getByRole("button", { name: "Lưu mật khẩu" }).click();
    await expect(page).toHaveURL(/\/today/);

    await context.clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/today/);
    expect(errors).toEqual([]);
  });

  test("đổi mật khẩu trong Cài đặt", async ({ page, context }) => {
    const email = fresh();
    await signUp(page, email);
    await page.goto("/settings");
    await page.getByLabel("Mật khẩu mới", { exact: true }).fill("DoiMatKhau9");
    await page.getByLabel("Nhập lại mật khẩu mới").fill("DoiMatKhau9");
    await page.getByRole("button", { name: "Lưu mật khẩu" }).click();
    await expect(page.getByText("Đã lưu mật khẩu mới")).toBeVisible();

    await context.clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("DoiMatKhau9");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/today/);
  });

  test("trang đặt lại mật khẩu khi link đã hết hạn; đã đăng nhập thì /signup chuyển về /today", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { name: "Link đã hết hạn" })).toBeVisible();

    await signUp(page, fresh());
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/today/);
  });
});

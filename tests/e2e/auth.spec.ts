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

  test("form đăng ký kiểm tra dữ liệu, vào thẳng app không cần xác nhận email", async ({ page, context }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill("ban@gmail");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("ngan");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByText("Nhập tên hiển thị")).toBeVisible();
    await expect(page.getByText("Email chưa đúng định dạng")).toBeVisible();
    await expect(page.getByText("Mật khẩu cần ít nhất 8 ký tự")).toBeVisible();

    // Show/hide toggle
    await page.getByRole("button", { name: "Hiện mật khẩu" }).click();
    await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveAttribute("type", "text");

    const email = fresh();
    await page.getByLabel("Tên của bạn").fill("Người Thử");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page).toHaveURL(/\/welcome/);

    // The same address again → already has an account.
    await context.clearCookies();
    await page.goto("/signup");
    await page.getByLabel("Tên của bạn").fill("Người Khác");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByText("Email này đã có tài khoản.", { exact: false }).first()).toBeVisible();
  });

  test("tài khoản tạo lúc còn bật xác nhận email vẫn đăng nhập được", async ({ page }) => {
    const email = fresh();
    await admin().auth.admin.createUser({ email, password: PASSWORD, email_confirm: false });
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/welcome/);
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

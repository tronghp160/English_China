import { expect, test } from "@playwright/test";
import { testEmail } from "./helpers";

// REDESIGN_V3 §9: the sign-in pages. Bin covers its eyes for the password, peeks when it is shown, droops on a wrong
// answer; the tabs move between the two pages; the sign-up form shows how strong the password is.

const bin = (page: import("@playwright/test").Page) => page.locator("svg.bin:visible").first();

test("đăng nhập: Bin che mắt khi gõ mật khẩu, hé mắt khi hiện mật khẩu, buồn khi sai", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Chào mừng trở lại!" })).toBeVisible();
  await expect(bin(page)).toBeVisible();

  await page.getByLabel("Email").fill(testEmail());
  await expect(bin(page)).not.toHaveAttribute("data-action", /.+/);

  await page.getByLabel("Mật khẩu", { exact: true }).click();
  await expect(bin(page)).toHaveAttribute("data-action", "coverEyes");

  await page.getByRole("button", { name: "Hiện mật khẩu" }).click();
  await expect(bin(page)).toHaveAttribute("data-action", "peek");
  await page.getByRole("button", { name: "Ẩn mật khẩu" }).click();
  await expect(bin(page)).toHaveAttribute("data-action", "coverEyes");

  // leaving the field uncovers the eyes
  await page.getByLabel("Email").click();
  await expect(bin(page)).not.toHaveAttribute("data-action", /.+/);

  await page.getByLabel("Mật khẩu", { exact: true }).fill("SaiMatKhau1");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByText("Email hoặc mật khẩu không đúng.")).toBeVisible();
  await expect(bin(page)).toHaveAttribute("data-action", "droop");
  // the panel and the phone band each have one; only one of them is on screen
  await expect(page.locator("p:visible", { hasText: "Hình như sai rồi…" })).toBeVisible();

  // typing again lifts the droop
  await page.getByLabel("Email").click();
  await expect(bin(page)).not.toHaveAttribute("data-action", /.+/);
});

test("hai tab Đăng nhập | Đăng ký chuyển trang, trang quên mật khẩu có nút quay lại", async ({ page }) => {
  await page.goto("/login");
  const tabs = page.getByRole("navigation", { name: "Chọn trang" });
  await expect(tabs.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("aria-current", "page");
  await tabs.getByRole("link", { name: "Đăng ký" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "Tạo sổ từ miễn phí" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Đăng ký" })).toHaveAttribute("aria-current", "page");

  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: "Quên mật khẩu à? Không sao" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Chọn trang" })).toHaveCount(0);
  await page.getByRole("link", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("đăng ký: thanh độ mạnh mật khẩu và danh sách điều kiện tích dần", async ({ page }) => {
  await page.goto("/signup");
  const password = page.getByLabel("Mật khẩu", { exact: true });

  await password.fill("hocmoingay");
  await expect(page.getByText("Mật khẩu hơi yếu")).toBeVisible();
  await expect(page.getByText("Thêm số để mạnh hơn")).toBeVisible();
  await expect(page.getByText("Ít nhất 8 ký tự (đủ)")).toBeVisible();
  await expect(page.getByText("Có cả chữ và số (chưa đủ)")).toBeVisible();

  await password.fill("hocmoingay1");
  await expect(page.getByText("Mật khẩu khá ổn")).toBeVisible();
  await expect(page.getByText("Có cả chữ và số (đủ)")).toBeVisible();

  await password.fill("HocMoiNgay1");
  await expect(page.getByText("Mật khẩu mạnh")).toBeVisible();
});

test("đăng ký: lỗi hiện ngay khi rời ô, ô đúng có dấu tích", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill("ban@gmail");
  await page.getByLabel("Tên của bạn").click();
  await expect(page.getByText("Email chưa đúng định dạng")).toBeVisible();

  await page.getByLabel("Email").fill("ban@gmail.com");
  await page.getByLabel("Tên của bạn").fill("Minh Anh");
  await page.getByLabel("Mật khẩu", { exact: true }).click();
  await expect(page.getByText("Email chưa đúng định dạng")).toHaveCount(0);
});

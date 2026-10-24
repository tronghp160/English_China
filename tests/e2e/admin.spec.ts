import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

// /admin: hidden from everyone else, then usable once the account is granted (app_admins).
test.describe.configure({ mode: "serial" });

const email = testEmail();
const otherEmail = testEmail();
let page: Page;
let errors: string[];
let otherId = "";

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ locale: "vi-VN", reducedMotion: "reduce" });
  errors = watchErrors(page);
  await signUp(page, email, "Quản Trị Thử", { samples: false });
  const sb = admin();
  const { data, error } = await sb.auth.admin.createUser({ email: otherEmail, password: "Matkhau123", email_confirm: true });
  if (error) throw error;
  otherId = data.user.id;
  // the profile row comes from the sign-up trigger; give the other account a public deck to moderate
  await expect.poll(async () => (await sb.from("profiles").select("id").eq("id", otherId)).data?.length ?? 0).toBe(1);
  const { error: deckError } = await sb.from("decks").insert({ owner_id: otherId, name: "Bộ công khai E2E", language: "en", visibility: "public" });
  if (deckError) throw deckError;
});

test.afterAll(async () => {
  await page.close();
  await deleteUserByEmail(otherEmail);
  await deleteUserByEmail(email);
});

test("không phải quản trị viên thì /admin là trang 404", async () => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Quản trị", exact: true })).toHaveCount(0);
  await page.goto("/today");
  await page.getByRole("button", { name: "Tài khoản và cài đặt" }).click();
  await expect(page.getByRole("menuitem", { name: "Quản trị" })).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("được cấp quyền: khóa rồi mở khóa người dùng, ẩn bộ từ công khai, cấp và gỡ quyền", async () => {
  const myId = (await userIdByEmail(email))!;
  const { error } = await admin().from("app_admins").insert({ user_id: myId });
  expect(error).toBeNull();

  await page.goto("/today");
  await page.getByRole("button", { name: "Tài khoản và cài đặt" }).click();
  await page.getByRole("menuitem", { name: "Quản trị" }).click();
  await expect(page.getByRole("heading", { name: "Quản trị", exact: true })).toBeVisible();
  await expect(page.getByText("Người dùng", { exact: true }).first()).toBeVisible();

  // users: find the other account, lock it, unlock it
  await page.goto(`/admin?tab=users&q=${encodeURIComponent(otherEmail)}`);
  const row = page.getByRole("listitem").filter({ hasText: otherEmail });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Khóa" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Khóa tài khoản" }).click();
  await expect(row.getByText("Đã khóa")).toBeVisible();
  const { data: banned } = await admin().auth.admin.getUserById(otherId);
  expect(banned.user?.banned_until).toBeTruthy();
  await row.getByRole("button", { name: "Mở khóa" }).click();
  await expect(row.getByText("Đã khóa")).toHaveCount(0);
  // my own row has no buttons
  await page.goto(`/admin?tab=users&q=${encodeURIComponent(email)}`);
  await expect(page.getByRole("listitem").filter({ hasText: email }).getByRole("button")).toHaveCount(0);

  // public decks: hide one from Khám phá
  await page.goto("/admin?tab=decks");
  const deck = page.getByRole("listitem").filter({ hasText: "Bộ công khai E2E" });
  await deck.getByRole("button", { name: "Ẩn khỏi Khám phá" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Ẩn bộ từ" }).click();
  await expect(page.getByText("Đã ẩn bộ từ.")).toBeVisible();
  await expect(deck).toHaveCount(0);
  const { data: hidden } = await admin().from("decks").select("visibility").eq("owner_id", otherId).single();
  expect(hidden?.visibility).toBe("private");

  // admins: grant the other account by email, then take it back
  await page.goto("/admin?tab=admins");
  await page.getByLabel("Email của người được cấp quyền").fill(otherEmail);
  await page.getByRole("button", { name: "Cấp quyền" }).click();
  const granted = page.getByRole("listitem").filter({ hasText: otherEmail });
  await expect(granted).toBeVisible();
  await granted.getByRole("button", { name: "Gỡ quyền" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Gỡ quyền" }).click();
  await expect(granted).toHaveCount(0);
  expect(errors).toEqual([]);
});

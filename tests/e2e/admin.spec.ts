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

test("không phải quản trị viên thì /admin là trang 404 và /api/admin/users/[id]/export trả về 404", async () => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Quản trị", exact: true })).toHaveCount(0);
  await page.goto("/today");
  await page.getByRole("button", { name: "Tài khoản và cài đặt" }).click();
  await expect(page.getByRole("menuitem", { name: "Quản trị" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  const exportRes = await page.request.get(`/api/admin/users/${otherId}/export`);
  expect(exportRes.status()).toBe(404);
});

test("được cấp quyền: quản lý người dùng, từ vựng, bộ từ và cuộc trò chuyện", async () => {
  const myId = (await userIdByEmail(email))!;
  const sb = admin();
  const { error } = await sb.from("app_admins").insert({ user_id: myId });
  expect(error).toBeNull();

  // Create a private deck for otherId with a word "resilient" having examples and personal note
  const { data: privDeck, error: privErr } = await sb.from("decks").insert({
    owner_id: otherId,
    name: "Bộ riêng tư E2E",
    language: "en",
    visibility: "private",
  }).select().single();
  expect(privErr).toBeNull();

  const { error: wordErr } = await sb.from("words").insert({
    deck_id: privDeck.id,
    created_by: otherId,
    term: "resilient",
    normalized: "resilient",
    meaning_vi: "kiên cường",
    examples: [{ text: "She is resilient.", vi: "Cô ấy kiên cường." }],
    personal_note: "Ghi chú riêng tư của người dùng",
    language: "en",
  });
  expect(wordErr).toBeNull();

  // Create a chat thread with a message
  const { data: thread, error: threadErr } = await sb.from("chat_threads").insert({
    user_id: otherId,
    title: "Trò chuyện E2E",
    language: "en",
  }).select().single();
  expect(threadErr).toBeNull();

  await sb.from("chat_messages").insert({
    thread_id: thread.id,
    user_id: otherId,
    role: "user",
    parts: [{ type: "text", text: "Xin chào gia sư" }],
  });

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
  const { data: banned } = await sb.auth.admin.getUserById(otherId);
  expect(banned.user?.banned_until).toBeTruthy();
  await row.getByRole("button", { name: "Mở khóa" }).click();
  await expect(row.getByText("Đã khóa")).toHaveCount(0);

  // user detail page: words tab
  await page.goto(`/admin/users/${otherId}?tab=words`);
  await expect(page.getByText("resilient")).toBeVisible();
  // click details to expand
  await page.getByText("resilient").click();
  await expect(page.getByText("Cô ấy kiên cường.")).toBeVisible();
  await expect(page.getByText("Ghi chú riêng tư của người dùng")).toBeVisible();

  // admin deck page: see word and delete it
  await page.goto(`/admin/decks/${privDeck.id}`);
  await expect(page.getByText("resilient")).toBeVisible();
  await page.getByText("resilient").click();
  await page.getByRole("button", { name: "Xóa từ" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Xóa từ" }).click();
  await expect(page.getByText("resilient")).toHaveCount(0);

  // user detail page: chat tab
  await page.goto(`/admin/users/${otherId}?tab=chat`);
  await expect(page.getByText("Trò chuyện E2E")).toBeVisible();
  await expect(page.getByText("Xin chào gia sư")).toBeVisible();

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
  const { data: hidden } = await sb.from("decks").select("visibility").eq("owner_id", otherId).eq("name", "Bộ công khai E2E").single();
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

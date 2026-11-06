import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

// "Tâm sự" is open to admins and to the accounts an admin switched it on for. Everybody else sees nothing of it.
test.describe.configure({ mode: "serial" });

const adminEmail = testEmail();
const userEmail = testEmail();
const rlsEmail = testEmail();
let adminPage: Page;
let userPage: Page;
let adminErrors: string[];
let userErrors: string[];
let userId = "";

const toggle = (p: Page) => p.getByRole("switch", { name: "Cho phép dùng Tâm sự với Nam" });
const grantRow = async () => (await admin().from("clone_access").select("user_id, granted_by").eq("user_id", userId)).data ?? [];

/** Every door to /tam-su: the sidebar and menu entry, the card on /chat, the line on /lien-he. */
async function expectNoDoors(p: Page) {
  for (const path of ["/today", "/chat", "/lien-he"]) {
    await p.goto(path);
    await expect(p.locator('a[href="/tam-su"]')).toHaveCount(0); // hidden links count too
  }
  await p.goto("/chat");
  await expect(p.getByRole("heading", { name: "Tâm sự với Nam (bản AI)" })).toHaveCount(0);
  await p.getByRole("button", { name: "Tài khoản và cài đặt" }).click();
  await expect(p.getByRole("menuitem", { name: /Tâm sự với/ })).toHaveCount(0);
  await p.keyboard.press("Escape");
}

test.beforeAll(async ({ browser }) => {
  adminPage = await browser.newPage({ locale: "vi-VN", reducedMotion: "reduce" });
  userPage = await browser.newPage({ locale: "vi-VN", reducedMotion: "reduce" });
  adminErrors = watchErrors(adminPage);
  userErrors = watchErrors(userPage);
  await signUp(adminPage, adminEmail, "Quản Trị Thử", { samples: false });
  await signUp(userPage, userEmail, "Người Dùng Thử", { samples: false });
  const adminId = (await userIdByEmail(adminEmail))!;
  userId = (await userIdByEmail(userEmail))!;
  const { error } = await admin().from("app_admins").insert({ user_id: adminId });
  if (error) throw error;
});

test.afterAll(async () => {
  await adminPage.close();
  await userPage.close();
  for (const e of [adminEmail, userEmail, rlsEmail]) await deleteUserByEmail(e);
});

test("mặc định chưa bật: không thấy lối vào nào, /tam-su là 404, /api/clone trả 404 và không gọi model", async () => {
  await expectNoDoors(userPage);

  const res = await userPage.goto("/tam-su");
  expect(res?.status()).toBe(404);
  await expect(userPage.getByText("Không tìm thấy trang này.")).toBeVisible();
  await expect(userPage.getByRole("heading", { level: 1, name: "Nam (bản AI)" })).toHaveCount(0);

  // The route says no before it calls the model (this would be a real AI call if it did not).
  const api = await userPage.request.post("/api/clone", {
    data: { messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "alo" }] }] },
  });
  expect(api.status()).toBe(404);
  expect(await api.json()).toEqual({ error: "Tính năng này hiện chưa mở cho bạn.", kind: "forbidden" });
  expect(await grantRow()).toEqual([]);
  expect(userErrors).toEqual([]);
});

test("người dùng thường không tự bật được: ghi vào clone_access bị từ chối, chỉ đọc được hàng của mình", async () => {
  // A real sign-in with the browser key, like the app's own client: no service role.
  const sb = admin();
  const password = "Matkhau123";
  const created = await sb.auth.admin.createUser({ email: rlsEmail, password, email_confirm: true });
  if (created.error) throw created.error;
  const me = created.data.user.id;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email: rlsEmail, password });
  expect(signedIn.error).toBeNull();

  const ownInsert = await client.from("clone_access").insert({ user_id: me });
  expect(ownInsert.error?.code).toBe("42501"); // permission denied
  const otherInsert = await client.from("clone_access").insert({ user_id: userId });
  expect(otherInsert.error?.code).toBe("42501");
  const upsert = await client.from("clone_access").upsert({ user_id: me });
  expect(upsert.error?.code).toBe("42501");
  expect((await client.from("clone_access").delete().eq("user_id", me)).error?.code).toBe("42501");

  // Nothing was written, and the person sees no row of anybody else.
  const mine = await client.from("clone_access").select("user_id");
  expect(mine.error).toBeNull();
  expect(mine.data).toEqual([]);
  expect((await sb.from("clone_access").select("user_id").eq("user_id", me)).data).toEqual([]);
});

test("quản trị viên bật cho người dùng: người đó thấy mục Tâm sự và nhắn được", async () => {
  // The admin's own switch is on and locked: admins always have it.
  const adminId = (await userIdByEmail(adminEmail))!;
  await adminPage.goto(`/admin/users/${adminId}`);
  await expect(toggle(adminPage)).toBeChecked();
  await expect(toggle(adminPage)).toBeDisabled();

  await adminPage.goto(`/admin/users/${userId}`);
  await expect(adminPage.getByRole("heading", { name: "Tâm sự", exact: true })).toBeVisible();
  await expect(toggle(adminPage)).not.toBeChecked();
  await toggle(adminPage).click();
  await expect(adminPage.getByText("Đã bật Tâm sự cho người này.")).toBeVisible();
  await expect(toggle(adminPage)).toBeChecked();
  expect((await grantRow()).map((r) => r.user_id)).toEqual([userId]);

  // The list shows a small label and can filter by it.
  await adminPage.goto("/admin?tab=users&status=clone");
  const row = adminPage.getByRole("listitem").filter({ hasText: userEmail });
  await expect(row).toBeVisible();
  await expect(row.getByText("Tâm sự", { exact: true })).toBeVisible();
  await expect(adminPage.getByRole("listitem").filter({ hasText: adminEmail })).toHaveCount(0); // admins carry no label

  // The person now has every door, and can chat (the answer is scripted here).
  if (process.env.E2E_REAL_AI !== "1") {
    await userPage.route("**/api/clone", async (route) => {
      if (route.request().method() !== "POST") return route.fulfill({ status: 204 });
      const chunks = [
        { type: "start", messageId: "msg_e2e_access" },
        { type: "start-step" },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: "ừ nghe nè" },
        { type: "text-end", id: "t1" },
        { type: "finish-step" },
        { type: "finish" },
      ];
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
        body: chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n",
      });
    });
  }
  await userPage.goto("/chat");
  await expect(userPage.getByRole("heading", { name: "Tâm sự với Nam (bản AI)" })).toBeVisible();
  await userPage.getByRole("button", { name: "Tài khoản và cài đặt" }).click();
  await expect(userPage.getByRole("menuitem", { name: "Tâm sự với Nam (bản AI)" })).toBeVisible();
  await userPage.keyboard.press("Escape");
  await userPage.goto("/lien-he");
  await expect(userPage.getByRole("link", { name: "trò chuyện với bản AI của mình" })).toBeVisible();

  const res = await userPage.goto("/tam-su");
  expect(res?.status()).toBe(200);
  await expect(userPage.getByRole("heading", { level: 1, name: "Nam (bản AI)" })).toBeVisible();
  await userPage.getByLabel("Tin nhắn cho Nam (bản AI)").fill("alo");
  await userPage.getByRole("button", { name: "Gửi" }).click();
  await expect(userPage.getByRole("list", { name: "Tin nhắn", exact: true }).getByText("alo")).toBeVisible();
  expect(adminErrors).toEqual([]);
  expect(userErrors).toEqual([]);
});

test("tắt giữa lúc đang chat: lượt gửi tiếp theo báo chưa mở và khóa ô nhập; tải lại là 404", async () => {
  // The person has the page open (no scripted answer from here on: the real route must say no without a model call).
  await userPage.unroute("**/api/clone");
  await userPage.goto("/tam-su");
  await expect(userPage.getByRole("heading", { level: 1, name: "Nam (bản AI)" })).toBeVisible();

  await adminPage.goto(`/admin/users/${userId}`);
  await expect(toggle(adminPage)).toBeChecked();
  await toggle(adminPage).click();
  await expect(adminPage.getByText("Đã tắt Tâm sự cho người này.")).toBeVisible();
  await expect(toggle(adminPage)).not.toBeChecked();
  expect(await grantRow()).toEqual([]);

  const box = userPage.getByLabel("Tin nhắn cho Nam (bản AI)");
  await box.fill("còn đó không");
  await userPage.getByRole("button", { name: "Gửi" }).click();
  const alert = userPage.locator('[role="alert"]', { hasText: "Tính năng này hiện chưa mở cho bạn." });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("button", { name: "Thử lại" })).toHaveCount(0); // nothing to retry
  await expect(box).toBeDisabled();
  await expect(userPage.getByRole("button", { name: "Gửi" })).toBeDisabled();

  // A reload (the page asks first, because the chat holds a message) lands on the plain 404.
  userPage.once("dialog", (d) => void d.accept());
  await userPage.reload();
  await expect(userPage.getByText("Không tìm thấy trang này.")).toBeVisible();
  await expectNoDoors(userPage);

  // Both switches left a trace in the audit log, with no conversation in it.
  await expect
    .poll(async () => {
      const { data } = await admin().from("admin_audit_log").select("action").eq("target_user_id", userId).in("action", ["clone_on", "clone_off"]);
      return (data ?? []).map((r) => r.action).sort();
    })
    .toEqual(["clone_off", "clone_on"]);
  expect(adminErrors).toEqual([]);
});

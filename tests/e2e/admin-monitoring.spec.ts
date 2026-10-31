import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

test.describe.configure({ mode: "serial" });

const adminEmail = testEmail();
const userBEmail = testEmail();

let ctxA: BrowserContext;
let pageA: Page;
let errorsA: string[];

let ctxB: BrowserContext;
let pageB: Page;
let errorsB: string[];

let adminId = "";
let userBId = "";

test.beforeAll(async ({ browser }) => {
  // Context A: Admin
  ctxA = await browser.newContext({ locale: "vi-VN", reducedMotion: "reduce" });
  pageA = await ctxA.newPage();
  errorsA = watchErrors(pageA);
  await signUp(pageA, adminEmail, "Admin Tester", { samples: false });
  adminId = (await userIdByEmail(adminEmail))!;

  // Grant admin permissions to adminId
  const sb = admin();
  await sb.from("app_admins").insert({ user_id: adminId });

  // Context B: User B with Vercel Geo headers
  ctxB = await browser.newContext({
    locale: "vi-VN",
    reducedMotion: "reduce",
    extraHTTPHeaders: {
      "x-forwarded-for": "113.22.33.44",
      "x-vercel-ip-city": encodeURIComponent("Đà Nẵng"),
      "x-vercel-ip-country": "VN",
      "x-vercel-ip-country-region": "DN",
      "x-vercel-ip-latitude": "16.0678",
      "x-vercel-ip-longitude": "108.2208",
    },
  });
  pageB = await ctxB.newPage();
  errorsB = watchErrors(pageB);
  await signUp(pageB, userBEmail, "User Danang", { samples: false });
  userBId = (await userIdByEmail(userBEmail))!;
});

test.afterAll(async () => {
  await ctxA?.close();
  await ctxB?.close();
  if (adminEmail) await deleteUserByEmail(adminEmail);
  if (userBEmail) await deleteUserByEmail(userBEmail);
});

test("POST /api/presence trả về 401 khi chưa đăng nhập", async ({ playwright, baseURL }) => {
  const anonRequest = await playwright.request.newContext({ baseURL });
  const res = await anonRequest.post("/api/presence", {
    data: { path: "/today" },
  });
  expect(res.status()).toBe(401);
});

test("ghi nhận vị trí và phiên đăng nhập của người dùng B", async () => {
  const sb = admin();
  // Poll until user_presence is updated with Đà Nẵng
  await expect
    .poll(
      async () => {
        const { data } = await sb
          .from("user_presence")
          .select("city")
          .eq("user_id", userBId)
          .maybeSingle();
        return data?.city;
      },
      { timeout: 15_000, intervals: [500, 1000] },
    )
    .toBe("Đà Nẵng");

  // login_events should have exactly 1 record for user B
  const { data: logins } = await sb
    .from("login_events")
    .select("id")
    .eq("user_id", userBId);
  expect(logins?.length).toBe(1);

  // Reload user B page: login_events must still be 1 (deduped within session)
  await pageB.reload();
  await pageB.waitForLoadState("networkidle");

  const { data: loginsAfter } = await sb
    .from("login_events")
    .select("id")
    .eq("user_id", userBId);
  expect(loginsAfter?.length).toBe(1);
});

test("quản trị viên thấy B trên tab Đang online và danh sách người dùng", async () => {
  // Check online tab
  await pageA.goto("/admin?tab=online");
  await expect(pageA.getByText("User Danang")).toBeVisible();
  await expect(pageA.getByText("Đà Nẵng").first()).toBeVisible();

  // Check users tab with query for user B
  await pageA.goto(`/admin?tab=users&q=${encodeURIComponent(userBEmail)}`);
  await expect(pageA.getByText("User Danang")).toBeVisible();
  // Online dot has sr-only text "Đang online"
  await expect(pageA.getByText("Đang online").first()).toBeAttached();
  await expect(pageA.getByRole("button", { name: "Khóa" })).toBeVisible();
});

test("quản trị viên xem tab Đăng nhập & vị trí của B và kiểm tra offline", async () => {
  const sb = admin();
  await pageA.goto(`/admin/users/${userBId}?tab=login`);
  await expect(pageA.getByText("Đà Nẵng").first()).toBeVisible();
  await expect(pageA.getByText("113.22.33.44").first()).toBeVisible();

  // Maps link contains coordinates
  const mapLink = pageA.locator('a[href*="16.0678"]');
  await expect(mapLink.first()).toBeVisible();

  // Update last_seen_at to 20 mins ago via service role
  const twentyMinsAgo = new Date(Date.now() - 20 * 60_000).toISOString();
  await sb
    .from("user_presence")
    .update({ last_seen_at: twentyMinsAgo })
    .eq("user_id", userBId);

  await pageA.reload();
  await expect(pageA.getByText("Offline").first()).toBeVisible();
});

test("tab Thú cưng hiển thị đúng cấp, trang phục đang mặc và trang phục khóa", async () => {
  const sb = admin();
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // Insert 300 XP (level 4) and set outfit to "bow" (Nơ hồng)
  await sb.from("daily_stats").insert({
    user_id: userBId,
    day: todayStr,
    reviews: 20,
    correct: 18,
    new_learned: 5,
    xp: 300,
  });

  const { data: bSettings } = await sb
    .from("user_settings")
    .select("prefs")
    .eq("user_id", userBId)
    .maybeSingle();

  const currentPrefs =
    typeof bSettings?.prefs === "object" && bSettings.prefs !== null
      ? bSettings.prefs
      : {};

  await sb
    .from("user_settings")
    .update({
      prefs: { ...currentPrefs, bin_outfit: "bow" },
    })
    .eq("user_id", userBId);

  await pageA.goto(`/admin/users/${userBId}?tab=pet`);
  await expect(pageA.getByText("Cấp 4").first()).toBeVisible();
  await expect(pageA.getByText("Nơ hồng").first()).toBeVisible();
  await expect(pageA.getByText("Đang mặc").first()).toBeVisible();
  await expect(pageA.getByText(/Khóa/i).first()).toBeVisible();
});

test("người dùng thường (B) không truy cập được các tab quản trị", async () => {
  await pageB.goto("/admin?tab=online");
  await expect(pageB.getByRole("heading", { name: "Quản trị", exact: true })).toHaveCount(0);

  await pageB.goto("/admin?tab=audit");
  await expect(pageB.getByRole("heading", { name: "Quản trị", exact: true })).toHaveCount(0);
});

test("nhật ký ghi nhận thao tác khóa tài khoản và xem lịch sử đăng nhập", async () => {
  // A locks user B
  await pageA.goto(`/admin?tab=users&q=${encodeURIComponent(userBEmail)}`);
  const lockBtn = pageA.getByRole("button", { name: "Khóa" });
  await lockBtn.click();
  await pageA.getByRole("button", { name: "Khóa tài khoản" }).click();
  await expect(pageA.getByText("Đã khóa tài khoản.")).toBeVisible();

  // A views user B login tab
  await pageA.goto(`/admin/users/${userBId}?tab=login`);
  await expect(pageA.getByText("Đà Nẵng").first()).toBeVisible();

  // Check audit tab
  await pageA.goto("/admin?tab=audit");
  // In the log table, not the action filter (its <option>s carry the same labels).
  const log = pageA.getByRole("table");
  await expect(log.getByText("Khóa tài khoản").first()).toBeVisible();
  await expect(log.getByText("Xem lịch sử đăng nhập").first()).toBeVisible();
});

test("không có lỗi trang không mong muốn", () => {
  const fatalErrorsA = errorsA.filter(
    (e) => !e.includes("404") && !e.includes("favicon") && !e.includes("posthog"),
  );
  const fatalErrorsB = errorsB.filter(
    (e) => !e.includes("404") && !e.includes("favicon") && !e.includes("posthog"),
  );
  expect(fatalErrorsA).toEqual([]);
  expect(fatalErrorsB).toEqual([]);
});

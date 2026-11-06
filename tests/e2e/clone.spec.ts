import { expect, test, type Page } from "@playwright/test";
import { deleteUserByEmail, signUp, testEmail, watchErrors } from "./helpers";

// Every test signs up its own account (a second sign-up with the same address skips onboarding).
const emails: string[] = [];
const freshEmail = () => {
  const e = testEmail();
  emails.push(e);
  return e;
};

test.afterAll(async () => {
  for (const e of emails) await deleteUserByEmail(e);
});

/** An answer in the AI SDK UI message stream format (SSE): the given text as one message. */
function stream(text: string) {
  const chunks = [
    { type: "start", messageId: `msg_e2e_${Math.random().toString(36).slice(2, 8)}` },
    { type: "start-step" },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: text },
    { type: "text-end", id: "t1" },
    { type: "finish-step" },
    { type: "finish" },
  ];
  return chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
}

type Body = { messages: { role: string; parts: { type: string; text: string }[] }[] };

/** Mocks POST /api/clone (unless E2E_REAL_AI=1) and remembers what the page sent. */
async function mockClone(page: Page, reply: (body: Body) => string) {
  const sent: Body[] = [];
  if (process.env.E2E_REAL_AI !== "1") {
    await page.route("**/api/clone", async (route) => {
      if (route.request().method() !== "POST") return route.fulfill({ status: 204 });
      const body = route.request().postDataJSON() as Body;
      sent.push(body);
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
        body: stream(reply(body)),
      });
    });
  }
  return sent;
}

test("bản AI: thẻ giới thiệu, nhắn tin, mỗi đoạn một bong bóng, lưu trên máy, xóa khi bắt đầu lại", async ({ page }) => {
  const errors = watchErrors(page);
  await signUp(page, freshEmail());
  const sent = await mockClone(page, () => "ừ nghe nè\n\nkể tui nghe đi, nay có chuyện gì");
  const apiCalls: string[] = [];
  page.on("request", (r) => {
    if (/\/rest\/v1\/|\/api\/chat/.test(r.url()) && r.method() !== "GET") apiCalls.push(`${r.method()} ${r.url()}`);
  });

  await page.goto("/tam-su");
  await expect(page.getByRole("heading", { level: 1, name: "Nam (bản AI)" })).toBeVisible();
  await expect(page).toHaveTitle(/Tâm sự với Nam/);

  // The first-visit card says it is an AI, where the chat is kept and who answers.
  const intro = page.getByRole("region", { name: "Trước khi nhắn" });
  await expect(intro).toBeVisible();
  await expect(intro).toContainText("Đây là bản AI của Nam");
  await expect(intro).toContainText("chỉ lưu trên trình duyệt này");
  await expect(intro).toContainText("quản trị viên không đọc được");
  await expect(intro).toContainText("gửi tới dịch vụ AI");

  // The empty chat greets (no API call) and offers suggestions.
  await expect(page.getByText(/tui là bản AI của Nam/)).toBeVisible();
  await page.getByRole("button", { name: "Kể tui nghe một chuyện vui đi" }).click();

  const list = page.getByRole("list", { name: "Tin nhắn", exact: true });
  await expect(list.getByText("Kể tui nghe một chuyện vui đi")).toBeVisible();
  if (process.env.E2E_REAL_AI !== "1") {
    // Each paragraph of the answer is its own bubble.
    const answer = list.getByRole("listitem").filter({ hasText: "Nam (bản AI)" });
    await expect(answer.getByText("ừ nghe nè", { exact: true })).toBeVisible();
    await expect(answer.getByText("kể tui nghe đi, nay có chuyện gì")).toBeVisible();
    const bubbles = answer.locator("[data-check-overflow]");
    await expect(bubbles).toHaveCount(2);
    expect(sent).toHaveLength(1);
    expect(sent[0].messages.at(-1)).toMatchObject({ role: "user", parts: [{ type: "text", text: "Kể tui nghe một chuyện vui đi" }] });
  } else {
    await expect(list.locator("li", { hasText: "Nam (bản AI)" }).first()).toBeVisible({ timeout: 45_000 });
  }

  // Close the card; it stays closed after a reload, and the conversation is still there (kept in this browser).
  await intro.getByRole("button", { name: "Đóng phần giải thích" }).click();
  await expect(intro).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Nam (bản AI)" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Tin nhắn", exact: true }).getByText("Kể tui nghe một chuyện vui đi")).toBeVisible();
  await expect(page.getByRole("region", { name: "Trước khi nhắn" })).toBeHidden();

  // Starting again asks first, then clears the screen and the browser's copy.
  await page.getByRole("button", { name: "Cuộc trò chuyện mới" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Máy chủ không giữ bản nào");
  await page.getByRole("button", { name: "Xóa và bắt đầu lại" }).click();
  await expect(page.getByText(/tui là bản AI của Nam/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/tui là bản AI của Nam/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Tin nhắn", exact: true })).toHaveCount(0);

  // Nothing was written to the database or the tutor's API from this page.
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
});

test("bản AI: gõ tin, nhận trả lời, rủ qua Gia sư và mở Gia sư với câu hỏi đã điền sẵn", async ({ page }) => {
  test.skip(process.env.E2E_REAL_AI === "1", "needs a scripted answer");
  const errors = watchErrors(page);
  await signUp(page, freshEmail());
  await mockClone(page, () => "Câu này dài, hỏi Gia sư Bin cho kỹ nha.");

  await page.goto("/tam-su");
  await page.getByLabel("Tin nhắn cho Nam (bản AI)").fill("giải thích thì hiện tại hoàn thành giùm");
  await page.getByRole("button", { name: "Gửi" }).click();
  const link = page.getByRole("link", { name: /Hỏi .* cho kỹ/ });
  await expect(link).toBeVisible();

  await link.click();
  await expect(page).toHaveURL(/\/chat$/); // the question was moved into the box and dropped from the address
  await expect(page.getByLabel("Tin nhắn cho gia sư")).toHaveValue("giải thích thì hiện tại hoàn thành giùm");
  expect(errors).toEqual([]);
});

test("bản AI: lỗi từ máy chủ hiện câu báo và nút Thử lại", async ({ page }) => {
  test.skip(process.env.E2E_REAL_AI === "1", "needs a scripted answer");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signUp(page, freshEmail());
  let calls = 0;
  await page.route("**/api/clone", async (route) => {
    if (route.request().method() !== "POST") return route.fulfill({ status: 204 });
    calls++;
    if (calls === 1) {
      return route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "Hôm nay bạn đã dùng hết lượt hỏi AI. Mai quay lại nhé.", kind: "quota" }) });
    }
    await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" }, body: stream("ừ, tui đây") });
  });

  await page.goto("/tam-su");
  await page.getByLabel("Tin nhắn cho Nam (bản AI)").fill("alo");
  await page.getByRole("button", { name: "Gửi" }).click();
  // (Next's route announcer is a role="alert" too)
  const alert = page.locator('[role="alert"]', { hasText: "hết lượt hỏi AI" });
  await expect(alert).toContainText("hết lượt hỏi AI");
  await alert.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByText("ừ, tui đây")).toBeVisible();
  expect(errors).toEqual([]);
});

test("bản AI: lối vào từ trang Gia sư, menu tài khoản và trang Liên hệ; khung gia sư nổi không che trang", async ({ page }) => {
  const errors = watchErrors(page);
  await signUp(page, freshEmail());

  await page.goto("/chat");
  await expect(page.getByRole("heading", { name: "Tâm sự với Nam (bản AI)" })).toBeVisible();
  await page.getByRole("link", { name: "Mở trò chuyện" }).click();
  await expect(page).toHaveURL(/\/tam-su$/);
  await expect(page.getByRole("heading", { level: 1, name: "Nam (bản AI)" })).toBeVisible();
  // The floating tutor button has its own page; it stays away from this one.
  await expect(page.getByRole("button", { name: "Mở gia sư AI" })).toHaveCount(0);

  // Phones have no sidebar: the avatar menu carries the entry.
  await page.getByRole("button", { name: "Tài khoản và cài đặt" }).click();
  await expect(page.getByRole("menuitem", { name: "Tâm sự với Nam (bản AI)" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/lien-he");
  await page.getByRole("link", { name: "trò chuyện với bản AI của mình" }).click();
  await expect(page).toHaveURL(/\/tam-su$/);
  expect(errors).toEqual([]);
});

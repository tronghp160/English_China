import { expect, test, type Page } from "@playwright/test";
import { deleteUserByEmail, grantClone, signUp, testEmail, watchErrors } from "./helpers";

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

/** A fresh account with "Tâm sự" switched on: it is off for everybody by default (clone-access.spec.ts covers that). */
async function signUpAllowed(page: Page) {
  const email = freshEmail();
  await signUp(page, email);
  await grantClone(email);
}

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

test("bản AI: thẻ giới thiệu, nhắn tin, mỗi đoạn một bong bóng, trình duyệt không giữ gì", async ({ page }) => {
  const errors = watchErrors(page);
  await signUpAllowed(page);
  const sent = await mockClone(page, () => "ừ nghe nè\n\nkể tui nghe đi, nay có chuyện gì");
  const apiCalls: string[] = [];
  page.on("request", (r) => {
    if (/\/rest\/v1\/|\/api\/chat/.test(r.url()) && r.method() !== "GET") apiCalls.push(`${r.method()} ${r.url()}`);
  });

  // An earlier version kept conversations and a "card closed" flag in localStorage: opening the page deletes them.
  await page.evaluate(() => {
    localStorage.setItem("sotu:clone:v1:old-user", '[{"id":"1","role":"user","text":"tin cũ"}]');
    localStorage.setItem("sotu:clone:intro:v1", "1"); // used to hide the card for good
  });
  await page.goto("/tam-su");
  await expect(page.getByRole("heading", { level: 1, name: "Nam (bản AI)" })).toBeVisible();
  await expect(page).toHaveTitle(/Tâm sự với Nam/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("sotu:clone:v1:old-user"))).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("sotu:clone:intro:v1"))).toBeNull();

  // The card is there even though the old flag said "closed": it says that the conversation is stored, who can read it
  // and who answers. It has no close button, and it is part of the message area (it scrolls, it is not pinned).
  const intro = page.getByRole("region", { name: "Về cuộc trò chuyện này" });
  const expectIntro = async () => {
    await expect(intro).toBeVisible();
    await expect(intro).toContainText(
      "Vì cuộc trò chuyện có thể liên quan đến nhiều vấn đề cá nhân, nên khi bạn thoát ứng dụng, chuyển trang hoặc bắt đầu cuộc trò chuyện mới, nội dung cũ sẽ tự động được xóa nhằm đảm bảo quyền riêng tư cho bạn.",
    );
    await expect(intro).toContainText("Đây là bản AI của Nam, có thể nhầm. Tin nhắn được gửi tới dịch vụ AI (");
    await expect(intro).toContainText(") để trả lời.");
  };
  await expectIntro();
  await expect(intro.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Đóng phần giải thích" })).toHaveCount(0);
  expect(await intro.evaluate((el) => getComputedStyle(el).position)).toBe("static");
  await expect(page.getByText("Không ai đọc được", { exact: false })).toHaveCount(0);

  // The empty chat greets in the owner's voice (the display name is "Người Thử": greeted by the last word) and offers suggestions.
  await expect(page.getByText("Hello Thử nha, tui là bản AI của Nam á. Muốn tâm sự hay hỏi gì cứ nhắn tui nha")).toBeVisible();
  await page.getByRole("button", { name: "Kể tui nghe một chuyện vui đi" }).click();

  const list = page.getByRole("list", { name: "Tin nhắn", exact: true });
  await expect(list.getByText("Kể tui nghe một chuyện vui đi")).toBeVisible();
  if (process.env.E2E_REAL_AI !== "1") {
    // Each paragraph of the answer is its own bubble.
    const answer = list.getByRole("listitem").filter({ hasText: "Nam (bản AI)" });
    await expect(answer.getByText("ừ nghe nè", { exact: true })).toBeVisible();
    await expect(answer.getByText("kể tui nghe đi, nay có chuyện gì")).toBeVisible();
    await expect(answer.locator("[data-check-overflow]")).toHaveCount(2);
    expect(sent).toHaveLength(1);
    expect(sent[0].messages.at(-1)).toMatchObject({ role: "user", parts: [{ type: "text", text: "Kể tui nghe một chuyện vui đi" }] });
  } else {
    await expect(list.locator("li", { hasText: "Nam (bản AI)" }).first()).toBeVisible({ timeout: 45_000 });
  }

  // Nothing of the conversation is kept in the browser: no key of the old kind, no message text in any storage or cookie.
  const stored = await page.evaluate(() => {
    const all = (s: Storage) => Object.keys(s).map((k) => `${k}=${s.getItem(k)}`);
    return { entries: [...all(localStorage), ...all(sessionStorage), document.cookie], keys: Object.keys(localStorage) };
  });
  expect(stored.keys.filter((k) => k.startsWith("sotu:clone:"))).toEqual([]); // no chat, and no "card closed" flag either
  expect(stored.entries.join("\n")).not.toContain("Kể tui nghe một chuyện vui đi");
  expect(stored.entries.join("\n")).not.toContain("ừ nghe nè");

  // The card stays at the top of the conversation while it goes on (it is part of what scrolls).
  await expectIntro();

  // With a message of the user on the screen, a reload asks first (the browser's own box); accepting loses the chat.
  const asked = page.waitForEvent("dialog");
  const reloaded = page.reload();
  const dialog = await asked;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.accept();
  await reloaded;
  await expect(page.getByText(/tui là bản AI của Nam á/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Tin nhắn", exact: true })).toHaveCount(0);
  await expectIntro(); // shown again at the start of the new conversation

  // "Cuộc trò chuyện mới" clears at once: no confirmation box; the card is there again; an empty chat does not ask before a reload.
  await page.getByRole("button", { name: "Kể tui nghe một chuyện vui đi" }).click();
  await expect(list.getByText("Kể tui nghe một chuyện vui đi")).toBeVisible();
  await page.getByRole("button", { name: "Cuộc trò chuyện mới" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByText(/tui là bản AI của Nam á/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Tin nhắn", exact: true })).toHaveCount(0);
  await expectIntro();
  let askedWhenEmpty = false;
  page.on("dialog", (d) => {
    askedWhenEmpty = true;
    void d.accept();
  });
  await page.reload();
  await expect(page.getByText(/tui là bản AI của Nam á/)).toBeVisible();
  await expectIntro();
  expect(askedWhenEmpty).toBe(false);

  // Still nothing in the browser after all of that.
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("sotu:clone:")))).toEqual([]);

  // The page itself wrote nothing to the database or the tutor's API (storing is /api/clone's job, on the server).
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
});

test("bản AI: rời trang trong app là mất cuộc trò chuyện, không bị chặn", async ({ page }) => {
  test.skip(process.env.E2E_REAL_AI === "1", "needs a scripted answer");
  const errors = watchErrors(page);
  await signUpAllowed(page);
  await mockClone(page, () => "ừ nghe nè");
  let asked = false;
  page.on("dialog", (d) => {
    asked = true;
    void d.dismiss();
  });

  await page.goto("/tam-su");
  await page.getByLabel("Tin nhắn cho Nam (bản AI)").fill("tin này sẽ mất");
  await page.getByRole("button", { name: "Gửi" }).click();
  await expect(page.getByRole("list", { name: "Tin nhắn", exact: true }).getByText("tin này sẽ mất")).toBeVisible();

  // Moving to another page inside the app is not blocked.
  await page.getByRole("link", { name: "Hôm nay" }).first().click();
  await expect(page).toHaveURL(/\/today/);
  expect(asked).toBe(false);

  // Coming back starts empty.
  await page.getByRole("button", { name: "Tài khoản và cài đặt" }).click();
  await page.getByRole("menuitem", { name: "Tâm sự với Nam (bản AI)" }).click();
  await expect(page).toHaveURL(/\/tam-su$/);
  await expect(page.getByText(/tui là bản AI của Nam á/)).toBeVisible();
  await expect(page.getByText("tin này sẽ mất")).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Tin nhắn", exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("bản AI: gõ tin, nhận trả lời, rủ qua Gia sư và mở Gia sư với câu hỏi đã điền sẵn", async ({ page }) => {
  test.skip(process.env.E2E_REAL_AI === "1", "needs a scripted answer");
  const errors = watchErrors(page);
  await signUpAllowed(page);
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
  await signUpAllowed(page);
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
  await signUpAllowed(page);

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

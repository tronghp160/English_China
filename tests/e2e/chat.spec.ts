import { expect, test } from "@playwright/test";
import { admin, createMockedThread, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

const email = testEmail();
const email2 = testEmail();

test.afterAll(async () => {
  await deleteUserByEmail(email);
  await deleteUserByEmail(email2);
});

/** A tutor answer in the AI SDK UI message stream format (SSE): text + one suggestWord card. */
function tutorStream(deck: { id: string; name: string }) {
  const chunks = [
    { type: "start", messageId: "msg_e2e_answer" },
    { type: "start-step" },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: "**Câu 1:** từ *resilient* nghĩa là gì?\n\n- gợi ý: cây mọc xuyên qua đá" },
    { type: "text-end", id: "t1" },
    { type: "tool-input-available", toolCallId: "c1", toolName: "suggestWord", input: { term: "resilience", meaning_vi: "sự kiên cường" } },
    {
      type: "tool-output-available",
      toolCallId: "c1",
      output: { term: "resilience", reading: "/rɪˈzɪliəns/", meaning_vi: "sự kiên cường", decks: [deck] },
    },
    { type: "finish-step" },
    { type: "finish" },
  ];
  return chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
}

test("gia sư: hỏi từ ô chat, nhận câu trả lời và mở form thêm từ được gợi ý", async ({ page }) => {
  const errors = watchErrors(page);
  await signUp(page, email);
  const userId = await userIdByEmail(email);
  const { data: decks } = await admin().from("decks").select("id, name").eq("owner_id", userId!);
  const deck = decks![0];

  if (process.env.E2E_REAL_AI !== "1") {
    await page.route("**/api/chat", async (route) => {
      await createMockedThread(email, route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
        body: tutorStream(deck),
      });
    });
  }

  await page.getByRole("link", { name: "Gia sư" }).first().click();
  await expect(page).toHaveURL(/\/chat$/);
  // One box: a suggestion chip opens a new conversation with the question already sent.
  await page.getByRole("button", { name: /Kiểm tra nhanh 5 từ đến hạn/ }).click();
  await expect(page).toHaveURL(/\/chat\?c=[0-9a-f-]{36}$/);
  await expect(page.getByRole("list", { name: "Tin nhắn" }).getByText("Kiểm tra nhanh mình 5 từ đến hạn ôn nhé")).toBeVisible();

  if (process.env.E2E_REAL_AI === "1") {
    await expect(page.locator("li", { hasText: "Gia sư:" }).first()).toBeVisible({ timeout: 45_000 });
  } else {
    await expect(page.getByText("Câu 1:")).toBeVisible();
    await expect(page.getByText("sự kiên cường")).toBeVisible();
    await page.getByRole("link", { name: `Thêm vào ${deck.name}` }).click();
    await expect(page).toHaveURL(new RegExp(`/decks/${deck.id}/add\\?term=resilience`));
    await expect(page.getByLabel("Từ", { exact: true })).toHaveValue("resilience");
  }

  // The thread is listed and can be deleted.
  await page.goto("/chat");
  const row = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: /Xóa cuộc trò chuyện/ }) });
  await expect(row).toHaveCount(1);
  page.once("dialog", (d) => void d.accept());
  await row.getByRole("button", { name: /Xóa cuộc trò chuyện/ }).click();
  await expect(page.getByText("Đã xóa cuộc trò chuyện")).toBeVisible();
  await expect(row).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("gia sư: gõ câu hỏi ở trang Gia sư, câu trả lời rỗng hiện nút Thử lại", async ({ page }) => {
  const errors = watchErrors(page);
  await signUp(page, email2);
  // An answer stream with no text at all (what Gemini sometimes sent): the bubble must not stay blank.
  const empty = [{ type: "start", messageId: "msg_e2e_empty" }, { type: "start-step" }, { type: "finish-step" }, { type: "finish" }];
  await page.route("**/api/chat", async (route) => {
    await createMockedThread(email2, route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
      body: empty.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n",
    });
  });
  await page.goto("/chat");
  await page.getByLabel("Tin nhắn cho gia sư").fill("phân biệt dog và cat");
  await page.getByRole("button", { name: "Gửi" }).click();
  await expect(page).toHaveURL(/\/chat\?c=[0-9a-f-]{36}$/);
  await expect(page.getByRole("list", { name: "Tin nhắn" }).getByText("phân biệt dog và cat")).toBeVisible();
  await expect(page.getByText(/chưa trả lời được tin này/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
  expect(errors).toEqual([]);
});

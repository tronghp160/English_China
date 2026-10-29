import { expect, test } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

const email = testEmail();

test.afterAll(async () => {
  await deleteUserByEmail(email);
});

function tutorStream() {
  const chunks = [
    { type: "start", messageId: "msg_widget_answer" },
    { type: "start-step" },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: "Chào bạn! Đây là câu trả lời thử nghiệm từ gia sư AI." },
    { type: "text-end", id: "t1" },
    { type: "finish-step" },
    { type: "finish" },
  ];
  return chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
}

test("tutor widget: floating panel chat, fullscreen on mobile, escape key, and persistence", async ({
  page,
}) => {
  const errors = watchErrors(page);

  // 4. Khách chưa đăng nhập ở /: không có nút "Mở gia sư AI"
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Mở gia sư AI/ })).toHaveCount(0);

  // Sign up and go to /today
  await signUp(page, email);
  await page.goto("/today");

  if (process.env.E2E_REAL_AI !== "1") {
    await page.route("**/api/chat", async (route) => {
      const body = route.request().postDataJSON();
      if (body?.id && body?.message) {
        const userId = await userIdByEmail(email);
        if (userId) {
          await admin()
            .from("chat_messages")
            .insert([
              {
                thread_id: body.id,
                id: body.message.id,
                user_id: userId,
                role: "user",
                parts: body.message.parts,
              },
              {
                thread_id: body.id,
                id: "msg_widget_answer",
                user_id: userId,
                role: "assistant",
                parts: [{ type: "text", text: "Chào bạn! Đây là câu trả lời thử nghiệm từ gia sư AI." }],
              },
            ]);
        }
      }
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
        body: tutorStream(),
      });
    });
  }

  // 1. Thấy nút launcher → bấm → thấy dialog có input khung nổi, không thấy Zalo
  const launcher = page.getByRole("button", { name: "Mở gia sư AI" });
  await expect(launcher).toBeVisible();
  await launcher.click();

  const panel = page.locator("#tutor-panel");
  const panelInput = page.getByLabel("Tin nhắn cho gia sư (khung nổi)");
  await expect(panelInput).toBeVisible();
  await expect(panel.getByText("Zalo")).toHaveCount(0);

  // 5. Escape key đóng panel và trả focus về launcher
  await page.keyboard.press("Escape");
  await expect(panelInput).not.toBeVisible();
  await expect(launcher).toBeFocused();

  // 6. Viewport 390×844: panel phủ toàn màn hình, không cuộn ngang
  await page.setViewportSize({ width: 390, height: 844 });
  await launcher.click();
  await expect(panelInput).toBeVisible();

  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeCloseTo(390, -1);
  expect(box!.height).toBeCloseTo(844, -1);

  const horizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(horizontalScroll).toBe(false);

  // 2. Bấm chip "Kiểm tra nhanh 5 từ đến hạn" trong panel → nhận câu trả lời → mở toàn màn hình
  const starter = page.getByRole("button", { name: /Kiểm tra nhanh 5 từ đến hạn/ });
  await expect(starter).toBeVisible();
  await starter.click();

  if (process.env.E2E_REAL_AI !== "1") {
    await expect(page.getByText("Chào bạn! Đây là câu trả lời thử nghiệm")).toBeVisible();
  }

  const maximizeBtn = page.getByRole("link", { name: "Mở toàn màn hình" });
  await expect(maximizeBtn).toBeVisible();
  await maximizeBtn.click();
  await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}$/);

  // 3. Trên /chat: nút launcher không tồn tại
  await expect(page.getByRole("button", { name: /Mở gia sư AI/ })).toHaveCount(0);

  // 7. Tải lại trang /today → mở panel → vẫn thấy cuộc trò chuyện cũ
  await page.goto("/today");
  await page.getByRole("button", { name: /Mở gia sư AI/ }).click();
  await expect(page.getByText("Kiểm tra nhanh mình 5 từ đến hạn ôn nhé")).toBeVisible();

  expect(errors).toEqual([]);
});

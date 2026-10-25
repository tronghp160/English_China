import { expect, test, type Page } from "@playwright/test";
import { deleteUserByEmail, ENRICH_RESILIENT, signUp, testEmail, watchErrors } from "./helpers";

// PLAN §5.1: E2E test verifying Quizlet-style flashcard WordComposer
// (single card, Tab jump, multi-line paste, batch enrichment, draft auto-save, Sheet details).
test.describe.configure({ mode: "serial" });

const email = testEmail();
let page: Page;
let errors: string[];

const MOCK_IMAGES = [
  {
    id: "img1",
    provider: "pexels" as const,
    thumb_url: "https://images.example.com/1-thumb.jpg",
    url: "https://images.example.com/1-full.jpg",
    author: "Jane Doe",
    author_url: "https://pexels.com/@janedoe",
    page_url: "https://pexels.com/photo/1",
    alt: "Image 1",
  },
  {
    id: "img2",
    provider: "pexels" as const,
    thumb_url: "https://images.example.com/2-thumb.jpg",
    url: "https://images.example.com/2-full.jpg",
    author: "John Smith",
    author_url: "https://pexels.com/@johnsmith",
    page_url: "https://pexels.com/photo/2",
    alt: "Image 2",
  },
  {
    id: "img3",
    provider: "pexels" as const,
    thumb_url: "https://images.example.com/3-thumb.jpg",
    url: "https://images.example.com/3-full.jpg",
    author: "Alex Green",
    author_url: "https://pexels.com/@alexgreen",
    page_url: "https://pexels.com/photo/3",
    alt: "Image 3",
  },
  {
    id: "img4",
    provider: "pexels" as const,
    thumb_url: "https://images.example.com/4-thumb.jpg",
    url: "https://images.example.com/4-full.jpg",
    author: "Sam Wilson",
    author_url: "https://pexels.com/@samwilson",
    page_url: "https://pexels.com/photo/4",
    alt: "Image 4",
  },
  {
    id: "img5",
    provider: "pexels" as const,
    thumb_url: "https://images.example.com/5-thumb.jpg",
    url: "https://images.example.com/5-full.jpg",
    author: "Lisa Ray",
    author_url: "https://pexels.com/@lisaray",
    page_url: "https://pexels.com/photo/5",
    alt: "Image 5",
  },
  {
    id: "img6",
    provider: "pexels" as const,
    thumb_url: "https://images.example.com/6-thumb.jpg",
    url: "https://images.example.com/6-full.jpg",
    author: "Tom Clark",
    author_url: "https://pexels.com/@tomclark",
    page_url: "https://pexels.com/photo/6",
    alt: "Image 6",
  },
];

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  errors = watchErrors(page);

  // Mock third-party AI, dictionary, and image endpoints
  await page.route("**/api/ai/enrich", (route) => route.fulfill({ json: ENRICH_RESILIENT }));
  await page.route("**/api/ai/enrich-batch", async (route) => {
    const body = (route.request().postDataJSON() ?? null) as {
      language: string;
      items: { term: string; meaning_vi?: string }[];
    } | null;
    const items = body?.items ?? [];
    const outcomes = items.map((it) => {
      const termLower = it.term.trim().toLowerCase();
      if (termLower === "apple") {
        return {
          term: it.term,
          ok: true,
          result: {
            language: "en",
            is_valid_word: true,
            did_you_mean: null,
            lemma: "apple",
            ipa_us: "/ˈæp.əl/",
            ipa_uk: null,
            cefr: "A1",
            senses: [{ pos: ["noun"], meaning_vi: "trái táo", meaning_en: "A round fruit.", examples: [], image_query: "apple fruit" }],
            synonyms: [],
            antonyms: [],
            collocations: [],
            word_family: [],
            verb_forms: null,
            plural: "apples",
            topic_vi: "Ẩm thực",
            emoji: "🍎",
            image_query: "apple fruit",
            memory_tip_vi: null,
            checks: {},
          },
        };
      }
      if (termLower === "borrow") {
        return {
          term: it.term,
          ok: true,
          result: {
            language: "en",
            is_valid_word: true,
            did_you_mean: null,
            lemma: "borrow",
            ipa_us: "/ˈbɑːr.oʊ/",
            ipa_uk: null,
            cefr: "A2",
            senses: [{ pos: ["verb"], meaning_vi: "vay, mượn", meaning_en: "To take something for a while.", examples: [], image_query: "borrow book" }],
            synonyms: [],
            antonyms: [],
            collocations: [],
            word_family: [],
            verb_forms: null,
            plural: null,
            topic_vi: null,
            emoji: null,
            image_query: "borrow book",
            memory_tip_vi: null,
            checks: {},
          },
        };
      }
      return {
        term: it.term,
        ok: true,
        result: ENRICH_RESILIENT.result,
      };
    });
    return route.fulfill({ json: { outcomes } });
  });
  await page.route("**/api/dict", (route) => route.fulfill({ json: { result: null } }));
  await page.route("**/api/lookup", (route) => route.fulfill({ json: { result: null, source: null } }));
  await page.route("**/api/images/search**", (route) =>
    route.fulfill({ json: { results: MOCK_IMAGES, hasMore: false } }),
  );

  await signUp(page, email, "Người Thử", { samples: false });
});

test.afterAll(async () => {
  await page.close();
  await deleteUserByEmail(email);
});

test("gõ từ thẻ 1, gõ nghĩa, nhấn Tab -> focus ô Từ 2", async () => {
  await page.goto("/decks");
  await page.getByRole("link", { name: /Từ vựng tiếng Anh của tôi/ }).click();
  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}$/);
  await page.getByRole("link", { name: "Thêm từ" }).first().click();
  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}\/add/);

  await page.getByLabel("Từ", { exact: true }).fill("serendipity");
  await page.getByLabel("Nghĩa tiếng Việt", { exact: true }).fill("sự tình cờ may mắn");
  await page.getByLabel("Nghĩa tiếng Việt", { exact: true }).press("Tab");

  await expect(page.getByLabel("Từ 2")).toBeFocused();
});

test("dán 3 dòng vào ô Từ -> có 3 thẻ; thẻ 1 giữ nghĩa sau khi điền lô", async () => {
  await page.reload();
  const clearBtn = page.getByRole("button", { name: "Xóa nháp" });
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
  }

  // Paste 3 lines into the term input
  await page.getByLabel("Từ", { exact: true }).evaluate((el: HTMLInputElement, text: string) => {
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    dt.setData("text", text);
    const event = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
  }, "apple - quả táo\nborrow - mượn\nresilient");

  await expect(page.getByText("Đã tách thành 3 thẻ")).toBeVisible();
  await expect(page.getByLabel("Từ", { exact: true })).toHaveValue("apple");
  await expect(page.getByLabel("Từ 2")).toHaveValue("borrow");
  await expect(page.getByLabel("Từ 3")).toHaveValue("resilient");

  // Verify card 1 keeps "quả táo", card 2 keeps "mượn", card 3 gets AI meaning
  await expect(page.getByLabel("Nghĩa tiếng Việt", { exact: true })).toHaveValue("quả táo");
  await expect(page.getByLabel("Nghĩa tiếng Việt 2")).toHaveValue("mượn");
  await expect(page.getByLabel("Nghĩa tiếng Việt 3")).toHaveValue(/kiên cường/);
});

test("bấm Lưu 3 từ -> toast Đã lưu 3 từ, trang bộ từ có 3 link từ", async () => {
  await page.getByRole("button", { name: "Lưu 3 từ" }).click();
  await expect(page.getByText("Đã lưu 3 từ")).toBeVisible();

  await page.getByRole("button", { name: "Xem bộ" }).click();
  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}$/);

  await expect(page.getByRole("link", { name: /apple/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /borrow/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /resilient/ })).toBeVisible();
});

test("thêm từ đã có trong bộ -> sau khi lưu thẻ còn lại với chữ Đã có trong bộ này", async () => {
  await page.getByRole("link", { name: "Thêm từ" }).first().click();
  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]{36}\/add/);

  await page.getByLabel("Từ", { exact: true }).fill("resilient");
  await page.getByLabel("Nghĩa tiếng Việt", { exact: true }).fill("kiên cường");

  await page.getByRole("button", { name: "Lưu từ" }).click();
  await expect(page.getByText("Đã có trong bộ này")).toBeVisible();
});

test("gõ dở 1 thẻ, tải lại trang -> thấy Đã khôi phục 1 thẻ chưa lưu.", async () => {
  await page.getByLabel("Từ", { exact: true }).fill("wanderlust");
  await page.getByLabel("Nghĩa tiếng Việt", { exact: true }).fill("thích du ngoạn");

  // Wait for draft auto-save debounce (800ms)
  await page.waitForTimeout(1000);

  await page.reload();
  await expect(page.getByText("Đã khôi phục 1 thẻ chưa lưu.")).toBeVisible();
  await expect(page.getByLabel("Từ", { exact: true })).toHaveValue("wanderlust");
  await expect(page.getByLabel("Nghĩa tiếng Việt", { exact: true })).toHaveValue("thích du ngoạn");

  // Clean up draft
  await page.getByRole("button", { name: "Xóa nháp" }).click();
  await expect(page.getByLabel("Từ", { exact: true })).toHaveValue("");
});

test("mở Chi tiết thẻ 1, tab Ví dụ, thêm một câu, bấm Xong, lưu -> trang chi tiết từ có câu ví dụ", async () => {
  await page.getByLabel("Từ", { exact: true }).fill("tenacious");
  await page.getByLabel("Nghĩa tiếng Việt", { exact: true }).fill("ngoan cường, kiên trì");

  // Open Sheet details
  await page.getByRole("button", { name: /Chi tiết/ }).click();

  // Add example sentence
  await page.getByRole("button", { name: "Thêm câu ví dụ" }).click();
  await page.getByLabel("Câu ví dụ 1").fill("She is tenacious in pursuing her goals.");
  await page.getByLabel("Dịch câu 1").fill("Cô ấy kiên trì theo đuổi mục tiêu của mình.");

  // Click "Xong" in Sheet
  await page.getByRole("button", { name: "Xong" }).click();

  // Save card
  await page.getByRole("button", { name: "Lưu từ" }).click();
  await expect(page.getByText("Đã lưu tenacious")).toBeVisible();

  // Click "Xem" on toast to navigate to word detail page
  await page.getByRole("button", { name: "Xem", exact: true }).click();
  await expect(page).toHaveURL(/\/words\/[0-9a-f-]{36}$/);

  // Check example sentence is displayed
  await expect(page.getByText("She is tenacious in pursuing her goals.")).toBeVisible();
  await expect(page.getByText("Cô ấy kiên trì theo đuổi mục tiêu của mình.")).toBeVisible();
});

test("ảnh gợi ý tự hiện trên thẻ: chạm ảnh -> chọn và lưu thành công", async () => {
  await page.goto("/decks");
  await page.getByRole("link", { name: /Từ vựng tiếng Anh của tôi/ }).click();
  await page.getByRole("link", { name: "Thêm từ" }).first().click();

  const clearBtn = page.getByRole("button", { name: "Xóa nháp" });
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
  }

  // Type a word not saved yet (earlier tests saved "resilient"); the batch mock answers with the resilient entry
  await page.getByLabel("Từ", { exact: true }).fill("steadfast");
  await page.getByRole("button", { name: /Gợi ý/ }).click();
  await expect(page.getByLabel("Nghĩa tiếng Việt", { exact: true })).toHaveValue(/kiên cường/);

  // Group "Ảnh gợi ý cho thẻ 1" should appear with 6 buttons without clicking anything
  const strip = page.getByRole("group", { name: "Ảnh gợi ý cho thẻ 1" });
  await expect(strip).toBeVisible();
  const imageButtons = strip.getByRole("button", { name: /Chọn ảnh của/ });
  await expect(imageButtons).toHaveCount(6);

  // Tap 2nd image
  await imageButtons.nth(1).click();
  // Picking a photo collapses the strip into its credit line.
  await expect(page.getByRole("button", { name: "Chọn ảnh khác" })).toBeVisible();
  await expect(page.getByRole("link", { name: "John Smith" })).toBeVisible();

  // Save word
  await page.getByRole("button", { name: "Lưu từ" }).click();
  await expect(page.getByText("Đã lưu steadfast")).toBeVisible();

  // Click "Xem" to go to word detail page
  await page.getByRole("button", { name: "Xem", exact: true }).click();
  await expect(page).toHaveURL(/\/words\/[0-9a-f-]{36}$/);

  // Word detail page has the author credit
  await expect(page.getByText(/John Smith/)).toBeVisible();

  expect(errors).toEqual([]);
});

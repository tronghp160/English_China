import { expect, test } from "@playwright/test";

test.describe("PWA", () => {
  test("manifest và icon hợp lệ", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const manifest = await res.json();
    expect(manifest).toMatchObject({ short_name: "Sổ Từ", display: "standalone", lang: "vi" });
    for (const icon of manifest.icons as { src: string; purpose: string }[]) {
      const img = await request.get(icon.src);
      expect(img.ok(), icon.src).toBe(true);
      expect(img.headers()["content-type"]).toBe("image/png");
    }
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
  });

  test("service worker hiện trang offline khi mất mạng", async ({ page, context }) => {
    await page.goto("/login");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // First load is not controlled yet; reload so the worker handles navigations.
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    await context.setOffline(true);
    await page.goto("/decks");
    await expect(page.getByRole("heading", { name: "Bạn đang offline" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
    await context.setOffline(false);
  });
});

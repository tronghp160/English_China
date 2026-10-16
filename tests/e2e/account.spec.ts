import { expect, test } from "@playwright/test";
import { admin, deleteUserByEmail, signUp, testEmail, userIdByEmail, watchErrors } from "./helpers";

test.describe("dữ liệu & tài khoản", () => {
  const email = testEmail();
  test.afterAll(() => deleteUserByEmail(email));

  test("xuất dữ liệu rồi xóa tài khoản", async ({ page }) => {
    const errors = watchErrors(page);
    const { username } = await signUp(page, email);
    const userId = await userIdByEmail(email);
    expect(userId).not.toBeNull();

    // Export: JSON has the default deck, CSV has the header row.
    const json = await page.request.get("/api/export?format=json");
    expect(json.ok()).toBe(true);
    expect(json.headers()["content-disposition"]).toContain(".json");
    const data = await json.json();
    expect(data.profile.username).toBe(username);
    expect(data.decks.map((d: { name: string }) => d.name)).toContain("Từ vựng tiếng Anh của tôi");
    const csv = await page.request.get("/api/export?format=csv");
    expect((await csv.text()).split("\r\n")[0]).toContain("deck,language,term,reading,meaning_vi");
    expect((await page.request.get("/api/export?format=xml")).status()).toBe(400);

    // Delete: wrong confirmation keeps the button disabled; the right one removes everything.
    await page.goto("/settings");
    await page.getByRole("button", { name: "Xóa tài khoản" }).click();
    const confirm = page.getByLabel(/để xác nhận/);
    await confirm.fill("nguoi_khac");
    await expect(page.getByRole("button", { name: "Xóa vĩnh viễn" })).toBeDisabled();
    await confirm.fill(username);
    await page.getByRole("button", { name: "Xóa vĩnh viễn" }).click();
    await expect(page).toHaveURL(/\/$/);

    expect(await userIdByEmail(email)).toBeNull();
    const { count } = await admin().from("decks").select("id", { count: "exact", head: true }).eq("owner_id", userId!);
    expect(count).toBe(0);
    await page.goto("/today");
    await expect(page).toHaveURL(/\/login/);
    expect(errors).toEqual([]);
  });
});

test("phiên của tài khoản đã bị xóa ở nơi khác không gây vòng chuyển hướng", async ({ page }) => {
  const email = testEmail();
  await signUp(page, email);
  await deleteUserByEmail(email); // the browser still holds a valid JWT
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/today");
  await expect(page).toHaveURL(/\/login\?next=/);
});

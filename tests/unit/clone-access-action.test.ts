import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const ME = "0b6c3f2e-8a41-4c57-9d3e-1f2a3b4c5d6e";
const TARGET = "7d1e9a50-3b62-4f08-a1c4-5e6f7a8b9c0d";

const getUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getUser: () => getUser() }));

const isAdminUser = vi.fn();
vi.mock("@/lib/admin", () => ({ isAdminUser: (u: { id: string }) => isAdminUser(u) }));

const logAdminAction = vi.fn();
vi.mock("@/lib/data/admin-audit", () => ({ logAdminAction: (...a: unknown[]) => logAdminAction(...a) }));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

// ---- the service-role client: every call is recorded ----
const upsert = vi.fn();
const del = vi.fn();
const getUserById = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { getUserById: (id: string) => getUserById(id) } },
    from: (table: string) => ({
      upsert: (row: unknown, opts: unknown) => upsert(table, row, opts),
      delete: () => ({ eq: (col: string, value: string) => del(table, col, value) }),
    }),
  }),
}));

const { setCloneAccess } = await import("@/lib/actions/clone-access");

beforeEach(() => {
  for (const fn of [getUser, isAdminUser, logAdminAction, revalidatePath, upsert, del, getUserById]) fn.mockReset();
  getUser.mockResolvedValue({ id: ME, email: "admin@example.com" });
  // the caller is an admin, the target is not
  isAdminUser.mockImplementation(async (u: { id: string }) => u.id === ME);
  getUserById.mockResolvedValue({ data: { user: { id: TARGET, email: "target@example.com" } } });
  upsert.mockResolvedValue({ error: null });
  del.mockResolvedValue({ error: null });
});

describe("setCloneAccess: who may call it", () => {
  it("refuses a visitor who is not signed in, and writes nothing", async () => {
    getUser.mockResolvedValue(null);
    const res = await setCloneAccess({ userId: TARGET, enabled: true });
    expect(res.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("refuses an ordinary account (it cannot switch it on for itself or anybody else)", async () => {
    getUser.mockResolvedValue({ id: TARGET, email: "target@example.com" });
    isAdminUser.mockResolvedValue(false);
    for (const target of [TARGET, ME]) {
      for (const enabled of [true, false]) {
        const res = await setCloneAccess({ userId: target, enabled });
        expect(res).toMatchObject({ ok: false, error: "Bạn không có quyền quản trị." });
      }
    }
    expect(getUserById).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(logAdminAction).not.toHaveBeenCalled();
  });
});

describe("setCloneAccess: input", () => {
  it("rejects what is not a user id and a boolean", async () => {
    for (const bad of [
      { userId: "not-a-uuid", enabled: true },
      { userId: TARGET, enabled: "yes" },
      { userId: TARGET },
      {},
      null,
    ]) {
      const res = await setCloneAccess(bad as never);
      expect(res, JSON.stringify(bad)).toMatchObject({ ok: false, error: "Dữ liệu không hợp lệ." });
    }
    expect(upsert).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("rejects an account that does not exist", async () => {
    getUserById.mockResolvedValue({ data: { user: null } });
    expect(await setCloneAccess({ userId: TARGET, enabled: true })).toMatchObject({ ok: false, error: "Không tìm thấy tài khoản." });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not write a row for an admin: they always have access", async () => {
    isAdminUser.mockResolvedValue(true); // the target is an admin too
    const res = await setCloneAccess({ userId: TARGET, enabled: true });
    expect(res.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("setCloneAccess: an admin switches it", () => {
  it("on: inserts the row with who granted it, keeping the first grant, then logs and refreshes the pages", async () => {
    const res = await setCloneAccess({ userId: TARGET, enabled: true });
    expect(res.ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith("clone_access", { user_id: TARGET, granted_by: ME }, { onConflict: "user_id", ignoreDuplicates: true });
    expect(del).not.toHaveBeenCalled();
    expect(logAdminAction).toHaveBeenCalledWith({
      admin: { id: ME, email: "admin@example.com" },
      action: "clone_on",
      target: { userId: TARGET, label: "target@example.com" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/users/${TARGET}`);
  });

  it("off: deletes that account's row only, then logs", async () => {
    const res = await setCloneAccess({ userId: TARGET, enabled: false });
    expect(res.ok).toBe(true);
    expect(del).toHaveBeenCalledWith("clone_access", "user_id", TARGET);
    expect(upsert).not.toHaveBeenCalled();
    expect(logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: "clone_off", target: expect.objectContaining({ userId: TARGET }) }));
  });

  it("reports a failed write and does not log it as done", async () => {
    upsert.mockResolvedValue({ error: { message: "boom" } });
    expect(await setCloneAccess({ userId: TARGET, enabled: true })).toMatchObject({ ok: false });
    del.mockResolvedValue({ error: { message: "boom" } });
    expect(await setCloneAccess({ userId: TARGET, enabled: false })).toMatchObject({ ok: false });
    expect(logAdminAction).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

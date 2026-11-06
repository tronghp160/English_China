import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// ---- the three things the access check reads, all replaced ----
const isAdminUser = vi.fn();
vi.mock("@/lib/admin", () => ({ isAdminUser: (u: unknown) => isAdminUser(u) }));

const grantRead = vi.fn();
const selected: { table?: string; column?: string; eq?: [string, string] } = {};
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: (column: string) => ({
        eq: (col: string, value: string) => ({
          maybeSingle: () => {
            Object.assign(selected, { table, column, eq: [col, value] });
            return grantRead();
          },
        }),
      }),
    }),
  }),
}));

const getUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getUser: () => getUser() }));

let currentConfig: { name: string } | null = { name: "Nam" };
vi.mock("@/lib/env", () => ({ cloneConfig: () => currentConfig }));

const { canUseClone, cloneAvailable } = await import("@/lib/clone/access");

const user = { id: "u1", email: "u1@example.com" };

beforeEach(() => {
  isAdminUser.mockReset();
  grantRead.mockReset();
  getUser.mockReset();
  currentConfig = { name: "Nam" };
  for (const k of Object.keys(selected)) delete (selected as Record<string, unknown>)[k];
});

describe("canUseClone", () => {
  it("is true for an admin, even with no row", async () => {
    isAdminUser.mockResolvedValue(true);
    grantRead.mockResolvedValue({ data: null, error: null });
    expect(await canUseClone(user)).toBe(true);
    expect(isAdminUser).toHaveBeenCalledWith(user);
  });

  it("is true for an account an admin switched it on for (a row in clone_access)", async () => {
    isAdminUser.mockResolvedValue(false);
    grantRead.mockResolvedValue({ data: { user_id: "u1" }, error: null });
    expect(await canUseClone(user)).toBe(true);
  });

  it("is false for an ordinary account with no row: the default is nobody", async () => {
    isAdminUser.mockResolvedValue(false);
    grantRead.mockResolvedValue({ data: null, error: null });
    expect(await canUseClone(user)).toBe(false);
  });

  it("looks only at the person's own row, in clone_access", async () => {
    isAdminUser.mockResolvedValue(false);
    grantRead.mockResolvedValue({ data: null, error: null });
    await canUseClone(user);
    expect(selected).toEqual({ table: "clone_access", column: "user_id", eq: ["user_id", "u1"] });
  });

  it("asks both questions together, not one after the other", async () => {
    let releaseAdmin: (v: boolean) => void = () => {};
    isAdminUser.mockReturnValue(new Promise<boolean>((r) => (releaseAdmin = r)));
    grantRead.mockResolvedValue({ data: null, error: null });
    const pending = canUseClone(user);
    // the grant is read while the admin lookup is still waiting
    await vi.waitFor(() => expect(grantRead).toHaveBeenCalled());
    releaseAdmin(false);
    expect(await pending).toBe(false);
  });

  it("lets an admin in even when the grant read fails", async () => {
    isAdminUser.mockResolvedValue(true);
    grantRead.mockResolvedValue({ data: null, error: { message: "relation does not exist" } });
    expect(await canUseClone(user)).toBe(true);
    grantRead.mockRejectedValue(new Error("network"));
    expect(await canUseClone(user)).toBe(true);
  });

  it("does not answer 'no' to anybody else when the read fails: it throws, and nobody gets in because the check broke", async () => {
    isAdminUser.mockResolvedValue(false);
    grantRead.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(canUseClone(user)).rejects.toThrow("clone_access read failed");
  });
});

describe("cloneAvailable (pages, layout and menus)", () => {
  it("is false, without reading anything, when the feature is off on the server (no profile)", async () => {
    currentConfig = null;
    expect(await cloneAvailable()).toBe(false);
    expect(getUser).not.toHaveBeenCalled();
    expect(grantRead).not.toHaveBeenCalled();
  });

  it("is false for a visitor who is not signed in", async () => {
    getUser.mockResolvedValue(null);
    expect(await cloneAvailable()).toBe(false);
    expect(grantRead).not.toHaveBeenCalled();
  });

  it("is true for an admin and for a granted account, false for the rest", async () => {
    getUser.mockResolvedValue(user);
    isAdminUser.mockResolvedValue(true);
    grantRead.mockResolvedValue({ data: null, error: null });
    expect(await cloneAvailable()).toBe(true);

    isAdminUser.mockResolvedValue(false);
    grantRead.mockResolvedValue({ data: { user_id: "u1" }, error: null });
    expect(await cloneAvailable()).toBe(true);

    grantRead.mockResolvedValue({ data: null, error: null });
    expect(await cloneAvailable()).toBe(false);
  });

  it("hides the feature when the check fails", async () => {
    getUser.mockResolvedValue(user);
    isAdminUser.mockResolvedValue(false);
    grantRead.mockRejectedValue(new Error("network"));
    expect(await cloneAvailable()).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
const rpc = vi.fn((): Promise<RpcResult> => Promise.resolve({ data: null, error: null }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: (...a: unknown[]) => (rpc as (...x: unknown[]) => Promise<RpcResult>)(...a) }) }));
vi.mock("@/lib/env", () => ({ serverEnv: () => ({ AI_DAILY_LIMIT_PER_USER: 300, AI_GLOBAL_DAILY_LIMIT: 3000 }) }));

const hitRateLimit = vi.fn(async (..._args: unknown[]) => true);
vi.mock("@/lib/rate-limit", () => ({ hitRateLimit: (...a: unknown[]) => hitRateLimit(...a) }));

// The real AiError and messages, with only the quota read replaced.
const checkQuota = vi.fn(async (..._args: unknown[]): Promise<number> => 0);
vi.mock("@/lib/ai/enrich", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/enrich")>();
  return { ...actual, checkQuota: (...a: unknown[]) => checkQuota(...a) };
});

let aiGate: typeof import("@/lib/ai/gate").aiGate;
let AiError: typeof import("@/lib/ai/enrich").AiError;

beforeEach(async () => {
  vi.resetModules(); // the "RPC is missing" memory lives in the module
  rpc.mockReset();
  hitRateLimit.mockClear();
  checkQuota.mockReset();
  checkQuota.mockResolvedValue(0);
  hitRateLimit.mockResolvedValue(true);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  ({ aiGate } = await import("@/lib/ai/gate"));
  ({ AiError } = await import("@/lib/ai/enrich"));
});

const gateRow = (reason: string | null, used = 1, total = 5) => ({ allowed: reason === null, reason, used, total });

describe("aiGate with the RPC", () => {
  it("makes one request and passes the limits from the environment", async () => {
    rpc.mockResolvedValueOnce({ data: gateRow(null), error: null });
    expect(await aiGate("u1", "chat", 12, 60)).toEqual({ allowed: true });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "ai_gate",
      expect.objectContaining({ p_user_id: "u1", p_bucket: "chat", p_max: 12, p_window_seconds: 60, p_units: 1, p_user_limit: 300, p_global_limit: 3000 }),
    );
    expect(hitRateLimit).not.toHaveBeenCalled();
    expect(checkQuota).not.toHaveBeenCalled();
  });

  it("returns allowed: false when rate limited", async () => {
    rpc.mockResolvedValueOnce({ data: gateRow("rate"), error: null });
    expect(await aiGate("u1", "chat", 12, 60)).toEqual({ allowed: false });
  });

  it("throws the quota errors the app already knows", async () => {
    rpc.mockResolvedValueOnce({ data: gateRow("quota_user"), error: null });
    await expect(aiGate("u1", "chat", 12, 60)).rejects.toMatchObject({ code: "quota_user", message: expect.stringContaining("hết lượt gợi ý hôm nay") });
    rpc.mockResolvedValueOnce({ data: gateRow("quota_global"), error: null });
    await expect(aiGate("u1", "chat", 12, 60)).rejects.toMatchObject({ code: "quota_global" });
    rpc.mockResolvedValueOnce({ data: gateRow("quota_user"), error: null });
    await expect(aiGate("u1", "chat", 12, 60)).rejects.toBeInstanceOf(AiError);
  });

  it("fails closed when the RPC errors or answers nonsense", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "57014", message: "timeout" } });
    await expect(aiGate("u1", "chat", 12, 60)).rejects.toMatchObject({ code: "failed" });
    rpc.mockResolvedValueOnce({ data: { oops: true }, error: null });
    await expect(aiGate("u1", "chat", 12, 60)).rejects.toMatchObject({ code: "failed" });
    expect(checkQuota).not.toHaveBeenCalled(); // a real error does not silently fall back
  });
});

describe("aiGate before the migration is applied", () => {
  const missing = { data: null, error: { code: "PGRST202", message: "Could not find the function public.ai_gate" } };

  it("falls back to the three old queries, logs once, and does not retry the RPC at once", async () => {
    rpc.mockResolvedValue(missing);
    expect(await aiGate("u1", "chat", 12, 60)).toEqual({ allowed: true });
    expect(hitRateLimit).toHaveBeenCalledWith("u1", "chat", 12, 60);
    expect(checkQuota).toHaveBeenCalledWith("u1", 1);
    expect(console.warn).toHaveBeenCalledTimes(1);

    await aiGate("u1", "chat", 12, 60);
    expect(rpc).toHaveBeenCalledTimes(1); // the second call went straight to the old way
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("also recognises the Postgres code 42883", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42883", message: "function does not exist" } });
    expect(await aiGate("u1", "chat", 12, 60)).toEqual({ allowed: true });
    expect(checkQuota).toHaveBeenCalled();
  });

  it("tries the RPC again after a minute", async () => {
    vi.useFakeTimers();
    try {
      rpc.mockResolvedValue(missing);
      await aiGate("u1", "chat", 12, 60);
      expect(rpc).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(61_000);
      rpc.mockResolvedValueOnce({ data: gateRow(null), error: null });
      await aiGate("u1", "chat", 12, 60);
      expect(rpc).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the old behaviour: rate limit first, then quota", async () => {
    rpc.mockResolvedValue(missing);
    hitRateLimit.mockResolvedValue(false);
    checkQuota.mockRejectedValue(new Error("quota"));
    expect(await aiGate("u1", "chat", 12, 60)).toEqual({ allowed: false }); // not the quota error

    hitRateLimit.mockResolvedValue(true);
    await expect(aiGate("u1", "chat", 12, 60)).rejects.toThrow("quota");
  });
});

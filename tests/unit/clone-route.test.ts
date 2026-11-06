import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// ---- made-up data: the real profile never appears in the repo ----
const PROFILE = "## Hồ sơ giả\nBạn là Nam, thích mèo.\nMã bí mật của hồ sơ giả: QUOKKA-7731";
const SECRET_MESSAGE = "tui hơi buồn vì chuyện bài tập hôm nay XYLOPHONE-4420";
const config = { name: "Nam", profile: PROFILE, birthday: "01/02" as string | null };

// ---- the route must not touch the database: any client created here fails the test ----
const dbTouched = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => (dbTouched("server"), Promise.reject(new Error("DB touched"))) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => (dbTouched("admin"), { rpc: () => Promise.reject(new Error("DB touched")) }) }));

const getUser = vi.fn();
const loadMe = vi.fn();
vi.mock("@/lib/auth", () => ({ getUser: () => getUser(), loadMe: (u: unknown) => loadMe(u) }));

const aiGate = vi.fn();
vi.mock("@/lib/ai/gate", () => ({ aiGate: (...a: unknown[]) => aiGate(...a) }));

vi.mock("@/lib/env", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/env")>()), cloneConfig: () => currentConfig }));
let currentConfig: typeof config | null = config;

const recordUsage = vi.fn();
vi.mock("@/lib/ai/enrich", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/enrich")>()),
  requireProvider: () => ({ provider: "google", apiKey: "k", model: "m", fallbacks: [] }),
  recordUsage: (...a: unknown[]) => recordUsage(...a),
}));

let model: MockLanguageModelV4;
vi.mock("@/lib/ai/tutor/model", () => ({ tutorModel: () => model }));

const { POST, GET } = await import("@/app/api/clone/route");
const { AiError } = await import("@/lib/ai/enrich");

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};
const answering = (text: string) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: text },
          { type: "text-end", id: "t" },
          { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
        ],
      }),
    }),
  });

const msg = (role: "user" | "assistant", text: string) => ({ id: Math.random().toString(36).slice(2), role, parts: [{ type: "text", text }] });
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(new Request("http://localhost/api/clone", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } }));

const logged: string[] = [];
beforeEach(() => {
  logged.length = 0;
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logged.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")));
  }
  currentConfig = config;
  getUser.mockResolvedValue({ id: "u1", email: null });
  loadMe.mockResolvedValue({ user: { id: "u1" }, profile: { display_name: "Mai" }, settings: { timezone: "Asia/Ho_Chi_Minh" } });
  aiGate.mockResolvedValue({ allowed: true });
  recordUsage.mockClear();
  dbTouched.mockClear();
  model = answering("ừ nghe nè, kể tui nghe");
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/clone", () => {
  it("is a warm-up ping with no data", async () => {
    const res = await GET();
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });
});

describe("POST /api/clone: refusals", () => {
  it("401 without a session", async () => {
    getUser.mockResolvedValue(null);
    expect((await post({ messages: [msg("user", "hi")] })).status).toBe(401);
    expect(aiGate).not.toHaveBeenCalled();
  });

  it("400 for a body that is not a conversation ending with the user's message", async () => {
    for (const body of [null, {}, { messages: [] }, { messages: [msg("assistant", "hi")] }, { messages: [msg("user", "  ")] }, { messages: [msg("user", "x".repeat(1001))] }]) {
      const res = await post(body);
      expect(res.status, JSON.stringify(body)?.slice(0, 40)).toBe(400);
      expect((await res.json()).error).toContain("Tin nhắn trống hoặc dài quá");
    }
  });

  it("400 for a huge body without reading it", async () => {
    const res = await post({ messages: [msg("user", "hi")] }, { "content-length": "5000000" });
    expect(res.status).toBe(400);
  });

  it("404 when the feature is off (no profile)", async () => {
    currentConfig = null;
    const res = await post({ messages: [msg("user", "hi")] });
    expect(res.status).toBe(404);
    expect(aiGate).not.toHaveBeenCalled();
  });

  it("429 when rate limited, with a Retry-After", async () => {
    aiGate.mockResolvedValue({ allowed: false });
    const res = await post({ messages: [msg("user", "hi")] });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("20");
    expect((await res.json()).kind).toBe("rate");
  });

  it("429 when the daily quota is used up, in the companion's own words", async () => {
    aiGate.mockRejectedValue(new AiError("quota_user", "hết"));
    const res = await post({ messages: [msg("user", "hi")] });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.kind).toBe("quota");
    expect(body.error).not.toContain("gia sư");
  });

  it("503 when the quota cannot be read (fails closed)", async () => {
    aiGate.mockRejectedValue(new AiError("failed", "x"));
    expect((await post({ messages: [msg("user", "hi")] })).status).toBe(503);
  });

  it("401 when the account has no profile any more", async () => {
    loadMe.mockResolvedValue(null);
    expect((await post({ messages: [msg("user", "hi")] })).status).toBe(401);
  });

  it("uses its own per-minute bucket", async () => {
    await post({ messages: [msg("user", "hi")] });
    expect(aiGate).toHaveBeenCalledWith("u1", "clone", 12, 60);
  });
});

describe("POST /api/clone: an answer", () => {
  it("streams the model's answer and counts one usage unit", async () => {
    const res = await post({ messages: [msg("user", SECRET_MESSAGE)] });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("ừ nghe nè, kể tui nghe");
    await vi.waitFor(() => expect(recordUsage).toHaveBeenCalledWith("u1"));
  });

  it("gives the model the rules, the profile, who is chatting and the cleaned conversation", async () => {
    await (await post({ messages: [msg("user", "một"), msg("user", "hai"), msg("assistant", "ừ"), msg("user", SECRET_MESSAGE)] })).text();
    const prompt = model.doStreamCalls[0].prompt;
    const system = prompt.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    expect(system).toContain("phiên bản AI của Nam");
    expect(system).toContain("QUOKKA-7731");
    expect(system).toContain("Người đang nhắn: Mai");
    expect(system).toContain("Đang giữa cuộc trò chuyện"); // not the first turn
    const turns = prompt.filter((m) => m.role !== "system").map((m) => ({ role: m.role, text: JSON.stringify(m.content) }));
    expect(turns.map((t) => t.role)).toEqual(["user", "assistant", "user"]); // the two first user messages were joined
    expect(turns[0].text).toContain("một");
    expect(turns[0].text).toContain("hai");
    // a single message is the first turn
    model = answering("chào");
    await (await post({ messages: [msg("user", "chào")] })).text();
    expect(model.doStreamCalls[0].prompt.filter((m) => m.role === "system").map((m) => m.content).join("\n")).toContain("Đây là tin đầu tiên");
  });

  it("writes nothing to the database and puts no message text or profile in any log", async () => {
    await (await post({ messages: [msg("user", SECRET_MESSAGE)] })).text();
    await vi.waitFor(() => expect(recordUsage).toHaveBeenCalled());
    expect(dbTouched).not.toHaveBeenCalled();
    expect(logged.some((l) => l.includes("[clone:timing]"))).toBe(true); // one timing line is logged...
    const everything = logged.join("\n");
    for (const secret of [SECRET_MESSAGE, "XYLOPHONE", "QUOKKA", "thích mèo", "ừ nghe nè"]) expect(everything, secret).not.toContain(secret); // ...with no text in it
  });

  it("logs a failed model call without the request it carries", async () => {
    const boom = Object.assign(new Error("Bad Request"), { name: "AI_APICallError", statusCode: 400, requestBodyValues: { prompt: [{ text: SECRET_MESSAGE }, { text: PROFILE }] } });
    model = new MockLanguageModelV4({ doStream: async () => Promise.reject(boom) });
    const res = await post({ messages: [msg("user", SECRET_MESSAGE)] });
    const text = await res.text();
    expect(text).toContain("Bản AI"); // an error chunk in the companion's words
    expect(text).not.toContain("XYLOPHONE");
    expect(text).not.toContain("QUOKKA");
    const everything = logged.join("\n");
    expect(everything).toContain("[clone]");
    for (const secret of [SECRET_MESSAGE, "XYLOPHONE", "QUOKKA"]) expect(everything, secret).not.toContain(secret);
    expect(recordUsage).not.toHaveBeenCalled(); // no unit for a failed answer
  });
});

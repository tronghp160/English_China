import { beforeEach, describe, expect, it, vi } from "vitest";

const callModelMock = vi.fn();
const checkQuotaMock = vi.fn();
const recordUsageMock = vi.fn();
const greetingContextMock = vi.fn();

vi.mock("@/lib/ai/enrich", () => ({
  callModel: (...a: unknown[]) => callModelMock(...a),
  checkQuota: (...a: unknown[]) => checkQuotaMock(...a),
  recordUsage: (...a: unknown[]) => recordUsageMock(...a),
}));

vi.mock("@/lib/data/bin", () => ({
  greetingContext: (...a: unknown[]) => greetingContextMock(...a),
}));

let dbDailyRow: unknown = null;
let dbInsertedRow: unknown = null;
let dbUserPrefs: unknown = { mascot: true, bin_ai_greeting: true, mascot_name: "Bin" };

const selectChain = (table: string) => ({
  eq: () => ({
    eq: () => ({
      maybeSingle: () => Promise.resolve({ data: table === "bin_daily" ? dbDailyRow : null }),
      single: () => Promise.resolve({ data: table === "bin_daily" ? (dbInsertedRow ?? dbDailyRow) : null }),
    }),
    maybeSingle: () =>
      Promise.resolve({
        data: table === "user_settings" ? { prefs: dbUserPrefs } : null,
      }),
  }),
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => selectChain(table),
      upsert: (payload: unknown) => {
        dbInsertedRow = payload;
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

const { getOrWriteGreeting } = await import("@/lib/ai/bin-greeting");

describe("getOrWriteGreeting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbDailyRow = null;
    dbInsertedRow = null;
    dbUserPrefs = { mascot: true, bin_ai_greeting: true, mascot_name: "Bin" };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns existing row from DB without calling AI or context", async () => {
    dbDailyRow = {
      greeting: "Chào buổi sáng! Cùng học nhé.",
      mood: "cheer",
      word_id: "w-1",
    };

    const res = await getOrWriteGreeting("user-1", "2026-10-30");
    expect(res).toEqual({
      text: "Chào buổi sáng! Cùng học nhé.",
      mood: "cheer",
      wordId: "w-1",
    });
    expect(callModelMock).not.toHaveBeenCalled();
    expect(greetingContextMock).not.toHaveBeenCalled();
  });

  it("returns null when mascot or bin_ai_greeting is false", async () => {
    dbUserPrefs = { mascot: false, bin_ai_greeting: true };
    const resOff = await getOrWriteGreeting("user-1", "2026-10-30");
    expect(resOff).toBeNull();

    dbUserPrefs = { mascot: true, bin_ai_greeting: false };
    const resAiOff = await getOrWriteGreeting("user-1", "2026-10-30");
    expect(resAiOff).toBeNull();
    expect(callModelMock).not.toHaveBeenCalled();
  });

  it("writes template when no hardWords or newYesterday words exist (saves AI quota)", async () => {
    greetingContextMock.mockResolvedValue({
      name: "Bin",
      streak: 5,
      dueToday: 10,
      reviewedToday: 0,
      hardWords: [],
      newYesterday: [],
      tripBack: false,
    });

    const res = await getOrWriteGreeting("user-1", "2026-10-30");
    expect(callModelMock).not.toHaveBeenCalled();
    expect(recordUsageMock).not.toHaveBeenCalled();
    expect(res).toBeTruthy();
    expect(res?.text).toBeTruthy();
    expect(dbInsertedRow).toEqual(
      expect.objectContaining({
        source: "template",
        word_id: null,
      }),
    );
  });

  it("calls AI when words are available, strips emojis and records usage", async () => {
    greetingContextMock.mockResolvedValue({
      name: "Bin",
      streak: 3,
      dueToday: 12,
      reviewedToday: 0,
      hardWords: [{ id: "550e8400-e29b-41d4-a716-446655440000", term: "encourage", meaningVi: "động viên", language: "en" }],
      newYesterday: [],
      tripBack: false,
    });
    checkQuotaMock.mockResolvedValue(1);
    callModelMock.mockResolvedValue({
      output: {
        text: "Hôm qua từ encourage hơi khó nhỉ? 🐶 Hôm nay ôn lại chuỗi 3 ngày nhé! 🎉",
        mood: "wink",
        word_id: "550e8400-e29b-41d4-a716-446655440000",
      },
    });

    const res = await getOrWriteGreeting("user-1", "2026-10-30");
    expect(callModelMock).toHaveBeenCalledTimes(1);
    expect(res?.mood).toBe("wink");
    expect(res?.wordId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(res?.text).not.toMatch(/\p{Extended_Pictographic}/gu);
    expect(res?.text).toContain("encourage");
    expect(dbInsertedRow).toEqual(
      expect.objectContaining({
        source: "ai",
        word_id: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );
  });

  it("sets wordId to null if AI text does not contain the word", async () => {
    greetingContextMock.mockResolvedValue({
      name: "Bin",
      streak: 0,
      dueToday: 5,
      reviewedToday: 0,
      hardWords: [{ id: "550e8400-e29b-41d4-a716-446655440000", term: "encourage", meaningVi: "động viên", language: "en" }],
      newYesterday: [],
      tripBack: false,
    });
    checkQuotaMock.mockResolvedValue(1);
    callModelMock.mockResolvedValue({
      output: {
        text: "Hôm nay có 5 từ cần ôn tập, cố lên bạn nhé!",
        mood: "cheer",
        word_id: "550e8400-e29b-41d4-a716-446655440000",
      },
    });

    const res = await getOrWriteGreeting("user-1", "2026-10-30");
    expect(res?.wordId).toBeNull();
    expect(dbInsertedRow).toEqual(
      expect.objectContaining({
        source: "ai",
        word_id: null,
      }),
    );
  });

  it("falls back to template if AI hallucinates numbers not in context", async () => {
    greetingContextMock.mockResolvedValue({
      name: "Bin",
      streak: 2,
      dueToday: 8,
      reviewedToday: 0,
      hardWords: [{ id: "550e8400-e29b-41d4-a716-446655440000", term: "encourage", meaningVi: "động viên", language: "en" }],
      newYesterday: [],
      tripBack: false,
    });
    checkQuotaMock.mockResolvedValue(1);
    callModelMock.mockResolvedValue({
      output: {
        text: "Bạn đã học 99 ngày liên tiếp rồi đó encourage!", // 99 is hallucinated!
        mood: "cool",
        word_id: "550e8400-e29b-41d4-a716-446655440000",
      },
    });

    const res = await getOrWriteGreeting("user-1", "2026-10-30");
    expect(dbInsertedRow).toEqual(
      expect.objectContaining({
        source: "template",
      }),
    );
    expect(res?.text).toBeTruthy();
  });
});

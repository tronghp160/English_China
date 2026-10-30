import { beforeEach, describe, expect, it, vi } from "vitest";

const callModelMock = vi.fn();
const checkQuotaMock = vi.fn();
const recordUsageMock = vi.fn();

vi.mock("@/lib/ai/enrich", () => ({
  callModel: (...a: unknown[]) => callModelMock(...a),
  checkQuota: (...a: unknown[]) => checkQuotaMock(...a),
  recordUsage: (...a: unknown[]) => recordUsageMock(...a),
}));

let lastUpdatedStory: unknown = null;
const isMock = vi.fn().mockImplementation(() => {
  return Promise.resolve({ error: null });
});
const eqMock = vi.fn().mockImplementation(() => ({ is: isMock }));
const updateMock = vi.fn().mockImplementation((payload: { story: unknown }) => {
  lastUpdatedStory = payload.story;
  return { eq: eqMock };
});
const fromMock = vi.fn().mockImplementation(() => ({ update: updateMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

const { writeTripStory } = await import("@/lib/ai/bin-story");

describe("writeTripStory AI and fallback logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastUpdatedStory = null;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("AI outputs valid story containing term -> saves source: 'ai' and records usage", async () => {
    checkQuotaMock.mockResolvedValue(1);
    callModelMock.mockResolvedValue({
      output: {
        lines: [
          { target: "In London, I found an umbrella near Big Ben.", vi: "Ở London, tôi thấy một cái ô gần Big Ben." },
          { target: "It was raining gently.", vi: "Trời đang mưa nhẹ." },
        ],
      },
    });

    await writeTripStory({
      userId: "user-1",
      tripId: "trip-1",
      lang: "en",
      placeName: "London",
      landmark: "Big Ben",
      term: "umbrella",
      meaningVi: "chiếc ô",
      pinyin: null,
      name: "Bin",
    });

    expect(callModelMock).toHaveBeenCalledTimes(1);
    expect(recordUsageMock).toHaveBeenCalledWith("user-1");
    expect(lastUpdatedStory).toEqual(
      expect.objectContaining({
        source: "ai",
        lines: expect.arrayContaining([
          expect.objectContaining({ target: expect.stringContaining("umbrella") }),
        ]),
      }),
    );
  });

  it("AI outputs story without the term -> falls back to template and does not record usage", async () => {
    checkQuotaMock.mockResolvedValue(1);
    callModelMock.mockResolvedValue({
      output: {
        lines: [
          { target: "In London, I saw a beautiful clock tower.", vi: "Ở London, tôi thấy một tháp đồng hồ đẹp." },
          { target: "The city was full of people.", vi: "Thành phố thật đông đúc." },
        ],
      },
    });

    await writeTripStory({
      userId: "user-1",
      tripId: "trip-2",
      lang: "en",
      placeName: "London",
      landmark: "Big Ben",
      term: "umbrella",
      meaningVi: "chiếc ô",
      pinyin: null,
      name: "Bin",
    });

    expect(callModelMock).toHaveBeenCalledTimes(1);
    expect(recordUsageMock).not.toHaveBeenCalled();
    expect(lastUpdatedStory).toEqual(
      expect.objectContaining({
        source: "template",
      }),
    );
  });

  it("checkQuota throws quota error -> falls back to template without calling model", async () => {
    checkQuotaMock.mockRejectedValue(new Error("quota_user"));

    await writeTripStory({
      userId: "user-1",
      tripId: "trip-3",
      lang: "en",
      placeName: "London",
      landmark: "Big Ben",
      term: "umbrella",
      meaningVi: "chiếc ô",
      pinyin: null,
      name: "Bin",
    });

    expect(callModelMock).not.toHaveBeenCalled();
    expect(recordUsageMock).not.toHaveBeenCalled();
    expect(lastUpdatedStory).toEqual(
      expect.objectContaining({
        source: "template",
      }),
    );
  });

  it("AI output containing emojis has emojis stripped from lines", async () => {
    checkQuotaMock.mockResolvedValue(1);
    callModelMock.mockResolvedValue({
      output: {
        lines: [
          { target: "In London 🇬🇧, I saw an umbrella 🐶 near Big Ben!", vi: "Ở London, Bin thấy một cái ô 🐶 gần Big Ben!" },
          { target: "Such a lovely day! ✨", vi: "Một ngày thật đẹp! ✨" },
        ],
      },
    });

    await writeTripStory({
      userId: "user-1",
      tripId: "trip-4",
      lang: "en",
      placeName: "London",
      landmark: "Big Ben",
      term: "umbrella",
      meaningVi: "chiếc ô",
      pinyin: null,
      name: "Bin",
    });

    expect(lastUpdatedStory).toEqual(
      expect.objectContaining({
        source: "ai",
      }),
    );

    const emojiRegex = /\p{Extended_Pictographic}/u;
    const story = lastUpdatedStory as { lines: { target: string; vi: string }[] };
    for (const l of story.lines) {
      expect(emojiRegex.test(l.target)).toBe(false);
      expect(emojiRegex.test(l.vi)).toBe(false);
    }
  });

  it("no term provided -> directly saves template without calling quota or model", async () => {
    await writeTripStory({
      userId: "user-1",
      tripId: "trip-5",
      lang: "en",
      placeName: "London",
      landmark: "Big Ben",
      term: null,
      meaningVi: null,
      pinyin: null,
      name: "Bin",
    });

    expect(checkQuotaMock).not.toHaveBeenCalled();
    expect(callModelMock).not.toHaveBeenCalled();
    expect(lastUpdatedStory).toEqual(
      expect.objectContaining({
        source: "template",
      }),
    );
  });
});

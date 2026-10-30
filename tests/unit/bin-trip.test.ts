import { describe, expect, it } from "vitest";
import {
  canStartTrip,
  isOvernight,
  pickWord,
  rngFrom,
  templateStory,
  tripReturnTime,
  tripReward,
  tripStatus,
  TRIP_MIN_QUESTS,
  TRIP_MIN_REVIEWS,
} from "@/lib/bin/trip";

describe("bin trip unit logic", () => {
  it("canStartTrip boundary conditions", () => {
    expect(canStartTrip({ reviewsToday: 0, questsDone: 0 })).toBe(false);
    expect(canStartTrip({ reviewsToday: 19, questsDone: 1 })).toBe(false);
    expect(canStartTrip({ reviewsToday: TRIP_MIN_REVIEWS, questsDone: 0 })).toBe(true);
    expect(canStartTrip({ reviewsToday: 0, questsDone: TRIP_MIN_QUESTS })).toBe(true);
    expect(canStartTrip({ reviewsToday: 25, questsDone: 3 })).toBe(true);
  });

  it("tripReturnTime calculates normal and overnight hours correctly", () => {
    // 10:00 UTC+7 is 03:00 UTC
    const morning = new Date("2026-10-30T03:00:00Z"); // 10:00 VN
    const returnMorning = tripReturnTime(morning, "Asia/Ho_Chi_Minh");
    // 10:00 + 3h = 13:00 VN = 06:00 UTC
    expect(returnMorning.toISOString()).toBe("2026-10-30T06:00:00.000Z");
    expect(isOvernight(morning, "Asia/Ho_Chi_Minh")).toBe(false);

    // 20:30 UTC+7 is 13:30 UTC
    // 20:30 + 3h = 23:30 VN (in night hours 22:00-06:59) -> rolls to 07:00 next day (Oct 31 07:00 VN = Oct 31 00:00 UTC)
    const evening = new Date("2026-10-30T13:30:00Z");
    const returnEvening = tripReturnTime(evening, "Asia/Ho_Chi_Minh");
    expect(returnEvening.toISOString()).toBe("2026-10-31T00:00:00.000Z");
    expect(isOvernight(evening, "Asia/Ho_Chi_Minh")).toBe(true);

    // 02:00 UTC+7 is 19:00 UTC (previous day)
    // 02:00 + 3h = 05:00 VN (< 07:00) -> rolls to 07:00 VN that same day (00:00 UTC)
    const lateNight = new Date("2026-10-29T19:00:00Z");
    const returnLateNight = tripReturnTime(lateNight, "Asia/Ho_Chi_Minh");
    expect(returnLateNight.toISOString()).toBe("2026-10-30T00:00:00.000Z");
    expect(isOvernight(lateNight, "Asia/Ho_Chi_Minh")).toBe(true);

    // 05:00 UTC+7 is 22:00 UTC (previous day)
    // 05:00 + 3h = 08:00 VN (>= 07:00 and < 22:00) -> returns 08:00 VN (01:00 UTC)
    const earlyMorning = new Date("2026-10-29T22:00:00Z");
    const returnEarly = tripReturnTime(earlyMorning, "Asia/Ho_Chi_Minh");
    expect(returnEarly.toISOString()).toBe("2026-10-30T01:00:00.000Z");
    expect(isOvernight(earlyMorning, "Asia/Ho_Chi_Minh")).toBe(false);
  });

  it("tripStatus handles all 5 branches with correct priorities", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    const today = "2026-10-30";

    // 1. away: uncollected and returns_at in the future
    const awayStatus = tripStatus({
      today,
      reviewsToday: 0,
      questsDone: 0,
      now,
      latest: {
        id: "trip-1",
        study_day: today,
        place_id: "london",
        returns_at: "2026-10-30T14:00:00Z",
        collected_at: null,
      },
    });
    expect(awayStatus).toEqual({
      kind: "away",
      tripId: "trip-1",
      placeId: "london",
      returnsAt: "2026-10-30T14:00:00Z",
    });

    // 2. back: uncollected and returns_at in the past (even from yesterday)
    const backStatus = tripStatus({
      today,
      reviewsToday: 0,
      questsDone: 0,
      now,
      latest: {
        id: "trip-2",
        study_day: "2026-10-29",
        place_id: "paris",
        returns_at: "2026-10-29T15:00:00Z",
        collected_at: null,
      },
    });
    expect(backStatus).toEqual({
      kind: "back",
      tripId: "trip-2",
      placeId: "paris",
    });

    // 3. done: latest trip on today is already collected
    const doneStatus = tripStatus({
      today,
      reviewsToday: 30,
      questsDone: 3,
      now,
      latest: {
        id: "trip-3",
        study_day: today,
        place_id: "tokyo",
        returns_at: "2026-10-30T10:00:00Z",
        collected_at: "2026-10-30T10:05:00Z",
      },
    });
    expect(doneStatus).toEqual({ kind: "done" });

    // 4. ready: conditions met and no trip today
    const readyStatus = tripStatus({
      today,
      reviewsToday: 20,
      questsDone: 0,
      now,
      latest: {
        id: "trip-old",
        study_day: "2026-10-29",
        place_id: "rome",
        returns_at: "2026-10-29T10:00:00Z",
        collected_at: "2026-10-29T10:05:00Z",
      },
    });
    expect(readyStatus).toEqual({ kind: "ready" });

    // 5. locked: conditions not met
    const lockedStatus = tripStatus({
      today,
      reviewsToday: 15,
      questsDone: 1,
      now,
      latest: null,
    });
    expect(lockedStatus).toEqual({
      kind: "locked",
      needReviews: 5,
      needQuests: 1,
    });
  });

  it("tripReward gives consistent rewards for same seed and guarantees item on 3rd trip", () => {
    const seed = 12345;
    const r1 = tripReward({ lang: "en", owned: new Set(), tripNumber: 1, rng: rngFrom(seed) });
    const r2 = tripReward({ lang: "en", owned: new Set(), tripNumber: 1, rng: rngFrom(seed) });
    expect(r1).toEqual(r2);
    expect(r1.bones).toBeGreaterThanOrEqual(3);
    expect(r1.bones).toBeLessThanOrEqual(6);

    // Trip number 3 guarantees item if unowned items exist
    const trip3 = tripReward({ lang: "en", owned: new Set(), tripNumber: 3, rng: rngFrom(9999) });
    expect(trip3.itemId).not.toBeNull();
  });

  it("pickWord prioritizes candidates with lapses >= 2 or learning state", () => {
    const candidates = [
      { id: "w1", lapses: 0, state: "review", last_review: "2026-10-28" },
      { id: "w2", lapses: 3, state: "review", last_review: "2026-10-25" },
      { id: "w3", lapses: 1, state: "learning", last_review: "2026-10-29" },
    ];
    // Pool should only include w2 and w3
    for (let i = 0; i < 10; i++) {
      const picked = pickWord(candidates, rngFrom(i * 100));
      expect(["w2", "w3"]).toContain(picked?.id);
    }
  });

  it("templateStory produces proper text without any emojis", () => {
    const emojiRegex = /\p{Extended_Pictographic}/u;

    const enStory = templateStory({
      lang: "en",
      placeName: "London",
      landmark: "Big Ben",
      term: "umbrella",
      meaningVi: "chiếc ô",
      name: "Bin",
      seed: 42,
    });
    expect(enStory.lines.length).toBeGreaterThanOrEqual(2);
    expect(enStory.lines[0].target + enStory.lines[1].target).toContain("umbrella");
    expect(enStory.lines[0].vi + enStory.lines[1].vi).toContain("chiếc ô");
    for (const l of enStory.lines) {
      expect(emojiRegex.test(l.target)).toBe(false);
      expect(emojiRegex.test(l.vi)).toBe(false);
    }

    const zhStory = templateStory({
      lang: "zh",
      placeName: "Bắc Kinh",
      landmark: "Tử Cấm Thành",
      term: "苹果",
      reading: "píng guǒ",
      meaningVi: "quả táo",
      name: "Bin",
      seed: 88,
    });
    expect(zhStory.lines.length).toBeGreaterThanOrEqual(2);
    expect(zhStory.pinyin).toBeDefined();
    expect(zhStory.lines[0].target + zhStory.lines[1].target).toContain("苹果");
    for (const l of zhStory.lines) {
      expect(emojiRegex.test(l.target)).toBe(false);
      expect(emojiRegex.test(l.vi)).toBe(false);
    }
  });
});

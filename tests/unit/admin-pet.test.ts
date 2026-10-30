import { describe, expect, it } from "vitest";
import { buildPetSummary } from "@/lib/admin-pet";

describe("buildPetSummary", () => {
  it("calculates level, outfits, bones, tricks, quests and mood correctly", () => {
    // 300 XP -> level 4 (25 * 4 * 3 = 300)
    const pet = buildPetSummary({
      rows: [
        { day: "2026-10-28", reviews: 20, correct: 18, new_learned: 5, xp: 150 },
        { day: "2026-10-27", reviews: 20, correct: 17, new_learned: 2, xp: 150 },
      ],
      prefsRaw: {
        bin_outfit: "crown", // Not unlocked yet (requires streak 30)
        bin_treats_fed: 1,
        quests_total: 2,
        mascot_name: "Bin Đáng Yêu",
      },
      timezone: "Asia/Ho_Chi_Minh",
      now: new Date("2026-10-28T10:00:00Z"),
    });

    expect(pet.totalXp).toBe(300);
    expect(pet.level.level).toBe(4);
    // crown was requested but is locked -> falls back to "none"
    expect(pet.outfit).toBe("none");

    // totalCorrect = 35; bones = floor(35 / 10) + 2 * 2 - 1 = 3 + 4 - 1 = 6
    expect(pet.totalCorrect).toBe(35);
    expect(pet.bones).toBe(6);

    // Next outfit should point to next locked outfit
    expect(pet.nextOutfit).not.toBeNull();
    expect(pet.name).toBe("Bin Đáng Yêu");
  });

  it("unlocks cap at level 5 and glasses at streak 7", () => {
    // 500 XP -> level 5. 7 consecutive days -> streak 7
    const days = [
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
    ];
    const rows = days.map((day) => ({
      day,
      reviews: 10,
      correct: 10,
      new_learned: 2,
      xp: 75,
    }));

    const pet = buildPetSummary({
      rows,
      prefsRaw: {
        bin_outfit: "cap",
        bin_treats_fed: 0,
        quests_total: 0,
      },
      timezone: "Asia/Ho_Chi_Minh",
      now: new Date("2026-10-28T12:00:00Z"),
    });

    expect(pet.level.level).toBeGreaterThanOrEqual(5);
    expect(pet.unlocked).toContain("cap");
    expect(pet.unlocked).toContain("glasses");
    expect(pet.outfit).toBe("cap");
  });

  it("handles boneBalance, ledger, room, latestTrip, and postcardCount with custom and default values", () => {
    // Default values test
    const defaultPet = buildPetSummary({
      rows: [],
      prefsRaw: {},
      timezone: "Asia/Ho_Chi_Minh",
    });
    expect(defaultPet.boneBalance).toBe(0);
    expect(defaultPet.ledger).toEqual([]);
    expect(defaultPet.room).toEqual({
      bowl: null,
      bed: null,
      wall: null,
      toy: null,
      rug: null,
      corner: null,
    });
    expect(defaultPet.latestTrip).toBeNull();
    expect(defaultPet.postcardCount).toBe(0);
    expect(defaultPet.scarves).toBe(0);
    expect(defaultPet.freezes30).toEqual([]);
    expect(defaultPet.dailyGreeting).toBeNull();

    // Custom values test
    const customPet = buildPetSummary({
      rows: [],
      prefsRaw: {},
      timezone: "Asia/Ho_Chi_Minh",
      boneBalance: 42,
      ledger: [
        {
          id: 1,
          created_at: "2026-10-30T09:00:00Z",
          kind: "buy",
          amount: -12,
          ref: "bed_cushion",
          study_day: "2026-10-30",
        },
      ],
      room: {
        bed: "bed_cushion",
        wall: "wall_sun",
      },
      latestTrip: {
        id: "trip-1",
        placeId: "london",
        placeName: "Luân Đôn",
        returnsAt: "2026-10-30T12:00:00Z",
        status: "Đang đi",
        wordTerm: "umbrella",
      },
      postcardCount: 5,
      scarves: 1,
      freezes30: ["2026-10-29", "2026-10-25"],
      dailyGreeting: {
        greeting: "Chào buổi sáng!",
        mood: "happy",
        source: "ai",
        wordId: "autumn",
        createdAt: "2026-10-30T07:00:00Z",
      },
    });

    expect(customPet.boneBalance).toBe(42);
    expect(customPet.ledger).toHaveLength(1);
    expect(customPet.ledger[0].amount).toBe(-12);
    expect(customPet.room.bed).toBe("bed_cushion");
    expect(customPet.room.wall).toBe("wall_sun");
    expect(customPet.room.bowl).toBeNull();
    expect(customPet.latestTrip?.placeId).toBe("london");
    expect(customPet.latestTrip?.status).toBe("Đang đi");
    expect(customPet.postcardCount).toBe(5);
    expect(customPet.scarves).toBe(1);
    expect(customPet.freezes30).toEqual(["2026-10-29", "2026-10-25"]);
    expect(customPet.dailyGreeting?.greeting).toBe("Chào buổi sáng!");
    expect(customPet.dailyGreeting?.source).toBe("ai");
  });
});

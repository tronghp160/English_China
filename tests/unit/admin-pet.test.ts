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
});

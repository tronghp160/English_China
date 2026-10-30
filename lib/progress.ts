import type { PupMood } from "@/lib/mascot/lines";

/**
 * Levels, quests, bones and unlocks of the game layer (REDESIGN_V3 §3.5). Pure: the numbers come from
 * `daily_stats` and the prefs (lib/data/progress.ts); nothing here touches the database.
 */

// ---- Levels ----------------------------------------------------------------

/** Total XP needed to reach level L: 25·L·(L-1) → L1 0, L2 50, L3 150, L4 300, L5 500, L10 2250, L20 9500. */
export function xpForLevel(level: number): number {
  return 25 * level * (level - 1);
}

export type LevelInfo = {
  level: number;
  /** XP earned inside the current level. */
  xpInLevel: number;
  /** XP the current level takes in total (50·level). */
  xpForNext: number;
  /** 0..1 */
  progress: number;
};

export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * xp) / 25)) / 2));
  // The closed form can be off by one at the boundaries because of rounding.
  while (xpForLevel(level + 1) <= xp) level++;
  while (level > 1 && xpForLevel(level) > xp) level--;
  const xpInLevel = xp - xpForLevel(level);
  const xpForNext = xpForLevel(level + 1) - xpForLevel(level);
  return { level, xpInLevel, xpForNext, progress: xpInLevel / xpForNext };
}

// ---- Bones -----------------------------------------------------------------

/** Bones in hand: one per 10 right answers plus everything in the ledger (quests, trips, feeding, buying). */
export function bonesAvailable(input: { totalCorrect: number; ledgerSum: number }): number {
  return Math.max(0, Math.floor(Math.max(0, input.totalCorrect) / 10) + input.ledgerSum);
}

// ---- Daily quests ----------------------------------------------------------

export type QuestId = "due" | "correct20" | "new5";

export type Quest = { id: QuestId; title: string; progress: number; target: number; done: boolean };

export const QUEST_IDS: readonly QuestId[] = ["due", "correct20", "new5"];

export function isQuestId(id: string): id is QuestId {
  return (QUEST_IDS as readonly string[]).includes(id);
}

/** The three quests of a study day from today's counts (`dueLeft` = cards still due now). */
export function dailyQuests(today: { reviews: number; correct: number; new_learned: number; dueLeft: number }): Quest[] {
  const reviews = Math.max(0, today.reviews);
  const dueTarget = Math.max(1, reviews + Math.max(0, today.dueLeft));
  return [
    {
      id: "due",
      title: "Ôn hết từ đến hạn",
      progress: reviews,
      target: dueTarget,
      done: today.dueLeft <= 0 && reviews > 0,
    },
    {
      id: "correct20",
      title: "Trả lời đúng 20 câu",
      progress: Math.min(today.correct, 20),
      target: 20,
      done: today.correct >= 20,
    },
    {
      id: "new5",
      title: "Học 5 từ mới",
      progress: Math.min(today.new_learned, 5),
      target: 5,
      done: today.new_learned >= 5,
    },
  ];
}

/** Bones a quest reward is worth (see bonesAvailable: it counts two per reward taken). */
export const QUEST_BONES = 2;

export type ClaimedByDay = Record<string, string[]>;

/** Quest rewards already taken on `day`. */
export function claimedOn(claimed: ClaimedByDay, day: string): QuestId[] {
  return (claimed[day] ?? []).filter(isQuestId);
}

/** Keeps the newest `keep` days so the pref stays small; the lifetime count lives in `quests_total`. */
export function pruneClaimed(claimed: ClaimedByDay, keep = 7): ClaimedByDay {
  const days = Object.keys(claimed).sort().slice(-keep);
  return Object.fromEntries(days.map((d) => [d, claimed[d]]));
}

// ---- Outfits and tricks ----------------------------------------------------

export type OutfitId = "none" | "scarf" | "bow" | "glasses" | "cap" | "party" | "wizard" | "crown";

export type Outfit = {
  id: OutfitId;
  name: string;
  /** null = always available. */
  unlock: { kind: "streak" | "level"; value: number } | null;
};

export const OUTFITS: readonly Outfit[] = [
  { id: "none", name: "Không mặc", unlock: null },
  { id: "scarf", name: "Khăn quàng", unlock: { kind: "streak", value: 3 } },
  { id: "bow", name: "Nơ hồng", unlock: { kind: "level", value: 3 } },
  { id: "glasses", name: "Kính râm", unlock: { kind: "streak", value: 7 } },
  { id: "cap", name: "Mũ lưỡi trai", unlock: { kind: "level", value: 5 } },
  { id: "party", name: "Mũ tiệc", unlock: { kind: "streak", value: 14 } },
  { id: "wizard", name: "Mũ phù thủy", unlock: { kind: "level", value: 10 } },
  { id: "crown", name: "Vương miện", unlock: { kind: "streak", value: 30 } },
];

export function isOutfitId(id: string): id is OutfitId {
  return OUTFITS.some((o) => o.id === id);
}

/** Ids of the outfits the person has earned: the best streak ever and the current level decide. */
export function unlockedOutfits(input: { longestStreak: number; level: number }): OutfitId[] {
  return OUTFITS.filter((o) => {
    if (!o.unlock) return true;
    return (o.unlock.kind === "streak" ? input.longestStreak : input.level) >= o.unlock.value;
  }).map((o) => o.id);
}

/** What still stands between the person and an outfit, e.g. "Chuỗi 7 ngày" or "Cấp 5" (null when open). */
export function outfitCondition(outfit: Outfit): string | null {
  if (!outfit.unlock) return null;
  return outfit.unlock.kind === "streak" ? `Chuỗi ${outfit.unlock.value} ngày` : `Cấp ${outfit.unlock.value}`;
}

export type TrickId = "sit" | "spin" | "rollOver" | "dance" | "highFive";

export const TRICKS: readonly { id: TrickId; name: string; level: number }[] = [
  { id: "sit", name: "Ngồi", level: 1 },
  { id: "spin", name: "Xoay vòng", level: 2 },
  { id: "rollOver", name: "Lăn tròn", level: 4 },
  { id: "dance", name: "Nhảy múa", level: 6 },
  { id: "highFive", name: "Đập tay", level: 8 },
];

export function unlockedTricks(level: number): TrickId[] {
  return TRICKS.filter((t) => level >= t.level).map((t) => t.id);
}

// ---- Bin's mood ------------------------------------------------------------

export type BinMoodInput = {
  /** At least one review today. */
  reviewedToday: boolean;
  /** Current streak in days. */
  streak: number;
  /** Fed a bone today. */
  fedToday: boolean;
  /** Daily quests that are done (0 to 3). */
  questsDone: number;
};

/** 0 to 5: 2 for studying today, 1 each for a streak of 3+, a bone today and two quests done. */
export function binMoodScore(i: BinMoodInput): number {
  return (i.reviewedToday ? 2 : 0) + (i.streak >= 3 ? 1 : 0) + (i.fedToday ? 1 : 0) + (i.questsDone >= 2 ? 1 : 0);
}

/** The face for a score: sad (0-1), sleepy at night or thinking (2), happy (3), cheering (4-5). */
export function binMoodFor(score: number, night: boolean): PupMood {
  if (score <= 1) return "sad";
  if (score === 2) return night ? "sleepy" : "think";
  if (score === 3) return "happy";
  return "cheer";
}

export const BIN_MOOD_LABEL: Partial<Record<PupMood, string>> = {
  sad: "Buồn",
  sleepy: "Buồn ngủ",
  think: "Đang nghĩ",
  happy: "Ổn",
  cheer: "Vui vẻ",
};

/** After 19:00 the corner shows the night (and a sleepy Bin when the day was so-so). */
export function isNight(hour: number): boolean {
  return hour >= 19 || hour < 5;
}

// ---- What one session earned -----------------------------------------------

export type SessionGains = {
  /** XP the session earned, goal bonus included. */
  xpGained: number;
  before: LevelInfo;
  after: LevelInfo;
  leveledUp: boolean;
  /** Bones earned by this session's right answers (one per 10 right answers in total). */
  bonesEarned: number;
  /** Outfits that opened with this session (a new level, or a streak that just reached the mark). */
  newOutfits: Outfit[];
  newTricks: { id: TrickId; name: string }[];
};

/**
 * Compares the totals before and after one session. `streakNow` is the current streak and `extendedStreak` says
 * this session was the first of the study day (so the streak went up by one and may have reached an outfit's mark).
 */
export function sessionGains(input: {
  xpBefore: number;
  xpAfter: number;
  correctBefore: number;
  correctAfter: number;
  streakNow: number;
  extendedStreak: boolean;
}): SessionGains {
  const before = levelFromXp(Math.max(0, input.xpBefore));
  const after = levelFromXp(Math.max(input.xpBefore, input.xpAfter));
  const bonesEarned = Math.max(0, Math.floor(Math.max(0, input.correctAfter) / 10) - Math.floor(Math.max(0, input.correctBefore) / 10));
  const newOutfits = OUTFITS.filter((o) => {
    if (!o.unlock) return false;
    if (o.unlock.kind === "level") return before.level < o.unlock.value && after.level >= o.unlock.value;
    return input.extendedStreak && input.streakNow === o.unlock.value;
  });
  const newTricks = TRICKS.filter((t) => before.level < t.level && after.level >= t.level).map(({ id, name }) => ({ id, name }));
  return { xpGained: Math.max(0, input.xpAfter - input.xpBefore), before, after, leveledUp: after.level > before.level, bonesEarned, newOutfits, newTricks };
}

/** 1 to 3 stars for a session by the share of right answers (at least one when anything was answered). */
export function starsForPercent(percent: number): 1 | 2 | 3 {
  return percent >= 90 ? 3 : percent >= 60 ? 2 : 1;
}

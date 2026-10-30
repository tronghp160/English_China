import type { PupMood } from "@/lib/mascot/lines";
import {
  BIN_MOOD_LABEL,
  binMoodFor,
  binMoodScore,
  bonesAvailable,
  claimedOn,
  dailyQuests,
  isNight,
  isOutfitId,
  levelFromXp,
  OUTFITS,
  outfitCondition,
  TRICKS,
  unlockedOutfits,
  type LevelInfo,
  type OutfitId,
  type QuestId,
  type TrickId,
} from "@/lib/progress";
import { computeStreak, longestStreak, studyDay } from "@/lib/srs/streak";
import { readPrefs } from "@/lib/validation";

export type LedgerEntry = {
  id: number;
  created_at: string;
  kind: string;
  amount: number;
  ref: string | null;
  study_day: string;
};

export type AdminRoomSlots = {
  bowl: string | null;
  bed: string | null;
  wall: string | null;
  toy: string | null;
  rug: string | null;
  corner: string | null;
};

export type AdminLatestTrip = {
  id: string;
  placeId: string;
  placeName: string;
  returnsAt: string;
  status: string;
  wordTerm: string | null;
};

export type AdminDailyGreeting = {
  greeting: string;
  mood: string;
  source: "ai" | "template";
  wordId: string | null;
  createdAt: string;
};

export type PetSummary = {
  name: string;
  mascotOn: boolean;
  level: LevelInfo;
  totalXp: number;
  totalCorrect: number;
  bones: number;
  boneBalance: number;
  ledger: LedgerEntry[];
  room: AdminRoomSlots;
  latestTrip: AdminLatestTrip | null;
  postcardCount: number;
  scarves: number;
  freezes30: string[];
  dailyGreeting: AdminDailyGreeting | null;
  treatsFed: number;
  fedToday: boolean;
  lastFed: string | null;
  outfit: OutfitId;
  outfitName: string;
  unlocked: OutfitId[];
  nextOutfit: { id: OutfitId; name: string; condition: string; remaining: string } | null;
  tricks: { id: TrickId; name: string; unlocked: boolean; level: number }[];
  questsClaimedTotal: number;
  mood: PupMood;
  moodLabel: string;
  moodScore: number;
  streak: number;
  longestStreak: number;
  reviewedToday: boolean;
  today: { day: string; reviews: number; correct: number; newLearned: number };
  quests: { id: QuestId; title: string; progress: number; target: number; done: boolean; claimed: boolean }[];
};

export function buildPetSummary(input: {
  rows: { day: string; reviews: number; correct: number; new_learned: number; xp: number }[];
  prefsRaw: unknown;
  timezone: string;
  now?: Date;
  ledgerSum?: number;
  boneBalance?: number;
  ledger?: LedgerEntry[];
  room?: Partial<AdminRoomSlots>;
  latestTrip?: AdminLatestTrip | null;
  postcardCount?: number;
  frozenDays?: string[];
  scarves?: number;
  freezes30?: string[];
  dailyGreeting?: AdminDailyGreeting | null;
}): PetSummary {
  const now = input.now ?? new Date();
  const timezone = input.timezone || "Asia/Ho_Chi_Minh";

  let dayStr = "";
  try {
    dayStr = studyDay(now, timezone);
  } catch {
    dayStr = studyDay(now, "Asia/Ho_Chi_Minh");
  }

  const activeDays = input.rows.filter((r) => r.reviews > 0).map((r) => r.day);
  const streak = computeStreak(activeDays, dayStr, input.frozenDays ?? []).current;
  const longest = Math.max(longestStreak(activeDays), streak);

  const totalXp = input.rows.reduce((sum, r) => sum + r.xp, 0);
  const totalCorrect = input.rows.reduce((sum, r) => sum + r.correct, 0);
  const level = levelFromXp(totalXp);
  const prefs = readPrefs(input.prefsRaw);

  const unlocked = unlockedOutfits({ longestStreak: longest, level: level.level });
  const requestedOutfit = isOutfitId(prefs.bin_outfit) ? prefs.bin_outfit : "none";
  const outfit: OutfitId = unlocked.includes(requestedOutfit) ? requestedOutfit : "none";
  const outfitName = OUTFITS.find((o) => o.id === outfit)?.name ?? "Không mặc";

  const ledgerSum = input.ledgerSum ?? (2 * prefs.quests_total - prefs.bin_treats_fed);
  const bones = bonesAvailable({
    totalCorrect,
    ledgerSum,
  });
  const fedToday = prefs.bin_last_fed === dayStr;

  const todayRow = input.rows.find((r) => r.day === dayStr) ?? {
    day: dayStr,
    reviews: 0,
    correct: 0,
    new_learned: 0,
    xp: 0,
  };
  const reviewedToday = todayRow.reviews > 0;

  const allQuests = dailyQuests({
    reviews: todayRow.reviews,
    correct: todayRow.correct,
    new_learned: todayRow.new_learned,
    dueLeft: 0,
  });
  const claimedList = claimedOn(prefs.quests_claimed, dayStr);
  const quests = allQuests
    .filter((q) => q.id === "correct20" || q.id === "new5")
    .map((q) => ({
      ...q,
      claimed: claimedList.includes(q.id),
    }));

  const questsDone = quests.filter((q) => q.done).length;
  const moodScore = binMoodScore({
    reviewedToday,
    streak,
    fedToday,
    questsDone,
  });

  let hour = 12;
  try {
    const formattedHour = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: timezone,
    }).format(now);
    hour = Number.parseInt(formattedHour, 10);
  } catch {
    hour = now.getUTCHours();
  }

  const night = isNight(hour);
  const mood = binMoodFor(moodScore, night);
  const moodLabel = BIN_MOOD_LABEL[mood] ?? "Ổn";

  const locked = OUTFITS.filter((o) => !unlocked.includes(o.id));
  let nextOutfit: PetSummary["nextOutfit"] = null;
  if (locked.length > 0) {
    const next = locked[0];
    const condition = outfitCondition(next) ?? "";
    let remaining = "";
    if (next.unlock?.kind === "level") {
      remaining = `còn ${Math.max(0, next.unlock.value - level.level)} cấp`;
    } else if (next.unlock?.kind === "streak") {
      remaining = `còn ${Math.max(0, next.unlock.value - longest)} ngày chuỗi`;
    }
    nextOutfit = {
      id: next.id,
      name: next.name,
      condition,
      remaining,
    };
  }

  const tricks = TRICKS.map((t) => ({
    id: t.id,
    name: t.name,
    unlocked: level.level >= t.level,
    level: t.level,
  }));

  const boneBalance = input.boneBalance ?? bones;
  const ledger = input.ledger ?? [];
  const room: AdminRoomSlots = {
    bowl: null,
    bed: null,
    wall: null,
    toy: null,
    rug: null,
    corner: null,
    ...input.room,
  };
  const latestTrip = input.latestTrip ?? null;
  const postcardCount = input.postcardCount ?? 0;
  const scarves = input.scarves ?? 0;
  const freezes30 = input.freezes30 ?? [];
  const dailyGreeting = input.dailyGreeting ?? null;

  return {
    name: prefs.mascot_name,
    mascotOn: prefs.mascot,
    level,
    totalXp,
    totalCorrect,
    bones,
    boneBalance,
    ledger,
    room,
    latestTrip,
    postcardCount,
    scarves,
    freezes30,
    dailyGreeting,
    treatsFed: prefs.bin_treats_fed,
    fedToday,
    lastFed: prefs.bin_last_fed,
    outfit,
    outfitName,
    unlocked,
    nextOutfit,
    tricks,
    questsClaimedTotal: prefs.quests_total,
    mood,
    moodLabel,
    moodScore,
    streak,
    longestStreak: longest,
    reviewedToday,
    today: {
      day: dayStr,
      reviews: todayRow.reviews,
      correct: todayRow.correct,
      newLearned: todayRow.new_learned,
    },
    quests,
  };
}

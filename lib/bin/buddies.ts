import type { LangCode } from "@/lib/lang/types";
import type { Tone } from "@/lib/tone";

export type BuddySpecies = "miu" | "panda" | "duck" | "bunny";

export type EggRule = { kind: "mastered"; lang: LangCode | "any"; count: number };

export type Buddy = {
  species: BuddySpecies;
  defaultName: string; // "Miu", "Panda", "Vịt Quạc", "Thỏ Bông"
  egg: EggRule;
  hatchCorrect: number; // right answers needed after the egg arrives
  tone: Tone; // egg colour and card colour
};

export const BUDDY_SPECIES: readonly BuddySpecies[] = ["miu", "panda", "duck", "bunny"] as const;

export function isBuddySpecies(val: unknown): val is BuddySpecies {
  return typeof val === "string" && (BUDDY_SPECIES as readonly string[]).includes(val);
}

export const BUDDIES: readonly Buddy[] = [
  { species: "miu", defaultName: "Miu", egg: { kind: "mastered", lang: "any", count: 25 }, hatchCorrect: 30, tone: "orange" },
  { species: "panda", defaultName: "Panda", egg: { kind: "mastered", lang: "zh", count: 25 }, hatchCorrect: 30, tone: "mint" },
  { species: "duck", defaultName: "Vịt Quạc", egg: { kind: "mastered", lang: "en", count: 25 }, hatchCorrect: 30, tone: "sun" },
  { species: "bunny", defaultName: "Thỏ Bông", egg: { kind: "mastered", lang: "any", count: 100 }, hatchCorrect: 60, tone: "pink" },
];

/** A word is "mastered" when its recognize card is in review with an interval of 21 days or more. */
export const MASTERED_INTERVAL_DAYS = 21;

export function buddyBySpecies(species: BuddySpecies): Buddy | undefined {
  return BUDDIES.find((b) => b.species === species);
}

export function eggCondition(b: Buddy): string {
  if (b.egg.kind === "mastered") {
    if (b.egg.lang === "any") {
      return `Thuộc ${b.egg.count} từ`;
    }
    if (b.egg.lang === "zh") {
      return `Thuộc ${b.egg.count} từ tiếng Trung`;
    }
    if (b.egg.lang === "en") {
      return `Thuộc ${b.egg.count} từ tiếng Anh`;
    }
  }
  return "";
}

export function eggsEarned(mastered: { en: number; zh: number }, have: Set<BuddySpecies>): BuddySpecies[] {
  const earned: BuddySpecies[] = [];
  const anyTotal = (mastered.en ?? 0) + (mastered.zh ?? 0);

  for (const b of BUDDIES) {
    if (have.has(b.species)) continue;
    let count = 0;
    if (b.egg.lang === "any") {
      count = anyTotal;
    } else if (b.egg.lang === "zh") {
      count = mastered.zh ?? 0;
    } else if (b.egg.lang === "en") {
      count = mastered.en ?? 0;
    }

    if (count >= b.egg.count) {
      earned.push(b.species);
    }
  }

  return earned;
}

export function hatchProgress(i: {
  totalCorrect: number;
  startCorrect: number;
  need: number;
}): { done: number; need: number; ready: boolean } {
  const rawDone = Math.max(0, i.totalCorrect - i.startCorrect);
  const done = Math.min(rawDone, i.need);
  const ready = rawDone >= i.need;
  return { done, need: i.need, ready };
}

export type BuddyView = {
  species: BuddySpecies;
  name: string;
  state: "locked" | "egg" | "hatched";
  condition: string;
  mastered: number;
  hatch: { done: number; need: number; ready: boolean } | null;
};

export type BuddiesData = {
  buddies: BuddyView[];
  active: BuddySpecies | null;
  newEggs: BuddySpecies[];
};


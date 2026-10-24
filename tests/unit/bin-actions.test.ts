import { describe, expect, it } from "vitest";
import { IDLE_MS, idleChoices } from "@/components/mascot/use-bin";
import { BIN_ACTION_NAMES, BIN_ACTIONS, PUP_MOODS } from "@/lib/mascot/lines";

const PLAN_ACTIONS = [
  "jump",
  "spin",
  "dance",
  "nod",
  "shakeHead",
  "droop",
  "wave",
  "coverEyes",
  "peek",
  "eat",
  "catch",
  "rollOver",
  "sit",
  "highFive",
  "surprised",
  "bark",
  "sniff",
  "yawn",
];

describe("BIN_ACTIONS", () => {
  it("has the 18 actions of the plan", () => {
    expect([...BIN_ACTION_NAMES].sort()).toEqual([...PLAN_ACTIONS].sort());
  });

  it.each(PLAN_ACTIONS)("%s has a duration and a face from the existing moods", (name) => {
    const spec = BIN_ACTIONS[name as keyof typeof BIN_ACTIONS];
    expect(spec.ms).toBeGreaterThan(0);
    expect(spec.ms).toBeLessThanOrEqual(1500);
    expect(PUP_MOODS).toContain(spec.mood);
  });

  it("holds the poses that stay until replaced", () => {
    const held = BIN_ACTION_NAMES.filter((a) => BIN_ACTIONS[a].hold).sort();
    expect(held).toEqual(["coverEyes", "droop", "peek"]);
  });

  it("uses the durations of the plan for the long ones", () => {
    expect(BIN_ACTIONS.dance.ms).toBe(1400);
    expect(BIN_ACTIONS.eat.ms).toBe(1300);
    expect(BIN_ACTIONS.yawn.ms).toBe(1200);
    expect(BIN_ACTIONS.jump.ms).toBe(600);
  });
});

describe("idle moves", () => {
  it("lets Bin yawn only late at night or when sleepy", () => {
    expect(idleChoices(14, "happy")).not.toContain("yawn");
    expect(idleChoices(22, "happy")).toContain("yawn");
    expect(idleChoices(3, "happy")).toContain("yawn");
    expect(idleChoices(14, "sleepy")).toContain("yawn");
  });

  it("has a length for every move", () => {
    for (const move of idleChoices(23, "happy")) expect(IDLE_MS[move]).toBeGreaterThan(0);
  });
});

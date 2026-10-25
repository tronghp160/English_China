import { describe, expect, it } from "vitest";
import { decideNextStep, NO_DICT_MESSAGE } from "@/lib/ai/suggest-policy";

const base = { aiAvailable: true, auto: true, urgent: false, hasContext: false };

describe("decideNextStep", () => {
  it("stops at a shared or browser AI answer", () => {
    expect(decideNextStep("cache", base)).toEqual({ kind: "done" });
    expect(decideNextStep("ai", { ...base, urgent: true })).toEqual({ kind: "done" });
  });

  it("queues the AI in the background after a dictionary answer", () => {
    expect(decideNextStep("dict", base)).toEqual({ kind: "queue", urgent: false });
    expect(decideNextStep("dict", { ...base, urgent: true })).toEqual({ kind: "queue", urgent: true });
  });

  it("keeps the dictionary answer when there is no AI or auto is off", () => {
    expect(decideNextStep("dict", { ...base, aiAvailable: false })).toEqual({ kind: "dict-only" });
    expect(decideNextStep("dict", { ...base, auto: false })).toEqual({ kind: "dict-only" });
    expect(decideNextStep("dict", { ...base, auto: false, urgent: true })).toEqual({ kind: "queue", urgent: true });
  });

  it("asks the AI at once when the dictionary has nothing", () => {
    expect(decideNextStep(null, base)).toEqual({ kind: "queue", urgent: true });
    expect(decideNextStep(null, { ...base, aiAvailable: false })).toEqual({ kind: "error", message: NO_DICT_MESSAGE });
  });

  it("sends a context sentence straight to the AI", () => {
    expect(decideNextStep(null, { ...base, hasContext: true })).toEqual({ kind: "direct" });
    expect(decideNextStep("dict", { ...base, hasContext: true, aiAvailable: false })).toEqual({ kind: "dict-only" });
  });
});

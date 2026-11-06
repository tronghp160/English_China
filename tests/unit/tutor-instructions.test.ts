import { afterEach, describe, expect, it, vi } from "vitest";
import { toInstructions } from "@/lib/ai/tutor/instructions";
import { tutorTimer } from "@/lib/ai/tutor/timing";

const parts = { stable: "STABLE", turn: "TURN" };

describe("toInstructions", () => {
  it("gives Anthropic two system messages with the cache marker on the stable one", () => {
    const out = toInstructions({ provider: "anthropic", apiKey: "k", model: "m", fallbacks: [] }, parts);
    expect(out).toEqual([
      { role: "system", content: "STABLE", providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } },
      { role: "system", content: "TURN" },
    ]);
  });

  it("gives Gemini one string with the stable part first (it caches a repeated prefix on its own)", () => {
    expect(toInstructions({ provider: "google", apiKey: "k", model: "m", fallbacks: [] }, parts)).toBe("STABLE\n\nTURN");
  });
});

describe("tutorTimer label", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs under the label of the route", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const t = tutorTimer("clone");
    t.mark("auth");
    t.log({ status: "answered" });
    expect(info.mock.calls[0][0]).toBe("[clone:timing]");
    expect(JSON.parse(info.mock.calls[0][1] as string)).toMatchObject({ status: "answered" });
    tutorTimer().log({});
    expect(info.mock.calls[1][0]).toBe("[tutor:timing]"); // the default is unchanged
  });
});

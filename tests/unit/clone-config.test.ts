import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTACT } from "@/lib/contact";

// Only made-up profile text appears in tests. The real one lives in .env.local and Vercel.
const FAKE_PROFILE = "# Hồ sơ\nBạn là Nam, thích mèo.\n\n## Cách nói chuyện\nNhắn ngắn.";

const BASE = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
};

/** Fresh module (serverEnv caches its first parse) under the given environment. */
async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const k of ["ANTHROPIC_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "AI_PROVIDER", "CLONE_PROFILE", "CLONE_NAME", "CLONE_REAL_NAME", "CLONE_BIRTHDAY"]) {
    vi.stubEnv(k, "");
  }
  for (const [k, v] of Object.entries({ ...BASE, ...env })) vi.stubEnv(k, v ?? "");
  return import("@/lib/env");
}

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllEnvs());

describe("cloneConfig", () => {
  it("is off without a profile", async () => {
    const { cloneConfig } = await load({ ANTHROPIC_API_KEY: "k" });
    expect(cloneConfig()).toBeNull();
  });

  it("is off for a profile of only blanks", async () => {
    const { cloneConfig } = await load({ ANTHROPIC_API_KEY: "k", CLONE_PROFILE: " \n\t " });
    expect(cloneConfig()).toBeNull();
  });

  it("is off without an AI provider to answer with", async () => {
    const { cloneConfig } = await load({ CLONE_PROFILE: FAKE_PROFILE });
    expect(cloneConfig()).toBeNull();
  });

  it("is on with a profile and a key, keeping the profile's lines; the name falls back to the owner's nickname", async () => {
    const { cloneConfig } = await load({ GOOGLE_GENERATIVE_AI_API_KEY: "k", CLONE_PROFILE: `\n${FAKE_PROFILE}\n` });
    expect(cloneConfig()).toEqual({ name: CONTACT.nickname, realName: "Trọng", profile: FAKE_PROFILE, birthday: null });
  });

  it("reads the name and the birthday", async () => {
    const { cloneConfig } = await load({ ANTHROPIC_API_KEY: "k", CLONE_PROFILE: FAKE_PROFILE, CLONE_NAME: "Nam", CLONE_BIRTHDAY: "01/02" });
    expect(cloneConfig()).toMatchObject({ name: "Nam", profile: FAKE_PROFILE, birthday: "01/02" });
  });

  it("reads the name the profile uses for the owner, separately from the display name", async () => {
    const { cloneConfig } = await load({ ANTHROPIC_API_KEY: "k", CLONE_PROFILE: FAKE_PROFILE, CLONE_NAME: "Bi", CLONE_REAL_NAME: "Hùng" });
    expect(cloneConfig()).toMatchObject({ name: "Bi", realName: "Hùng" });
  });

  it("falls back to the nickname when CLONE_NAME is only blanks", async () => {
    const { cloneConfig } = await load({ ANTHROPIC_API_KEY: "k", CLONE_PROFILE: FAKE_PROFILE, CLONE_NAME: "   " });
    expect(cloneConfig()?.name).toBe(CONTACT.nickname);
  });

  it("ignores a malformed birthday instead of breaking the environment", async () => {
    const { cloneConfig, serverEnv } = await load({ ANTHROPIC_API_KEY: "k", CLONE_PROFILE: FAKE_PROFILE, CLONE_BIRTHDAY: "1 tháng 2" });
    expect(() => serverEnv()).not.toThrow();
    expect(cloneConfig()?.birthday).toBeNull();
  });
});

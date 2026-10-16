import { afterEach, describe, expect, it, vi } from "vitest";

type Voice = Pick<SpeechSynthesisVoice, "voiceURI" | "lang" | "name" | "localService" | "default">;
const voice = (voiceURI: string, lang: string): Voice => ({ voiceURI, lang, name: voiceURI, localService: true, default: false });

/** Installs a fake window.speechSynthesis and loads a fresh copy of lib/tts. */
async function loadTts(voices: Voice[]) {
  const handlers: (() => void)[] = [];
  const synth = {
    getVoices: () => voices,
    addEventListener: (_: string, h: () => void) => handlers.push(h),
  };
  vi.stubGlobal("window", { speechSynthesis: synth });
  vi.resetModules();
  const tts = await import("@/lib/tts");
  return { tts, fire: () => handlers.forEach((h) => h()), setVoices: (v: Voice[]) => (voices = v) };
}

afterEach(() => vi.unstubAllGlobals());

describe("tts voices", () => {
  it("a listener that reloads voices does not recurse (voices already available)", async () => {
    const { tts, fire } = await loadTts([voice("en-1", "en-US"), voice("zh-1", "zh-CN")]);
    let calls = 0;
    // What VoiceSettings does: reload the list whenever it changes.
    tts.onVoicesChanged(() => {
      calls++;
      void tts.loadVoices();
    });
    await expect(tts.loadVoices()).resolves.toHaveLength(2);
    fire(); // "voiceschanged" with the same list
    expect(calls).toBe(0);
  });

  it("notifies once when the list really changes", async () => {
    const { tts, fire, setVoices } = await loadTts([voice("en-1", "en-US")]);
    let calls = 0;
    tts.onVoicesChanged(() => {
      calls++;
      void tts.loadVoices();
    });
    setVoices([voice("en-1", "en-US"), voice("zh-1", "zh-CN")]);
    fire();
    expect(calls).toBe(1);
    expect(tts.voicesFor("zh")).toHaveLength(1);
  });
});

"use client";

/**
 * Text-to-speech via the Web Speech API (docs/PLAN.md §9).
 * Voices load asynchronously (and late on Safari iOS), so callers should
 * await loadVoices() or subscribe with onVoicesChanged().
 */

export type TtsLang = "en" | "zh";
export type SpeakOptions = { rate?: number; voiceName?: string | null; onEnd?: () => void };

const BCP47: Record<TtsLang, string> = { en: "en-US", zh: "zh-CN" };

export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let voicesCache: SpeechSynthesisVoice[] = [];
const listeners = new Set<() => void>();

function sameVoices(a: SpeechSynthesisVoice[], b: SpeechSynthesisVoice[]) {
  return a.length === b.length && a.every((v, i) => v.voiceURI === b[i].voiceURI);
}

/**
 * Notifies listeners only when the list really changed: a listener that calls
 * loadVoices() again (VoiceSettings does) would otherwise recurse forever.
 */
function refreshVoices() {
  if (!ttsSupported()) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length && !sameVoices(v, voicesCache)) {
    voicesCache = v;
    listeners.forEach((l) => l());
  }
}

if (ttsSupported()) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

export function onVoicesChanged(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Resolves once voices are available (or after a timeout on browsers that never fire the event). */
export function loadVoices(timeoutMs = 2500): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return Promise.resolve([]);
  refreshVoices();
  if (voicesCache.length) return Promise.resolve(voicesCache);
  return new Promise((resolve) => {
    const done = () => {
      off();
      clearInterval(poll);
      clearTimeout(timer);
      resolve(voicesCache);
    };
    const off = onVoicesChanged(done);
    // Safari sometimes populates voices without firing the event.
    const poll = setInterval(refreshVoices, 250);
    const timer = setTimeout(done, timeoutMs);
  });
}

export function getVoicesSync() {
  return voicesCache;
}

function matchesLang(voice: SpeechSynthesisVoice, lang: TtsLang) {
  const l = voice.lang.toLowerCase().replace("_", "-");
  if (lang === "en") return l.startsWith("en");
  // Mandarin voices: zh-CN, zh-TW, cmn-*. Skip Cantonese (zh-HK / yue).
  return (l.startsWith("zh") && !l.startsWith("zh-hk")) || l.startsWith("cmn");
}

export function voicesFor(lang: TtsLang, voices = voicesCache) {
  const list = voices.filter((v) => matchesLang(v, lang));
  const preferred = BCP47[lang].toLowerCase();
  return list.sort((a, b) => {
    const pa = a.lang.toLowerCase().replace("_", "-") === preferred ? 0 : 1;
    const pb = b.lang.toLowerCase().replace("_", "-") === preferred ? 0 : 1;
    return pa - pb || Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name);
  });
}

export function hasVoiceFor(lang: TtsLang) {
  return voicesFor(lang).length > 0;
}

export function pickVoice(lang: TtsLang, voiceName?: string | null) {
  const list = voicesFor(lang);
  return (voiceName && list.find((v) => v.name === voiceName)) || list[0] || null;
}

export function speak(text: string, lang: TtsLang, opts: SpeakOptions = {}) {
  if (!ttsSupported() || !text.trim()) return false;
  const synth = window.speechSynthesis;
  synth.cancel(); // never queue: the latest tap wins
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = BCP47[lang];
  const voice = pickVoice(lang, opts.voiceName);
  if (voice) utter.voice = voice;
  utter.rate = opts.rate ?? 0.85;
  if (opts.onEnd) {
    utter.onend = opts.onEnd;
    utter.onerror = opts.onEnd;
  }
  // Chrome bug: a paused engine silently drops utterances.
  if (synth.paused) synth.resume();
  synth.speak(utter);
  return true;
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

export const VOICE_HELP: Record<"ios" | "android" | "windows" | "mac", string> = {
  ios: "Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Trung → tải một giọng (ví dụ Tingting).",
  android: "Cài đặt → Hệ thống → Ngôn ngữ → Chuyển văn bản thành giọng nói → Công cụ của Google → Cài đặt dữ liệu giọng nói → Tiếng Trung (Quan thoại).",
  windows: "Settings → Time & language → Speech → Add voices → Chinese (Simplified, China). Sau đó khởi động lại trình duyệt.",
  mac: "Cài đặt hệ thống → Trợ năng → Nội dung được đọc → Giọng nói hệ thống → Quản lý giọng nói → Tiếng Trung.",
};

export function detectPlatform(): keyof typeof VOICE_HELP {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Mac OS X/.test(ua)) return "mac";
  return "windows";
}

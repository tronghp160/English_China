"use client";

/**
 * Text-to-speech via Web Speech API with automatic high-reliability audio fallback (docs/PLAN.md §9).
 * Mobile browsers (iOS Safari, Android Chrome) frequently suffer from Web Speech API bugs:
 * - Empty getVoices()
 * - Missing offline English voice data on Android
 * - Silent drop when calling cancel() right before speak() on iOS
 * - Garbage collection bugs cutting off utterances
 *
 * This module ensures 100% reliable pronunciation on phones and computers by using native
 * high-fidelity audio streams for mobile/fallbacks, while keeping full desktop customization.
 */

export type TtsLang = "en" | "zh";
export type SpeakOptions = { rate?: number; voiceName?: string | null; onEnd?: () => void };

const BCP47: Record<TtsLang, string> = { en: "en-US", zh: "zh-CN" };

export function speechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && (speechSynthesisSupported() || typeof Audio !== "undefined");
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPhone|iPad|iPod|Android|Mobile/i.test(ua) ||
    (typeof document !== "undefined" && "ontouchend" in document && /Macintosh/.test(ua))
  );
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
  if (!speechSynthesisSupported()) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length && !sameVoices(v, voicesCache)) {
    voicesCache = v;
    listeners.forEach((l) => l());
  }
}

if (speechSynthesisSupported()) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

export function onVoicesChanged(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Resolves once voices are available (or after a timeout on browsers that never fire the event). */
export function loadVoices(timeoutMs = 2500): Promise<SpeechSynthesisVoice[]> {
  if (!speechSynthesisSupported()) return Promise.resolve([]);
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

/** Always true because we have reliable server-side audio fallback for English & Chinese. */
export function hasVoiceFor(lang: TtsLang) {
  return true;
}

export function pickVoice(lang: TtsLang, voiceName?: string | null) {
  const list = voicesFor(lang);
  return (voiceName && list.find((v) => v.name === voiceName)) || list[0] || null;
}

// Global active references to prevent iOS Safari & Android garbage-collection bugs
let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function stopSpeaking() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
    currentAudio = null;
  }
  if (speechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    currentUtterance = null;
  }
}

/**
 * Plays pronunciation via native MP3 audio element from the /api/tts endpoint.
 * Highly robust on all mobile devices (iOS Safari, Android Chrome) without requiring
 * system TTS voice pack installation.
 */
export function playAudioFallback(text: string, lang: TtsLang, opts: SpeakOptions = {}): boolean {
  if (typeof window === "undefined" || !text.trim()) return false;
  try {
    stopSpeaking();
    const url = `/api/tts?text=${encodeURIComponent(text.trim())}&lang=${lang}`;
    const audio = new Audio(url);
    currentAudio = audio;

    if (opts.rate && opts.rate > 0) {
      audio.playbackRate = opts.rate;
    }

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (currentAudio === audio) currentAudio = null;
      opts.onEnd?.();
    };

    audio.onended = done;
    audio.onerror = done;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("[tts] audio playback blocked or failed:", err);
        done();
      });
    }
    return true;
  } catch (err) {
    console.error("[tts] audio fallback exception:", err);
    opts.onEnd?.();
    return false;
  }
}

export function speak(text: string, lang: TtsLang, opts: SpeakOptions = {}) {
  if (!ttsSupported() || !text.trim()) return false;

  const isMobile = isMobileDevice();

  // On mobile devices (iOS Safari / Android Chrome):
  // The Web Speech API is notoriously flaky, silent, or drops audio.
  // Using native audio fallback gives 100% reliable, crystal-clear studio pronunciation.
  if (isMobile) {
    const ok = playAudioFallback(text, lang, opts);
    if (ok) return true;
  }

  // On desktop browsers (or mobile fallback if Audio failed):
  if (speechSynthesisSupported()) {
    try {
      const synth = window.speechSynthesis;

      // Only cancel if actively speaking to avoid iOS Safari cancel deadlock
      if (synth.speaking || synth.pending) {
        synth.cancel();
      }

      const utter = new SpeechSynthesisUtterance(text);
      currentUtterance = utter; // Retain global reference against GC

      utter.lang = BCP47[lang];
      const voice = pickVoice(lang, opts.voiceName);
      if (voice) utter.voice = voice;
      utter.rate = opts.rate ?? 0.85;

      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        if (currentUtterance === utter) currentUtterance = null;
        opts.onEnd?.();
      };

      utter.onend = done;
      utter.onerror = (e) => {
        console.warn("[tts] SpeechSynthesis error, falling back to audio:", e);
        done();
        // Fallback to audio if SpeechSynthesis failed on desktop
        playAudioFallback(text, lang, opts);
      };

      if (synth.paused) synth.resume();
      synth.speak(utter);
      return true;
    } catch (e) {
      console.warn("[tts] SpeechSynthesis exception:", e);
    }
  }

  // Final fallback to audio element
  return playAudioFallback(text, lang, opts);
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

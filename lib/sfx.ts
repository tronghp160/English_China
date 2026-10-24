/**
 * Sound effects for sessions and Bin (REDESIGN_V3 §3.2): synthesized with the Web Audio API, no audio files.
 * `SFX_PLANS` describes each sound as plain data (testable without a browser); `playSfx` renders it.
 * Nothing is created before the person has interacted with the page, the pref "sound" turns it all off,
 * and automated browsers (`navigator.webdriver`) stay silent so E2E runs are quiet.
 */

export type Sfx =
  | "correct"
  | "wrong"
  | "combo"
  | "flip"
  | "pop"
  | "complete"
  | "levelUp"
  | "boop"
  | "bark"
  | "tick"
  | "whoosh"
  | "chomp";

export type SfxOptions = {
  /** Current combo count: from 10 the "combo" arpeggio gets a fourth, higher note. */
  combo?: number;
};

type ToneVoice = {
  kind: "tone";
  /** Seconds after the sound starts. */
  at: number;
  dur: number;
  type: OscillatorType;
  freq: number;
  /** Glide to this frequency over the voice. */
  to?: number;
  gain: number;
  /** Low-pass cutoff in Hz, for the softer "bark". */
  lowpass?: number;
  /** Vibrato depth in Hz at 12 Hz, for the shimmer. */
  vibrato?: number;
};

type NoiseVoice = {
  kind: "noise";
  at: number;
  dur: number;
  filter: "bandpass" | "lowpass";
  freq: number;
  to?: number;
  gain: number;
};

export type Voice = ToneVoice | NoiseVoice;

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

const tone = (at: number, dur: number, freq: number, gain: number, extra: Partial<ToneVoice> = {}): ToneVoice => ({
  kind: "tone",
  at,
  dur,
  type: "sine",
  freq,
  gain,
  ...extra,
});

function fanfare(): Voice[] {
  return [
    tone(0, 0.11, C5, 0.28, { type: "triangle" }),
    tone(0.11, 0.11, E5, 0.28, { type: "triangle" }),
    tone(0.22, 0.11, G5, 0.28, { type: "triangle" }),
    tone(0.33, 0.3, C6, 0.3, { type: "triangle" }),
  ];
}

export const SFX_PLANS: Record<Sfx, (opts: SfxOptions) => Voice[]> = {
  // Two notes going up: "ting-ting".
  correct: () => [tone(0, 0.07, 660, 0.26), tone(0.07, 0.11, 990, 0.26)],
  // One soft note sliding down.
  wrong: () => [tone(0, 0.2, 240, 0.2, { type: "triangle", to: 150 })],
  // C-E-G arpeggio, 60 ms a note; from combo 10 it ends on the high C.
  combo: ({ combo = 0 }) => {
    const notes = combo >= 10 ? [C5, E5, G5, C6] : [C5, E5, G5];
    return notes.map((f, i) => tone(i * 0.06, 0.06, f, 0.26));
  },
  // Paper turning over.
  flip: () => [{ kind: "noise", at: 0, dur: 0.04, filter: "bandpass", freq: 1800, gain: 0.06 }],
  pop: () => [tone(0, 0.06, 500, 0.24, { to: 900 })],
  complete: fanfare,
  levelUp: () => [...fanfare(), tone(0.33, 0.4, 1568, 0.12, { vibrato: 24 })],
  boop: () => [tone(0, 0.08, 420, 0.26, { to: 620 })],
  // Two short square pulses through a low-pass: a small "woof woof".
  bark: () => [
    tone(0, 0.07, 330, 0.16, { type: "square", to: 220, lowpass: 1400 }),
    tone(0.09, 0.07, 330, 0.16, { type: "square", to: 220, lowpass: 1400 }),
  ],
  tick: () => [tone(0, 0.02, 1200, 0.2)],
  whoosh: () => [{ kind: "noise", at: 0, dur: 0.18, filter: "bandpass", freq: 600, to: 2400, gain: 0.12 }],
  // Three chews.
  chomp: () =>
    [0, 0.09, 0.18].map((at): Voice => ({ kind: "noise", at, dur: 0.05, filter: "lowpass", freq: 400, gain: 0.3 })),
};

/** Length of a sound in seconds. */
export function sfxLength(name: Sfx, opts: SfxOptions = {}): number {
  return Math.max(...SFX_PLANS[name](opts).map((v) => v.at + v.dur));
}

const MASTER_GAIN = 0.5;
const ATTACK = 0.005;

let enabled = true;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let activated = false;
let listening = false;

export function setSfxEnabled(on: boolean) {
  enabled = on;
}

export function isSfxEnabled() {
  return enabled;
}

function canPlay() {
  return typeof window !== "undefined" && enabled && !navigator.webdriver;
}

/** Browsers only let audio start after a gesture: remember the first one without creating anything yet. */
function listenForGesture() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  const mark = () => {
    activated = true;
    window.removeEventListener("pointerdown", mark, true);
    window.removeEventListener("keydown", mark, true);
  };
  window.addEventListener("pointerdown", mark, true);
  window.addEventListener("keydown", mark, true);
}

function context(): AudioContext | null {
  listenForGesture();
  if (!activated && !navigator.userActivation?.hasBeenActive) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noise(c: AudioContext) {
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  return src;
}

/** A gain node with a 5 ms attack and an exponential decay to silence at `end`. */
function envelope(c: AudioContext, start: number, end: number, peak: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(peak, start + ATTACK);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  return g;
}

function render(c: AudioContext, voice: Voice, t0: number) {
  if (!master) return;
  const start = t0 + voice.at;
  const end = start + voice.dur;
  const env = envelope(c, start, end, voice.gain);

  if (voice.kind === "tone") {
    const osc = c.createOscillator();
    osc.type = voice.type;
    osc.frequency.setValueAtTime(voice.freq, start);
    if (voice.to) osc.frequency.exponentialRampToValueAtTime(voice.to, end);
    let out: AudioNode = osc;
    if (voice.vibrato) {
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = 12;
      depth.gain.value = voice.vibrato;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(start);
      lfo.stop(end + 0.02);
    }
    if (voice.lowpass) {
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = voice.lowpass;
      out.connect(lp);
      out = lp;
    }
    out.connect(env).connect(master);
    osc.start(start);
    osc.stop(end + 0.02);
    return;
  }

  const src = noise(c);
  const filter = c.createBiquadFilter();
  filter.type = voice.filter;
  filter.frequency.setValueAtTime(voice.freq, start);
  if (voice.to) filter.frequency.exponentialRampToValueAtTime(voice.to, end);
  src.connect(filter).connect(env).connect(master);
  src.start(start);
  src.stop(end + 0.02);
}

/** Plays a sound now. Does nothing while sound is off, before the first gesture, or in automated browsers. */
export function playSfx(name: Sfx, opts: SfxOptions = {}) {
  if (!canPlay()) return;
  const c = context();
  if (!c) return;
  const t0 = c.currentTime + 0.005;
  for (const voice of SFX_PLANS[name](opts)) render(c, voice, t0);
}

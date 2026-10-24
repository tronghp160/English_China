"use client";

import type { CreateTypes } from "canvas-confetti";
import { useEffect, useRef } from "react";

export type ConfettiPreset = "small" | "big" | "record";

/** Reads the palette from the CSS variables, so confetti follows the theme and no hex lives here. */
function paletteColors(names: string[]) {
  const cs = getComputedStyle(document.documentElement);
  return names.map((v) => cs.getPropertyValue(v).trim()).filter(Boolean);
}

let cannon: CreateTypes | null = null;

/**
 * One full-screen canvas for all bursts. The library's default instance draws in a Web Worker started from a
 * blob, which our CSP (worker-src 'self') blocks, so we make our own instance that draws on the main thread.
 */
async function getCannon() {
  if (cannon) return cannon;
  const { default: confetti } = await import("canvas-confetti");
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "100" });
  document.body.appendChild(canvas);
  cannon = confetti.create(canvas, { resize: true, useWorker: false });
  return cannon;
}

const ALL = ["--c-blue", "--c-coral", "--c-mint", "--c-sun", "--c-grape", "--c-pink", "--c-orange", "--c-teal"];
const GOLD = ["--c-sun", "--c-orange", "--c-coral", "--c-pink", "--c-sun"];

/**
 * Confetti in the palette (canvas-confetti is loaded on first use). `small` is the end-of-session burst,
 * `big` is for levelling up and finishing the onboarding, `record` shoots stars from both sides for a new
 * best time. Does nothing for people who asked for reduced motion.
 */
export async function fireConfetti(preset: ConfettiPreset = "small", signal?: { cancelled: boolean }) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const fire = await getCannon();
  if (signal?.cancelled) return;
  const base = { disableForReducedMotion: true, ticks: 90, gravity: 1.1, scalar: 0.9 };
  const later = (ms: number, fn: () => void) =>
    window.setTimeout(() => {
      if (!signal?.cancelled) fn();
    }, ms);

  if (preset === "small") {
    const colors = paletteColors(ALL);
    void fire({ ...base, colors, particleCount: 60, spread: 70, origin: { x: 0.5, y: 0.25 } });
    later(250, () => void fire({ ...base, colors, particleCount: 30, spread: 100, origin: { x: 0.5, y: 0.3 } }));
  } else if (preset === "big") {
    const colors = paletteColors(ALL);
    void fire({ ...base, colors, particleCount: 120, spread: 90, startVelocity: 48, origin: { x: 0.5, y: 0.4 } });
    later(200, () => void fire({ ...base, colors, particleCount: 70, spread: 120, origin: { x: 0.2, y: 0.5 } }));
    later(350, () => void fire({ ...base, colors, particleCount: 70, spread: 120, origin: { x: 0.8, y: 0.5 } }));
  } else {
    const colors = paletteColors(GOLD);
    const star = { ...base, colors, shapes: ["star" as const], scalar: 1.2, particleCount: 40, startVelocity: 55 };
    void fire({ ...star, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
    void fire({ ...star, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
    later(300, () => void fire({ ...star, spread: 100, origin: { x: 0.5, y: 0.35 } }));
  }
}

/**
 * Fires a preset when it mounts and again whenever `trigger` changes. With `skipFirst` the starting value of
 * `trigger` is not a reason to fire, so only later changes are (a page that mounts it ahead of time).
 */
export function Confetti({ preset = "small", trigger = 0, skipFirst = false }: { preset?: ConfettiPreset; trigger?: number; skipFirst?: boolean }) {
  // Remembering the last value (not "is this the first run") keeps it right when React runs effects twice in development.
  const fired = useRef<number | null>(skipFirst ? trigger : null);
  useEffect(() => {
    if (fired.current === trigger) return;
    const before = fired.current;
    fired.current = trigger;
    const signal = { cancelled: false };
    void fireConfetti(preset, signal);
    return () => {
      signal.cancelled = true;
      // The cleanup also runs between the two development passes; undo the mark so the second pass fires.
      fired.current = before;
    };
  }, [preset, trigger]);
  return null;
}

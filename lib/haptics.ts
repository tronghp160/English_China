/** Short vibrations (REDESIGN_V3 §3.3). Only phones with the Vibration API react; the pref "haptics" turns it off. */

export type Haptic = "light" | "success" | "error" | "heavy";

export const HAPTIC_PATTERNS: Record<Haptic, number | number[]> = {
  light: 10,
  success: [12, 40, 12],
  error: [30, 50, 30],
  heavy: 35,
};

let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export function haptic(kind: Haptic) {
  if (!enabled || typeof navigator === "undefined" || navigator.webdriver) return;
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate(HAPTIC_PATTERNS[kind]);
}

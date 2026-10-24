"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { BIN_ACTIONS, type BinAction, type PupMood } from "@/lib/mascot/lines";
import { playSfx, type Sfx } from "@/lib/sfx";

/** Sounds that belong to an action (REDESIGN_V3 §4.3). */
const ACTION_SFX: Partial<Record<BinAction, Sfx>> = { eat: "chomp", bark: "bark" };

/** Under reduced motion an action only changes the face, for this long. */
const REDUCED_MOOD_MS = 800;

/**
 * Plays Bin's one-off actions. `play("jump")` returns the action to pass to <Pup action>, and `mood` is the face
 * to show (the action's own while it runs, `baseMood` otherwise). Actions that are not `hold` clear themselves
 * when their time is up; `clear()` ends a held one (covered eyes, a droop). Playing the same action twice in a
 * row restarts it. With reduced motion nothing moves: only the face changes, for 800 ms.
 */
export function useBinAction(baseMood: PupMood = "happy", options: { reduced?: boolean } = {}) {
  const systemReduced = useReducedMotion();
  const reduced = options.reduced ?? systemReduced ?? false;
  const [action, setAction] = useState<BinAction | null>(null);
  const [moodOverride, setMoodOverride] = useState<PupMood | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const frame = useRef(0);

  const clear = useCallback(() => {
    clearTimeout(timer.current);
    cancelAnimationFrame(frame.current);
    setAction(null);
    setMoodOverride(null);
  }, []);

  const play = useCallback(
    (next: BinAction) => {
      const spec = BIN_ACTIONS[next];
      clearTimeout(timer.current);
      cancelAnimationFrame(frame.current);
      const sfx = ACTION_SFX[next];
      if (sfx) playSfx(sfx);

      if (reduced) {
        setAction(null);
        setMoodOverride(spec.mood);
        timer.current = setTimeout(() => setMoodOverride(null), REDUCED_MOOD_MS);
        return;
      }
      setMoodOverride(null);
      // Drop the action for a frame so the same one can start again from its first keyframe.
      setAction(null);
      frame.current = requestAnimationFrame(() => {
        setAction(next);
        if (!spec.hold) timer.current = setTimeout(() => setAction(null), spec.ms + 60);
      });
    },
    [reduced],
  );

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  const mood = moodOverride ?? (action ? BIN_ACTIONS[action].mood : baseMood);
  return { action, mood, play, clear };
}

// ---- Idle micro-motions -----------------------------------------------------

export type IdleMove = "ear-twitch" | "head-tilt" | "sniff" | "yawn";

/** How long each micro-motion runs, in ms (the CSS durations in globals.css). */
export const IDLE_MS: Record<IdleMove, number> = { "ear-twitch": 400, "head-tilt": 900, sniff: 600, yawn: 1200 };

/** No more than this many Bins move on one screen. */
const MAX_IDLE_BINS = 3;
let idleBins = 0;

/** The moves Bin may pick from: yawning only late at night or when sleepy. */
export function idleChoices(hour: number, mood: PupMood): IdleMove[] {
  const moves: IdleMove[] = ["ear-twitch", "head-tilt", "sniff"];
  if (mood === "sleepy" || hour >= 21 || hour < 5) moves.push("yawn");
  return moves;
}

/**
 * Every 6 to 14 seconds Bin does a small thing on its own (twitches an ear, tilts the head, sniffs, yawns),
 * set as `data-idle` on the <svg>. It only does so while it is on screen and the tab is visible, never while an
 * action runs, and at most three Bins at a time. No re-render: the attribute is set directly.
 */
export function useBinIdle(ref: RefObject<SVGSVGElement | null>, { enabled, mood }: { enabled: boolean; mood: PupMood }) {
  const moodRef = useRef(mood);
  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    let visible = false;
    let holdsSlot = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const stop = () => {
      clearTimeout(timer);
      delete el.dataset.idle;
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!visible || document.hidden) return;
      timer = setTimeout(fire, 6000 + Math.random() * 8000);
    };
    function fire() {
      if (el!.dataset.action) return schedule();
      const choices = idleChoices(new Date().getHours(), moodRef.current);
      const move = choices[Math.floor(Math.random() * choices.length)];
      el!.dataset.idle = move;
      timer = setTimeout(() => {
        delete el!.dataset.idle;
        schedule();
      }, IDLE_MS[move] + 60);
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !holdsSlot && idleBins < MAX_IDLE_BINS) {
        holdsSlot = true;
        idleBins++;
      }
      if (!visible && holdsSlot) {
        holdsSlot = false;
        idleBins--;
      }
      if (visible && holdsSlot) schedule();
      else stop();
    });
    io.observe(el);
    const onVisibility = () => (document.hidden ? stop() : visible && holdsSlot && schedule());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
      if (holdsSlot) idleBins--;
    };
  }, [ref, enabled]);
}

// ---- Looking at the pointer -------------------------------------------------

const REACH = 220; // px from Bin at which the look is at its full turn

/**
 * Bin's pupils follow the mouse and the head tilts a little (REDESIGN_V3 §4.4), through the CSS variables
 * `--look-x` / `--look-y` (-1..1) on the <svg>. On a touch screen it looks at the last touch for 1.5 seconds,
 * then back to the middle. Only runs while Bin is on screen.
 */
export function useBinLook(ref: RefObject<SVGSVGElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    let visible = false;
    let raf = 0;
    let back: ReturnType<typeof setTimeout> | undefined;

    const set = (x: number, y: number) => {
      el.style.setProperty("--look-x", x.toFixed(2));
      el.style.setProperty("--look-y", y.toFixed(2));
    };
    const toward = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      const dx = clientX - (r.left + r.width / 2);
      const dy = clientY - (r.top + r.height / 2);
      const clamp = (n: number) => Math.max(-1, Math.min(1, n));
      set(clamp(dx / REACH), clamp(dy / REACH));
    };

    const onMove = (e: PointerEvent) => {
      if (!visible) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => toward(e.clientX, e.clientY));
    };
    const onTouch = (e: PointerEvent) => {
      if (!visible || e.pointerType === "mouse") return;
      toward(e.clientX, e.clientY);
      clearTimeout(back);
      back = setTimeout(() => set(0, 0), 1500);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(el);
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onTouch, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onTouch);
      cancelAnimationFrame(raf);
      clearTimeout(back);
    };
  }, [ref, enabled]);
}

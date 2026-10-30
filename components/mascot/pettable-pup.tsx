"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fireConfetti } from "@/components/fx/confetti";
import { haptic } from "@/lib/haptics";
import { say as sayLine, type BinAction, type LineKey, type PupMood } from "@/lib/mascot/lines";
import { playSfx } from "@/lib/sfx";
import type { BuddySpecies } from "@/lib/bin/buddies";
import { cn } from "@/lib/utils";
import { useBinHome } from "./bin-home-provider";
import { Buddy } from "./buddy";
import { Pup } from "./pup";
import { useBinAction } from "./use-bin";

/** Three outline hearts that float up once, as the answer to a pat. */
function Hearts() {
  return (
    <svg
      viewBox="0 0 60 40"
      aria-hidden
      className="pointer-events-none absolute -top-5 left-1/2 w-2/3 -translate-x-1/2 overflow-visible"
      fill="none"
      stroke="var(--pup-ink)"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {[
        { x: 12, delay: 0 },
        { x: 30, delay: 0.12 },
        { x: 48, delay: 0.24 },
      ].map((h) => (
        <path
          key={h.x}
          className="pup-rise"
          style={{ animationDelay: `${h.delay}s` }}
          d={`M${h.x} 30c-8-5-9-12-4-14c3-1 4 1 4 2c0-1 1-3 4-2c5 2 4 9-4 14z`}
        />
      ))}
    </svg>
  );
}

/** A plain pat does one of these small things. */
const PAT_ACTIONS: BinAction[] = ["nod", "wave", "bark"];

const RAPID_WINDOW_MS = 3000;
const LONG_PRESS_MS = 600;

/** The big celebration for ten quick pats happens once per visit, not on every ten. */
let celebrated = false;

/**
 * The puppy as a button (REDESIGN_V3 §5.1). A tap: boop, hearts and a small move (nod, wave or bark). Five quick
 * taps make it spin, ten make it dance with confetti (once per visit). Holding for 0.6 s rolls it over for a belly
 * rub. Its pupils follow the pointer. With `sleepAfterMs` it yawns and falls asleep when nobody touches the page,
 * and jumps awake at the next touch. With `bubble` a tap also shows a small line with a way into Bin's corner.
 */
export function PettablePup({
  mood,
  name,
  size,
  className,
  onPet,
  bubble = false,
  bubbleClassName,
  pupClassName,
  sleepAfterMs,
  defaultBubbleText,
  outfit,
  buddy,
}: {
  mood: PupMood;
  name: string;
  size: number;
  className?: string;
  /** Called with the number of pats so far and, for the special reactions, which line key fits (spin, dance, wake). */
  onPet?: (count: number, line?: LineKey) => void;
  /** Show the reaction as a small bubble next to the puppy (when the page has no bubble of its own). */
  bubble?: boolean;
  bubbleClassName?: string;
  /** Class for the drawing itself, e.g. `size-24 xl:size-30` to grow it on wide screens (`size` is the small one). */
  pupClassName?: string;
  sleepAfterMs?: number;
  /** Optional initial bubble text shown before the first pat (e.g. daily greeting). */
  defaultBubbleText?: string;
  /** Optional outfit override (e.g. scarf on streak freeze). */
  outfit?: string;
  /** Optional companion buddy following Bin. */
  buddy?: BuddySpecies | null;
}) {
  const home = useBinHome();
  const [pets, setPets] = useState(0);
  const [petting, setPetting] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [buddyMood, setBuddyMood] = useState<"happy" | "sleepy" | "cheer">("happy");
  const activeBubbleText = pets > 0 ? bubbleText : (bubbleText ?? defaultBubbleText ?? null);
  const bin = useBinAction(sleeping ? "sleepy" : mood);
  const playRef = useRef(bin.play);
  useEffect(() => {
    playRef.current = bin.play;
  }, [bin.play]);

  const rapid = useRef({ n: 0, last: 0 });
  const timers = useRef<{ petting?: ReturnType<typeof setTimeout>; bubble?: ReturnType<typeof setTimeout>; press?: ReturnType<typeof setTimeout>; rub?: ReturnType<typeof setInterval> }>({});
  const longPressed = useRef(false);
  const sleepingRef = useRef(false);
  const petsRef = useRef(0);

  useEffect(() => {
    const t = timers.current;
    return () => {
      clearTimeout(t.petting);
      clearTimeout(t.bubble);
      clearTimeout(t.press);
      clearInterval(t.rub);
    };
  }, []);

  const showBubble = useCallback(
    (key: LineKey, count: number) => {
      if (!bubble) return;
      setBubbleText(sayLine(key, { seed: Math.max(0, count - 1), name }));
      clearTimeout(timers.current.bubble);
      timers.current.bubble = setTimeout(() => setBubbleText(null), 6000);
    },
    [bubble, name],
  );

  const onPetRef = useRef(onPet);
  const showBubbleRef = useRef(showBubble);
  useEffect(() => {
    onPetRef.current = onPet;
    showBubbleRef.current = showBubble;
  }, [onPet, showBubble]);

  // Falls asleep when nothing has been touched for a while; any touch wakes it.
  useEffect(() => {
    if (!sleepAfterMs) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let drowsy: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        playRef.current("yawn");
        drowsy = setTimeout(() => {
          sleepingRef.current = true;
          setSleeping(true);
        }, 1300);
      }, sleepAfterMs);
    };
    const onActivity = () => {
      clearTimeout(drowsy);
      if (sleepingRef.current) {
        sleepingRef.current = false;
        setSleeping(false);
        playRef.current("surprised");
        onPetRef.current?.(petsRef.current, "wake");
        showBubbleRef.current("wake", petsRef.current + 1);
      }
      arm();
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    arm();
    return () => {
      clearTimeout(timer);
      clearTimeout(drowsy);
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [sleepAfterMs]);

  function pet() {
    playSfx("boop");
    haptic("light");
    const now = Date.now();
    rapid.current.n = now - rapid.current.last < RAPID_WINDOW_MS ? rapid.current.n + 1 : 1;
    rapid.current.last = now;
    const total = pets + 1;
    petsRef.current = total;
    setPets(total);

    let line: LineKey | undefined;
    if (rapid.current.n >= 10 && !celebrated) {
      celebrated = true;
      rapid.current.n = 0;
      bin.play("dance");
      void fireConfetti("small");
      line = "dance";
    } else if (rapid.current.n === 5) {
      bin.play("spin");
      line = "spin";
    } else {
      bin.play(PAT_ACTIONS[total % PAT_ACTIONS.length]);
    }

    setPetting(true);
    clearTimeout(timers.current.petting);
    timers.current.petting = setTimeout(() => setPetting(false), 1800);
    onPet?.(total, line);
    showBubble(line ?? "pet", total);
  }

  function startPress() {
    longPressed.current = false;
    clearTimeout(timers.current.press);
    timers.current.press = setTimeout(() => {
      longPressed.current = true;
      bin.play("rollOver");
      haptic("heavy");
      playSfx("boop");
      timers.current.rub = setInterval(() => playSfx("boop"), 450);
    }, LONG_PRESS_MS);
  }

  function endPress() {
    clearTimeout(timers.current.press);
    clearInterval(timers.current.rub);
  }

  const shown: PupMood = bin.action ? bin.mood : petting ? "love" : sleeping ? "sleepy" : mood;

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-label={`Xoa đầu ${name}`}
        title={`Xoa đầu ${name}`}
        onClick={() => {
          if (longPressed.current) {
            longPressed.current = false;
            return;
          }
          pet();
        }}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onContextMenu={(e) => e.preventDefault()}
        className="bin-pet relative block cursor-pointer touch-manipulation rounded-full select-none"
      >
        <Pup mood={shown} action={bin.action} size={size} follow={size >= 40} className={pupClassName} outfit={outfit} />
        {petting && <Hearts key={pets} />}
      </button>
      {buddy && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setBuddyMood("cheer");
            playSfx("pop");
            haptic("light");
            setTimeout(() => setBuddyMood("happy"), 1000);
          }}
          aria-label="Chạm vào bạn nhỏ"
          data-testid="buddy"
          className="absolute -left-6 -bottom-1 z-10 block cursor-pointer touch-manipulation rounded-full border-0 bg-transparent p-0 transition-transform active:scale-95 lg:-left-9 lg:bottom-0"
        >
          <Buddy
            species={buddy}
            mood={buddyMood}
            size={40}
            className="size-10 lg:size-14"
          />
        </button>
      )}
      {activeBubbleText && (
        <div
          role="status"
          className={cn(
            "absolute right-full bottom-3 z-10 mr-2 flex w-max max-w-56 flex-col items-start gap-1.5 rounded-lg rounded-br-[4px] bg-surface px-3 py-2 text-[0.9375rem] leading-snug font-medium text-fg shadow-md dark:border dark:border-border",
            bubbleClassName,
          )}
        >
          {activeBubbleText}
          {home && (
            <button
              type="button"
              onClick={home.open}
              className="min-h-9 rounded-full bg-primary-soft px-3 text-sm font-bold text-primary-fg hover:bg-primary-soft/70"
            >
              Chơi với {name}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

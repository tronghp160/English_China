"use client";

import { CloudOff, Loader2, Star, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { ComboBadge, ComboBanner } from "@/components/fx/combo-badge";
import { CountUp } from "@/components/fx/count-up";
import { useXpArrive } from "@/components/fx/xp-burst";
import { Pup } from "@/components/mascot/pup";
import { useBinAction } from "@/components/mascot/use-bin";
import { updatePrefs } from "@/lib/actions/profile";
import { isComboMilestone } from "@/lib/combo";
import { beginSessionBaseline } from "@/lib/session-baseline";
import { say, type PupMood } from "@/lib/mascot/lines";
import { playSfx, setSfxEnabled } from "@/lib/sfx";
import { subscribeOutbox, type OutboxStatus } from "@/lib/srs/outbox";
import { cn } from "@/lib/utils";
import type { HudTalk, SessionReaction } from "./use-session-hud";

export function useOutboxStatus() {
  const [status, setStatus] = useState<OutboxStatus>({ pending: 0, syncing: false, error: null });
  useEffect(() => subscribeOutbox(setStatus), []);
  return status;
}

/** Quarter marks on the bar: passing one lights it up with a pop. */
const MILESTONES = [25, 50, 75] as const;
/** Bin yawns and asks if you are still there after this long without a move. */
const IDLE_MS = 25_000;

/** The speaker of the bar: sound on or off for the whole app (pref `sound`). */
function SoundToggle() {
  const { prefs } = useMe();
  const [on, setOn] = useState(prefs.sound);
  return (
    <button
      type="button"
      aria-label={on ? "Tắt âm thanh" : "Bật âm thanh"}
      aria-pressed={on}
      onClick={() => {
        const next = !on;
        setOn(next);
        setSfxEnabled(next);
        if (next) playSfx("pop");
        void updatePrefs({ sound: next });
      }}
      className="grid size-10 shrink-0 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      {on ? <Volume2 className="size-5" strokeWidth={1.75} aria-hidden /> : <VolumeX className="size-5" strokeWidth={1.75} aria-hidden />}
    </button>
  );
}

/**
 * Top bar of a focus session (REDESIGN_V3 §7.1): exit, a 14px progress bar with quarter marks and Bin riding its
 * head, and on the right the flame with the combo, the star with the session XP and a sound switch. With `hud` Bin
 * jumps for a right answer, droops for a wrong one, dances at a combo milestone and yawns after 25 s of nothing; a
 * banner announces the milestones. Without `hud` (the old shape) it shows done/total and the sync state.
 */
export function SessionBar({
  done,
  total,
  exitHref,
  pup,
  segments,
  label,
  hud,
  ariaLabel = "Tiến độ phiên",
}: {
  done: number;
  total: number;
  exitHref: string;
  /** Mood of the tiny mascot at the head of the bar; omit to hide it (Bin off). */
  pup?: { mood: PupMood };
  /** Two-part bar (Learn): `mastered` in green, then `learning` in sun yellow, out of `total`. */
  segments?: { mastered: number; learning: number };
  /** Text at the right end instead of done/total */
  label?: string;
  /** Combo and XP of the session; their presence turns the HUD on. */
  hud?: { combo: number; xp: number; reaction: SessionReaction | null; talk?: HudTalk | null };
  ariaLabel?: string;
}) {
  const { prefs } = useMe();
  const sync = useOutboxStatus();
  useEffect(() => beginSessionBaseline(), []);
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const pctOf = (n: number) => (total ? Math.min(100, (n / total) * 100) : 0);

  // Bin on the bar: its own small actions on top of the face the session asks for
  const bin = useBinAction(pup?.mood ?? "happy");
  const play = useRef(bin.play);
  const clear = useRef(bin.clear);
  useEffect(() => {
    play.current = bin.play;
    clear.current = bin.clear;
  }, [bin.play, bin.clear]);
  const name = prefs.mascot_name;
  const talk = hud?.talk;
  const [dismissedTalkId, setDismissedTalkId] = useState<number | null>(null);
  const [idleBubble, setIdleBubble] = useState<string | null>(null);

  const bubble =
    talk && prefs.mascot && dismissedTalkId !== talk.id
      ? { text: say(talk.key, { seed: talk.id, name, n: talk.n, word: talk.word }), key: talk.key }
      : idleBubble
        ? { text: idleBubble, key: "idleSession" }
        : null;

  const reaction = hud?.reaction;
  const combo = hud?.combo ?? 0;
  useEffect(() => {
    if (!reaction) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (reaction.kind === "correct") play.current(isComboMilestone(combo) ? "dance" : "jump");
    else if (reaction.kind === "close") play.current("surprised");
    else {
      play.current("droop");
      t = setTimeout(() => clear.current(), 1000);
    }
    return () => clearTimeout(t);
    // only a new answer moves Bin; the combo it reads is the one that answer produced
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reaction?.n]);

  useEffect(() => {
    if (!talk || !prefs.mascot) return;

    if (talk.key === "comboTalk") {
      play.current("dance");
    } else if (talk.key === "redeem" || talk.key === "comeback") {
      play.current("highFive");
    } else if (talk.key === "wrongRun") {
      play.current("sit");
    }

    const t = setTimeout(() => {
      setDismissedTalkId(talk.id);
    }, 2600);
    return () => clearTimeout(t);
  }, [talk, prefs.mascot]);

  // Still there? After 25 s with no answer, key or tap Bin yawns and says so.
  useEffect(() => {
    if (!pup) return;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(idle);
      setIdleBubble(null);
      idle = setTimeout(() => {
        play.current("yawn");
        const text = say("idleSession", { seed: Math.floor(Date.now() / 1000), name });
        setIdleBubble(text);
        hide = setTimeout(() => setIdleBubble(null), 5000);
      }, IDLE_MS);
    };
    const events = ["pointerdown", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      clearTimeout(idle);
      clearTimeout(hide);
      events.forEach((e) => window.removeEventListener(e, arm));
    };
    // a new answer or step counts as a move too
  }, [pup, name, done, hud?.xp]);

  // The star bumps when a "+1 XP" lands on it
  const [bump, setBump] = useState(0);
  useXpArrive(useCallback(() => setBump((b) => b + 1), []));

  return (
    <div className="sticky top-0 z-10 -mx-4 bg-canvas/80 px-4 pb-2 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2">
        <Link
          href={exitHref}
          aria-label="Thoát phiên"
          className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-5" strokeWidth={1.75} aria-hidden />
        </Link>
        <div className="relative min-w-0 flex-1 pt-7">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            aria-label={ariaLabel}
            className="relative h-3.5 w-full overflow-hidden rounded-full bg-surface-3"
          >
            {segments ? (
              <>
                <div className="absolute inset-y-0 left-0 bg-success transition-[width] duration-500 ease-[var(--ease-spring)]" style={{ width: `${pctOf(segments.mastered)}%` }} />
                <div
                  className="absolute inset-y-0 bg-streak transition-[left,width] duration-500 ease-[var(--ease-out)]"
                  style={{ left: `${pctOf(segments.mastered)}%`, width: `${pctOf(segments.learning)}%` }}
                />
              </>
            ) : (
              <div
                className={cn("h-full rounded-full transition-[width] duration-500 ease-[var(--ease-spring)]", hud ? "bg-success" : "bg-primary")}
                style={{ width: `${pct}%` }}
              />
            )}
            {!segments &&
              MILESTONES.map((m, i) => {
                const passed = pct >= m;
                const latest = passed && (MILESTONES[i + 1] === undefined || pct < MILESTONES[i + 1]);
                return (
                  <span
                    key={`${m}-${passed ? "on" : "off"}`}
                    aria-hidden
                    className={cn(
                      "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                      passed ? "animate-pop bg-surface" : "bg-border-strong",
                      latest && "ring-[3px] ring-c-sun/70",
                    )}
                    style={{ left: `${m}%` }}
                  />
                );
              })}
          </div>
          {pup && (
            <span
              aria-hidden
              className="absolute top-0 -translate-x-1/2 transition-[left] duration-500 ease-[var(--ease-out)]"
              style={{ left: `clamp(15px, ${pct}%, calc(100% - 15px))` }}
            >
              <Pup mood={bin.mood} action={bin.action} size={30} />
            </span>
          )}
          {bubble && (
            <p
              role={bubble.key === "comboTalk" ? "status" : undefined}
              aria-live={bubble.key === "comboTalk" ? "polite" : undefined}
              className="pointer-events-none absolute top-full left-0 z-10 mt-1 rounded-lg rounded-tl-[4px] bg-surface px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-fg shadow-md"
            >
              {bubble.text}
            </p>
          )}
        </div>

        {hud ? (
          <>
            <ComboBadge combo={hud.combo} className="shrink-0" />
            <span
              key={bump}
              data-xp-counter=""
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full bg-xp-soft px-2.5 py-1 text-sm font-extrabold text-xp-fg tabular-nums",
                bump > 0 && "animate-pop",
              )}
            >
              <Star className="size-3.5 fill-c-grape" aria-hidden />
              <span className="sr-only">XP phiên này: </span>
              <CountUp value={hud.xp} duration={350} />
            </span>
            <SoundToggle />
          </>
        ) : (
          <span className="min-w-12 text-right text-[0.9375rem] font-bold whitespace-nowrap text-fg-muted tabular-nums">
            {label ?? `${done}/${total}`}
          </span>
        )}
        {sync.pending > 0 && (
          <span
            className="grid size-8 place-items-center text-fg-muted"
            title={sync.error ?? "Đang gửi kết quả…"}
            aria-label={sync.error ?? `Đang gửi ${sync.pending} kết quả`}
          >
            {sync.syncing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CloudOff className="size-4" aria-hidden />}
          </span>
        )}
      </div>
      {hud && <ComboBanner combo={hud.combo} className="pointer-events-none absolute inset-x-0 top-full z-10 pt-1" />}
      {sync.pending > 0 && sync.error && !sync.syncing && (
        <p role="status" className="rounded-md bg-streak-soft px-3 py-2 text-sm text-streak-fg">
          {sync.error}
        </p>
      )}
    </div>
  );
}

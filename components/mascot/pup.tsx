"use client";

import { useRef } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import type { BinAction, PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { OutfitHead, OutfitNeck } from "./outfits";
import { useBinIdle, useBinLook } from "./use-bin";

/**
 * "Bin", the puppy (REDESIGN_V2 §5.16, REDESIGN_V3 §4): a dark ink outline, white fur, solid brown ears, a cream
 * muzzle, pink cheeks, a blue collar with a sun-yellow tag. The drawing is split into groups (`bin-root`,
 * `bin-head`, `bin-ear-l`, `bin-paw-r`, ...) so CSS can move each part: it breathes, blinks and wags on its own,
 * does a small thing every few seconds (`useBinIdle`), and plays a one-off `action` (jump, dance, cover its eyes ...)
 * from `useBinAction`. The marks around the head (+, hearts, tear, z, ?, !) fade in once when the mood changes.
 * Pure SVG, decorative (the words next to it carry the meaning); colors are the --pup-* tokens.
 */
const INK = "var(--pup-ink)";
/** Features drawn on the fur (eyes, nose, mouth, toes) keep a dark line even when the outline is light (dark mode). */
const FEATURE = "var(--pup-feature)";

/** Heart outline centered on (x, y); `s` is about half its width. */
function heart(x: number, y: number, s: number) {
  return `M${x} ${y + s * 0.9}C${x - s * 1.6} ${y - s * 0.2} ${x - s * 0.7} ${y - s * 1.4} ${x} ${y - s * 0.5}C${x + s * 0.7} ${y - s * 1.4} ${x + s * 1.6} ${y - s * 0.2} ${x} ${y + s * 0.9}Z`;
}

/** A small "+" drawn with two strokes. */
function plus(x: number, y: number, s: number) {
  return `M${x - s} ${y}H${x + s}M${x} ${y - s}V${y + s}`;
}

/** A hand-drawn "z". */
function zed(x: number, y: number, s: number) {
  return `M${x} ${y}h${s}l${-s} ${s}h${s}`;
}

function Eyes({ mood, animated }: { mood: PupMood; animated: boolean }) {
  const dot = (cx: number, r = 4.6) => <circle cx={cx} cy={50} r={r} fill={FEATURE} stroke="none" />;
  const blink = animated ? "pup-blink" : undefined;
  switch (mood) {
    case "cheer":
      return (
        <g>
          <path d="M41 52q6-8 12 0" />
          <path d="M67 52q6-8 12 0" />
        </g>
      );
    case "sleepy":
      return (
        <g>
          <path d="M41 50q6 5 12 0" />
          <path d="M67 50q6 5 12 0" />
        </g>
      );
    case "love":
      return (
        <g fill="var(--danger)" stroke="var(--danger)" strokeWidth={1.2}>
          <path d={heart(47, 50, 6)} />
          <path d={heart(73, 50, 6)} />
        </g>
      );
    case "surprised":
      return (
        <g className="bin-pupils">
          {dot(47, 6)}
          {dot(73, 6)}
        </g>
      );
    case "wink":
      return (
        <g>
          <g className="bin-pupils">
            <g className={blink}>{dot(47)}</g>
          </g>
          <path d="M67 51q6-7 12 0" />
        </g>
      );
    case "cool":
      return (
        <g fill={FEATURE}>
          <path d="M37 46h46" />
          <rect x={37} y={44} width={20} height={13} rx={5.5} />
          <rect x={63} y={44} width={20} height={13} rx={5.5} />
        </g>
      );
    case "sad":
      return (
        <g className="bin-pupils">
          <g className={blink}>
            {dot(47, 4.2)}
            {dot(73, 4.2)}
          </g>
        </g>
      );
    default:
      return (
        <g className="bin-pupils">
          <g className={blink}>
            {dot(47)}
            {dot(73)}
          </g>
        </g>
      );
  }
}

/** Small brows that carry the feeling (sad, surprised, a raised one when thinking). */
function Brows({ mood }: { mood: PupMood }) {
  switch (mood) {
    case "sad":
      return (
        <g className="bin-brows">
          <path d="M40 43l10-4" />
          <path d="M80 43l-10-4" />
        </g>
      );
    case "surprised":
      return (
        <g className="bin-brows">
          <path d="M41 39q6-4 12 0" />
          <path d="M67 39q6-4 12 0" />
        </g>
      );
    case "think":
      return (
        <g className="bin-brows">
          <path d="M68 40q6-4 12-1" />
        </g>
      );
    default:
      return null;
  }
}

function Mouth({ mood }: { mood: PupMood }) {
  switch (mood) {
    case "cheer":
    case "wave":
    case "love":
      return <path d="M52 66q8 14 16 0z" fill="var(--pup-blush)" />;
    case "surprised":
      return <ellipse cx={60} cy={69} rx={3.4} ry={4.4} fill={FEATURE} stroke="none" />;
    case "wink":
      return (
        <g>
          <path d="M52 66q4 4 8 0q4 4 8 0" />
          <path d="M60 68.5h5v3.5a2.5 2.5 0 0 1-5 0z" fill="var(--pup-blush)" />
        </g>
      );
    case "cool":
      return <path d="M54 66q7 4 13-2" />;
    case "sad":
      return <path d="M54 71q6-5 12 0" />;
    case "sleepy":
      return <ellipse cx={60} cy={68} rx={2.4} ry={2.8} fill={FEATURE} stroke="none" />;
    case "think":
      return <path d="M55 67q5 1 10-2" />;
    default:
      return <path d="M52 66q4 4 8 0q4 4 8 0" />;
  }
}

/** The marks around the head; the whole group fades in once (`pup-extra`) because Pup remounts it per mood. */
function Extras({ mood, animated }: { mood: PupMood; animated: boolean }) {
  switch (mood) {
    case "cheer":
    case "cool":
      return (
        <g className="pup-extra">
          <path d={plus(14, 30, 5)} />
          <path d={plus(106, 38, 4)} />
          <path d={plus(98, 10, 3.5)} />
        </g>
      );
    case "love":
      return (
        <g className="pup-extra">
          <path d={heart(100, 30, 5)} />
          <path d={heart(16, 34, 4)} />
          <path d={heart(92, 12, 3.5)} />
        </g>
      );
    case "sad":
      return <path className="pup-extra" d="M40 56q-3.5 5.5 0 8q3.5-2.5 0-8z" />;
    case "sleepy":
      return (
        <g className="pup-extra">
          <path className={animated ? "bin-z" : undefined} d={zed(92, 14, 9)} />
          <path className={animated ? "bin-z bin-z-late" : undefined} d={zed(106, 4, 6)} />
        </g>
      );
    case "think":
      return (
        <g className="pup-extra">
          <path d="M94 18c0-10 16-10 16-1c0 6-8 7-8 13" />
          <circle cx={102} cy={37} r={1.8} fill={INK} stroke="none" />
        </g>
      );
    case "surprised":
      return (
        <g className="pup-extra">
          <path d="M100 4v18" />
          <circle cx={100} cy={30} r={1.9} fill={INK} stroke="none" />
        </g>
      );
    default:
      return null;
  }
}

/** A front paw seen from the front, raised to Bin's face; CSS turns it into a wave, a high five or a kick. */
function Paw({ side }: { side: "l" | "r" }) {
  const left = side === "l";
  const arm = left ? "M46 86Q34 72 44 57" : "M74 86Q86 72 76 57";
  const cx = left ? 45 : 75;
  return (
    <g className={left ? "bin-paw-l" : "bin-paw-r"}>
      <path d={arm} stroke={INK} strokeWidth={12} />
      <path d={arm} stroke="var(--pup-fur)" strokeWidth={7} />
      <ellipse cx={cx} cy={50} rx={11} ry={9} fill="var(--pup-fur)" />
      <path d={`M${cx - 5} 44.5v3M${cx} 43.5v3M${cx + 5} 44.5v3`} stroke={FEATURE} strokeWidth={1.8} />
    </g>
  );
}

/** Things that only exist while an action runs: the bone, the ball, the bark, crumbs, sparkles. */
function Props() {
  return (
    <g className="bin-props">
      <g className="bin-bone">
        <path
          d="M53 69.5a2.6 2.6 0 1 1 1.4-3.4h11.2a2.6 2.6 0 1 1 1.4 3.4a2.6 2.6 0 1 1-1.4 3.4h-11.2a2.6 2.6 0 1 1-1.4-3.4z"
          fill="var(--pup-muzzle)"
          stroke={FEATURE}
          strokeWidth={1.6}
        />
      </g>
      <g className="bin-crumbs" stroke="none" fill="var(--pup-muzzle)">
        <circle className="bin-crumb" cx={50} cy={74} r={1.3} />
        <circle className="bin-crumb bin-crumb-2" cx={60} cy={76} r={1.1} />
        <circle className="bin-crumb bin-crumb-3" cx={70} cy={74} r={1.4} />
      </g>
      <g className="bin-ball">
        <circle cx={60} cy={68} r={5.5} fill="var(--c-mint)" stroke={FEATURE} strokeWidth={1.6} />
        <path d="M55.2 65.6q4.8 3.4 9.6 0" stroke={FEATURE} strokeWidth={1.2} />
      </g>
      <g className="bin-bark">
        <path d="M82 14h26a7 7 0 0 1 0 14H93l-7 6v-6.4A7 7 0 0 1 82 14z" fill="var(--surface)" strokeWidth={1.6} />
        <text x={97} y={24.6} textAnchor="middle" fontSize={9.5} fontWeight={800} fill={INK} stroke="none">
          Gâu!
        </text>
      </g>
      <g className="bin-spark" strokeWidth={2}>
        <path d="M96 34l4-4M101 44h5M96 54l4 4" stroke="var(--c-sun)" />
      </g>
    </g>
  );
}

const WAGGY: PupMood[] = ["cheer", "love", "wink", "cool", "wave"];

export function Pup({
  mood = "happy",
  size = 96,
  animated = true,
  action,
  outfit: outfitProp,
  look,
  follow = false,
  onActionEnd,
  className,
}: {
  mood?: PupMood;
  size?: number;
  /** Breathing, blinking, the wagging tail and the small idle moves. Off = a still picture. */
  animated?: boolean;
  /** A one-off thing Bin does now (see useBinAction). */
  action?: BinAction | null;
  /** What Bin wears: an id from OUTFITS in lib/progress.ts ("none" = nothing). Left out, it is the outfit the person chose (pref `bin_outfit`), so Bin looks the same everywhere. */
  outfit?: string;
  /** Where Bin looks, -1..1 on each axis (e.g. at a form field). Bin follows the mouse instead with `follow`. */
  look?: { x: number; y: number };
  /** The pupils follow the mouse pointer (touch: the last touch). */
  follow?: boolean;
  /** The action's animation finished. */
  onActionEnd?: () => void;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const me = useOptionalMe();
  const outfit = outfitProp ?? me?.prefs.bin_outfit ?? "none";
  useBinIdle(ref, { enabled: animated, mood });
  useBinLook(ref, follow && animated);

  // Ears hang lower when sad or sleepy and perk up when excited.
  const ear =
    mood === "cheer" || mood === "surprised" || mood === "love" ? -12 : mood === "sad" || mood === "sleepy" ? 10 : 0;
  // Small sizes need a heavier line to stay readable.
  const sw = Math.max(2.25, 150 / size);
  const tail =
    !animated || mood === "sleepy" || mood === "sad" ? undefined : WAGGY.includes(mood) ? "pup-tail pup-tail-fast" : "pup-tail";
  const scarf = outfit === "scarf";

  return (
    <svg
      ref={ref}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden
      className={cn("bin shrink-0 overflow-visible", className)}
      data-mood={mood}
      data-action={action ?? undefined}
      data-outfit={outfit === "none" ? undefined : outfit}
      data-animated={animated ? "" : undefined}
      style={look ? ({ "--look-x": look.x, "--look-y": look.y } as React.CSSProperties) : undefined}
      onAnimationEnd={(e) => {
        if (onActionEnd && action && e.target instanceof SVGElement && e.target.classList.contains("bin-root")) onActionEnd();
      }}
      fill="none"
      stroke={INK}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g className="bin-root">
        <ellipse className="bin-shadow" cx={60} cy={114} rx={27} ry={3.6} fill={INK} stroke="none" />

        {/* Tail: a single curved stroke */}
        <g className="bin-tail">
          <path d="M82 100C97 98 102 86 95 76" className={tail} />
        </g>

        {/* Body, feet, collar */}
        <g className="bin-body">
          <path d="M40 84C32 96 33 111 47 113h26c14-2 15-17 7-29" fill="var(--pup-fur)" />
          <path d="M47 113c0-6 8-6 8 0M65 113c0-6 8-6 8 0" />
          {!scarf && (
            <>
              <path d="M42 81q18 9 36 0" stroke="var(--pup-collar)" strokeWidth={sw + 2} />
              <circle cx={60} cy={90} r={3.4} fill="var(--pup-tag)" strokeWidth={sw * 0.6} />
            </>
          )}
        </g>
        <g className="bin-outfit-neck">
          <OutfitNeck outfit={outfit} />
        </g>

        <g className="bin-head">
          <g transform={mood === "think" ? "rotate(-9 60 56)" : mood === "wink" ? "rotate(5 60 56)" : undefined}>
            {/* Ears sit behind the head and are shaded like pencil */}
            <g className="bin-ear-l">
              <path d="M36 28C22 25 13 41 17 60c6 7 17 1 21-15z" fill="var(--pup-ear)" transform={`rotate(${ear} 34 32)`} />
            </g>
            <g className="bin-ear-r">
              <path d="M84 28c14-3 23 13 19 32-6 7-17 1-21-15z" fill="var(--pup-ear)" transform={`rotate(${-ear} 86 32)`} />
            </g>
            {/* Head */}
            <path d="M29 50C27 31 42 22 60 22c19 0 33 10 31 31-1 19-15 28-31 28-17 0-30-9-31-31z" fill="var(--pup-fur)" />
            <ellipse cx={60} cy={65} rx={17} ry={12.5} fill="var(--pup-muzzle)" stroke="none" />
            <circle className="bin-blush" cx={38} cy={62} r={3.6} fill="var(--pup-blush)" stroke="none" />
            <circle className="bin-blush" cx={82} cy={62} r={3.6} fill="var(--pup-blush)" stroke="none" />
            <g className="bin-face" stroke={FEATURE}>
              <g className="bin-eyes">
                <Eyes mood={mood} animated={animated} />
              </g>
              <Brows mood={mood} />
              {/* Nose: a rounded triangle */}
              <g className="bin-nose">
                <path d="M54.5 58c0-2.5 11-2.5 11 0c0 3.5-4 5.5-5.5 5.5S54.5 61.5 54.5 58z" fill={FEATURE} stroke="none" />
                <path d="M60 63.5V66" />
              </g>
              <g className="bin-mouth">
                <g className="bin-mouth-plain">
                  <Mouth mood={mood} />
                </g>
                {/* An open mouth with a tongue, for yawning, chewing, barking and catching */}
                <g className="bin-open" stroke="none">
                  <ellipse cx={60} cy={70} rx={6.2} ry={7.4} fill={FEATURE} />
                  <path d="M54.4 73.8q5.6-4.6 11.2 0q-1.4 5.2-5.6 5.2t-5.6-5.2z" fill="var(--pup-blush)" />
                </g>
              </g>
            </g>
            <g className="bin-outfit-head">
              <OutfitHead outfit={outfit} />
            </g>
          </g>
          <Props />
        </g>

        <Paw side="l" />
        <Paw side="r" />
      </g>

      <Extras key={mood} mood={mood} animated={animated} />
    </svg>
  );
}

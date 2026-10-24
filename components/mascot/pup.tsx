import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";

/**
 * "Bin", the puppy: a doodle in the margin of a notebook (REDESIGN_PLAN §5.8).
 * One uneven pen line in violet ink, a paper-colored body, pale pencil-shaded ears,
 * two cheek dots. Only the eyes blink and the tail wags; the extras around the head
 * (+, hearts, tear, z, ?, !) fade in once when the mood changes and then stay still.
 * Pure SVG, decorative (the words next to it carry the meaning); colors are the --pup-* tokens.
 */
const INK = "var(--pup-fg)";

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
  const dot = (cx: number, r = 4.6) => <circle cx={cx} cy={50} r={r} fill={INK} stroke="none" />;
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
        <g>
          {dot(47, 6)}
          {dot(73, 6)}
          <path d="M41 39q6-4 12 0" />
          <path d="M67 39q6-4 12 0" />
        </g>
      );
    case "wink":
      return (
        <g>
          <g className={blink}>{dot(47)}</g>
          <path d="M67 51q6-7 12 0" />
        </g>
      );
    case "cool":
      return (
        <g fill={INK}>
          <path d="M37 46h46" />
          <rect x={37} y={44} width={20} height={13} rx={5.5} />
          <rect x={63} y={44} width={20} height={13} rx={5.5} />
        </g>
      );
    case "sad":
      return (
        <g>
          <g className={blink}>
            {dot(47, 4.2)}
            {dot(73, 4.2)}
          </g>
          <path d="M40 43l10-4" />
          <path d="M80 43l-10-4" />
        </g>
      );
    default:
      return (
        <g className={blink}>
          {dot(47)}
          {dot(73)}
        </g>
      );
  }
}

function Mouth({ mood }: { mood: PupMood }) {
  switch (mood) {
    case "cheer":
    case "wave":
    case "love":
      return <path d="M52 66q8 14 16 0z" fill="var(--pup-blush)" />;
    case "surprised":
      return <ellipse cx={60} cy={69} rx={3.4} ry={4.4} fill={INK} stroke="none" />;
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
      return <ellipse cx={60} cy={68} rx={2.4} ry={2.8} fill={INK} stroke="none" />;
    case "think":
      return <path d="M55 67q5 1 10-2" />;
    default:
      return <path d="M52 66q4 4 8 0q4 4 8 0" />;
  }
}

/** The marks around the head; the whole group fades in once (`pup-extra`) because Pup remounts it per mood. */
function Extras({ mood }: { mood: PupMood }) {
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
          <path d={zed(92, 14, 9)} />
          <path d={zed(106, 4, 6)} />
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

const WAGGY: PupMood[] = ["cheer", "love", "wink", "cool", "wave"];

export function Pup({
  mood = "happy",
  size = 96,
  animated = true,
  className,
}: {
  mood?: PupMood;
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  // Ears hang lower when sad or sleepy and perk up when excited.
  const ear =
    mood === "cheer" || mood === "surprised" || mood === "love" ? -12 : mood === "sad" || mood === "sleepy" ? 10 : 0;
  // Small sizes need a heavier line to stay readable.
  const sw = Math.max(2.25, 150 / size);
  const tail =
    !animated || mood === "sleepy" || mood === "sad" ? undefined : WAGGY.includes(mood) ? "pup-tail pup-tail-fast" : "pup-tail";
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0 overflow-visible", className)}
      fill="none"
      stroke={INK}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Tail: a single curved stroke */}
      <path d="M82 100C97 98 102 86 95 76" className={tail} />
      {/* Body, paws, collar */}
      <path d="M40 84C32 96 33 111 47 113h26c14-2 15-17 7-29" fill="var(--pup-fur)" />
      <path d="M47 113c0-6 8-6 8 0M65 113c0-6 8-6 8 0" />
      {mood === "wave" && <path d="M89 80C89 69 99 64 102 72c3 8-3 16-10 16" fill="var(--pup-fur)" />}
      <path d="M42 81q18 9 36 0" />
      <circle cx={60} cy={90} r={2.6} fill="var(--pup-fur)" />

      <g transform={mood === "think" ? "rotate(-9 60 56)" : mood === "wink" ? "rotate(5 60 56)" : undefined}>
        {/* Ears sit behind the head and are shaded like pencil */}
        <path d="M36 28C22 25 13 41 17 60c6 7 17 1 21-15z" fill="var(--pup-ear)" transform={`rotate(${ear} 34 32)`} />
        <path d="M84 28c14-3 23 13 19 32-6 7-17 1-21-15z" fill="var(--pup-ear)" transform={`rotate(${-ear} 86 32)`} />
        {/* Head */}
        <path d="M29 50C27 31 42 22 60 22c19 0 33 10 31 31-1 19-15 28-31 28-17 0-30-9-31-31z" fill="var(--pup-fur)" />
        <circle cx={38} cy={62} r={3.6} fill="var(--pup-blush)" stroke="none" />
        <circle cx={82} cy={62} r={3.6} fill="var(--pup-blush)" stroke="none" />
        <Eyes mood={mood} animated={animated} />
        {/* Nose: a rounded triangle */}
        <path d="M54.5 58c0-2.5 11-2.5 11 0c0 3.5-4 5.5-5.5 5.5S54.5 61.5 54.5 58z" fill={INK} stroke="none" />
        <path d="M60 63.5V66" />
        <Mouth mood={mood} />
      </g>

      <Extras key={mood} mood={mood} />
    </svg>
  );
}

import type { CSSProperties } from "react";
import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";

const INK = "var(--pup-ink)";
const FONT = "var(--font-sans), sans-serif"; // temporary: the drawing is redone in P2 (REDESIGN_PLAN §5.8)

/** Heart centered on (x, y); `s` is about half its width. */
function heart(x: number, y: number, s: number) {
  return `M${x} ${y + s * 0.9}C${x - s * 1.6} ${y - s * 0.2} ${x - s * 0.7} ${y - s * 1.4} ${x} ${y - s * 0.5}C${x + s * 0.7} ${y - s * 1.4} ${x + s * 1.6} ${y - s * 0.2} ${x} ${y + s * 0.9}Z`;
}

/** Four-point sparkle centered on (x, y). */
function sparkle(x: number, y: number, s: number) {
  const k = s / 4;
  return `M${x} ${y - s}L${x + k} ${y - k}L${x + s} ${y}L${x + k} ${y + k}L${x} ${y + s}L${x - k} ${y + k}L${x - s} ${y}L${x - k} ${y - k}Z`;
}

const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

function OpenEyes({ r = 5.2, animated }: { r?: number; animated: boolean }) {
  return (
    <g className={cn(animated && "pup-blink")}>
      <circle cx={48} cy={50} r={r} fill={INK} />
      <circle cx={72} cy={50} r={r} fill={INK} />
      <circle cx={49.8} cy={48} r={r / 3} fill="white" />
      <circle cx={73.8} cy={48} r={r / 3} fill="white" />
    </g>
  );
}

function Eyes({ mood, animated }: { mood: PupMood; animated: boolean }) {
  const stroke = { fill: "none", stroke: INK, strokeWidth: 3.2, strokeLinecap: "round" as const };
  switch (mood) {
    case "cheer":
      return (
        <g {...stroke}>
          <path d="M42 52q6-8 12 0" />
          <path d="M66 52q6-8 12 0" />
        </g>
      );
    case "sleepy":
      return (
        <g {...stroke}>
          <path d="M42 50q6 5 12 0" />
          <path d="M66 50q6 5 12 0" />
        </g>
      );
    case "love":
      return (
        <g fill="var(--margin-red)" className={cn(animated && "pup-pulse")}>
          <path d={heart(48, 50, 6)} />
          <path d={heart(72, 50, 6)} />
        </g>
      );
    case "surprised":
      return (
        <g>
          <OpenEyes r={6.4} animated={false} />
          <g fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round">
            <path d="M42 39q6-4 12 0" />
            <path d="M66 39q6-4 12 0" />
          </g>
        </g>
      );
    case "wink":
      return (
        <g>
          <circle cx={48} cy={50} r={5.2} fill={INK} />
          <circle cx={49.8} cy={48} r={1.7} fill="white" />
          <path d="M66 51q6-7 12 0" {...stroke} />
        </g>
      );
    case "cool":
      return (
        <g>
          <path d="M38 45h44" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
          <rect x={38} y={44} width={19} height={12} rx={5} fill={INK} />
          <rect x={63} y={44} width={19} height={12} rx={5} fill={INK} />
          <path d="M42 48l5 0M67 48l5 0" stroke="white" strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
        </g>
      );
    case "sad":
      return (
        <g>
          <OpenEyes r={4.5} animated={animated} />
          <g fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round">
            <path d="M41 43l10-4" />
            <path d="M79 43l-10-4" />
          </g>
        </g>
      );
    default:
      return <OpenEyes animated={animated} />;
  }
}

function Mouth({ mood }: { mood: PupMood }) {
  const line = { fill: "none", stroke: INK, strokeWidth: 2.4, strokeLinecap: "round" as const };
  switch (mood) {
    case "cheer":
    case "wave":
    case "love":
      return (
        <g>
          <path d="M52 64q8 13 16 0z" fill={INK} />
          <path d="M55.5 69q4.5 4 9 0q-4.5-3-9 0z" fill="var(--pup-blush)" />
        </g>
      );
    case "surprised":
      return <ellipse cx={60} cy={68} rx={3.6} ry={4.6} fill={INK} />;
    case "wink":
      return (
        <g>
          <path d="M53 64q3.5 4 7 0q3.5 4 7 0" {...line} />
          <path d="M61 66.5h6v3.5a3 3 0 0 1-6 0z" fill="var(--pup-blush)" />
        </g>
      );
    case "cool":
      return <path d="M54 65q7 4 13-2" {...line} />;
    case "sad":
      return <path d="M54 69q6-5 12 0" {...line} />;
    case "sleepy":
      return <ellipse cx={60} cy={67} rx={2.6} ry={3} fill={INK} />;
    case "think":
      return <path d="M55 67q5 1 10-2" {...line} />;
    default:
      return <path d="M53 64q3.5 4 7 0q3.5 4 7 0" {...line} />;
  }
}

/** Floating extras around the puppy: sparkles, hearts, tears, zzz, ? and !. */
function Extras({ mood, animated }: { mood: PupMood; animated: boolean }) {
  switch (mood) {
    case "cheer":
    case "cool":
      return (
        <g fill="var(--sun)">
          <path d={sparkle(14, 30, 6)} className={cn(animated && "pup-sparkle")} />
          <path d={sparkle(106, 38, 5)} className={cn(animated && "pup-sparkle")} style={delay(0.5)} />
          <path d={sparkle(98, 10, 4)} className={cn(animated && "pup-sparkle")} style={delay(0.9)} />
        </g>
      );
    case "love":
      return (
        <g fill="var(--pink)">
          <path d={heart(100, 30, 5)} className={cn(animated && "pup-heart")} />
          <path d={heart(16, 34, 4)} className={cn(animated && "pup-heart")} style={delay(0.7)} />
          <path d={heart(92, 12, 3.5)} className={cn(animated && "pup-heart")} style={delay(1.2)} />
        </g>
      );
    case "sad":
      return (
        <path
          d="M43 55q-3.5 5.5 0 8q3.5-2.5 0-8z"
          fill="var(--sky)"
          className={cn(animated && "pup-tear")}
        />
      );
    case "sleepy":
      return (
        <g fill={INK} fontFamily={FONT} fontWeight={900}>
          <text x={92} y={24} fontSize={16} opacity={0.55} className={cn(animated && "pup-z")}>
            z
          </text>
          <text x={104} y={12} fontSize={11} opacity={0.55} className={cn(animated && "pup-z")} style={delay(1.2)}>
            z
          </text>
        </g>
      );
    case "think":
      return (
        <text x={94} y={24} fontSize={20} fontWeight={900} fill="var(--brand)" fontFamily={FONT} className={cn(animated && "pup-float")}>
          ?
        </text>
      );
    case "surprised":
      return (
        <text x={96} y={24} fontSize={22} fontWeight={900} fill="var(--margin-red)" fontFamily={FONT} className={cn(animated && "pup-float")}>
          !
        </text>
      );
    default:
      return null;
  }
}

/** Moods that hop (animate-hop), so callers don't add the idle bob on top. */
export const BOUNCY: PupMood[] = ["cheer", "love", "surprised"];
const WAGGY: PupMood[] = ["cheer", "love", "wink", "cool", "wave"];

/**
 * The puppy mascot ("Bin" by default): a pure SVG, decorative only (the speech
 * bubble carries the meaning). Colors are the --pup-* tokens in globals.css;
 * every animation class is switched off under prefers-reduced-motion.
 */
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
    mood === "cheer" || mood === "surprised" || mood === "love"
      ? -14
      : mood === "sad" || mood === "sleepy"
        ? 12
        : 0;
  const twitch = animated && mood !== "sleepy" && mood !== "sad";
  const tail = !animated || mood === "sleepy" || mood === "sad" ? undefined : WAGGY.includes(mood) ? "pup-tail pup-tail-fast" : "pup-tail";
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0 overflow-visible", animated && BOUNCY.includes(mood) && "animate-hop", className)}
    >
      {/* Tail */}
      <path d="M84 94q18-2 16-22" fill="none" stroke="var(--pup-ear)" strokeWidth={8} strokeLinecap="round" className={tail} />
      {/* Body and paws */}
      <g className={cn(animated && "pup-breathe")}>
        <ellipse cx={60} cy={96} rx={29} ry={20} fill="var(--pup-fur)" />
      </g>
      <ellipse cx={47} cy={113} rx={9} ry={5.5} fill="var(--pup-fur)" stroke="var(--pup-muzzle)" strokeWidth={1.5} />
      {mood === "wave" ? (
        <ellipse
          cx={98}
          cy={70}
          rx={7}
          ry={9}
          fill="var(--pup-fur)"
          stroke="var(--pup-muzzle)"
          strokeWidth={1.5}
          className={cn(animated && "pup-paw")}
        />
      ) : (
        <ellipse cx={73} cy={113} rx={9} ry={5.5} fill="var(--pup-fur)" stroke="var(--pup-muzzle)" strokeWidth={1.5} />
      )}
      {/* Scarf */}
      <path d="M35 76q25 13 50 0l-1 9q-24 11-48 0z" fill="var(--brand)" />
      <path d="M70 82l6 14l6-3l-4-12z" fill="var(--brand)" />

      <g transform={mood === "think" ? "rotate(-9 60 56)" : mood === "wink" ? "rotate(5 60 56)" : undefined}>
        {/* Ears: the outer group twitches (CSS), the path keeps the mood angle (SVG attribute). */}
        <g className={cn(twitch && "pup-ear-l")}>
          <path d="M33 30q-17 3-15 28q2 12 11 9q6-15 9-33z" fill="var(--pup-ear)" transform={`rotate(${ear} 34 32)`} />
        </g>
        <g className={cn(twitch && "pup-ear-r")}>
          <path d="M87 30q17 3 15 28q-2 12-11 9q-6-15-9-33z" fill="var(--pup-ear)" transform={`rotate(${-ear} 86 32)`} />
        </g>
        {/* Head */}
        <ellipse cx={60} cy={52} rx={32} ry={28} fill="var(--pup-fur)" />
        <ellipse cx={73} cy={48} rx={10} ry={9.5} fill="var(--pup-ear)" opacity={0.45} />
        <ellipse cx={60} cy={64} rx={14} ry={10} fill="var(--pup-muzzle)" />
        <ellipse cx={39} cy={62} rx={5.5} ry={3.2} fill="var(--pup-blush)" opacity={mood === "love" ? 0.95 : 0.6} />
        <ellipse cx={81} cy={62} rx={5.5} ry={3.2} fill="var(--pup-blush)" opacity={mood === "love" ? 0.95 : 0.6} />
        <Eyes mood={mood} animated={animated} />
        <ellipse cx={60} cy={59} rx={5.5} ry={3.8} fill={INK} />
        <Mouth mood={mood} />
      </g>

      <Extras mood={mood} animated={animated} />
    </svg>
  );
}

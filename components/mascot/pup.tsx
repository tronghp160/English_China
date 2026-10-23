import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";

const INK = "var(--pup-ink)";

function Eyes({ mood }: { mood: PupMood }) {
  if (mood === "cheer")
    return (
      <g fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round">
        <path d="M42 52q6-8 12 0" />
        <path d="M66 52q6-8 12 0" />
      </g>
    );
  if (mood === "sleepy")
    return (
      <g fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round">
        <path d="M42 50q6 5 12 0" />
        <path d="M66 50q6 5 12 0" />
      </g>
    );
  return (
    <g>
      <circle cx={48} cy={50} r={mood === "sad" ? 4.5 : 5.2} fill={INK} />
      <circle cx={72} cy={50} r={mood === "sad" ? 4.5 : 5.2} fill={INK} />
      <circle cx={49.8} cy={48} r={1.7} fill="white" />
      <circle cx={73.8} cy={48} r={1.7} fill="white" />
      {mood === "sad" && (
        <g fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round">
          <path d="M41 43l10-4" />
          <path d="M79 43l-10-4" />
        </g>
      )}
    </g>
  );
}

function Mouth({ mood }: { mood: PupMood }) {
  const line = { fill: "none", stroke: INK, strokeWidth: 2.4, strokeLinecap: "round" as const };
  switch (mood) {
    case "cheer":
    case "wave":
      return (
        <g>
          <path d="M52 64q8 13 16 0z" fill={INK} />
          <path d="M55.5 69q4.5 4 9 0q-4.5-3-9 0z" fill="var(--pup-blush)" />
        </g>
      );
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

/**
 * The puppy mascot ("Bin" by default): a pure SVG, decorative only (the speech
 * bubble carries the meaning). Colors are the --pup-* tokens in globals.css.
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
  // Ears hang lower when sad or sleepy and perk up when cheering.
  const ear = mood === "cheer" ? -14 : mood === "sad" || mood === "sleepy" ? 12 : 0;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0 overflow-visible", animated && mood === "cheer" && "animate-hop", className)}
    >
      {/* Tail */}
      <path
        d="M84 94q18-2 16-22"
        fill="none"
        stroke="var(--pup-ear)"
        strokeWidth={8}
        strokeLinecap="round"
        className={cn(animated && mood !== "sleepy" && mood !== "sad" && "pup-tail")}
      />
      {/* Body and paws */}
      <ellipse cx={60} cy={96} rx={29} ry={20} fill="var(--pup-fur)" />
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

      <g transform={mood === "think" ? "rotate(-9 60 56)" : undefined}>
        {/* Ears */}
        <path
          d="M33 30q-17 3-15 28q2 12 11 9q6-15 9-33z"
          fill="var(--pup-ear)"
          transform={`rotate(${ear} 34 32)`}
        />
        <path
          d="M87 30q17 3 15 28q-2 12-11 9q-6-15-9-33z"
          fill="var(--pup-ear)"
          transform={`rotate(${-ear} 86 32)`}
        />
        {/* Head */}
        <ellipse cx={60} cy={52} rx={32} ry={28} fill="var(--pup-fur)" />
        <ellipse cx={73} cy={48} rx={10} ry={9.5} fill="var(--pup-ear)" opacity={0.45} />
        <ellipse cx={60} cy={64} rx={14} ry={10} fill="var(--pup-muzzle)" />
        <ellipse cx={39} cy={62} rx={5.5} ry={3.2} fill="var(--pup-blush)" opacity={0.6} />
        <ellipse cx={81} cy={62} rx={5.5} ry={3.2} fill="var(--pup-blush)" opacity={0.6} />
        <Eyes mood={mood} />
        <ellipse cx={60} cy={59} rx={5.5} ry={3.8} fill={INK} />
        <Mouth mood={mood} />
      </g>

      {mood === "sleepy" && (
        <g fill="var(--pup-ink)" opacity={0.55} fontFamily="var(--font-nunito), sans-serif" fontWeight={900}>
          <text x={92} y={22} fontSize={16}>
            z
          </text>
          <text x={104} y={10} fontSize={11}>
            z
          </text>
        </g>
      )}
      {mood === "think" && (
        <text x={94} y={24} fontSize={20} fontWeight={900} fill="var(--brand)" fontFamily="var(--font-nunito), sans-serif">
          ?
        </text>
      )}
    </svg>
  );
}

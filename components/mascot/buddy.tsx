import type { JSX } from "react";
import type { BuddySpecies } from "@/lib/bin/buddies";
import { cn } from "@/lib/utils";

const INK = "var(--pup-ink)";
const FEATURE = "var(--pup-feature)";
const BLUSH = "var(--pup-blush)";
const FUR = "var(--pup-fur)";

export function Buddy({
  species,
  mood = "happy",
  size = 48,
  className,
}: {
  species: BuddySpecies;
  mood?: "happy" | "sleepy" | "cheer";
  size?: number;
  className?: string;
}): JSX.Element {
  const sw = Math.max(2.2, 140 / size);

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("buddy shrink-0 overflow-visible", className)}
      data-species={species}
      data-mood={mood}
      fill="none"
      stroke={INK}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Ground shadow */}
      <ellipse cx={60} cy={114} rx={22} ry={3.2} fill={INK} opacity={0.18} stroke="none" />

      {species === "miu" && <MiuBody mood={mood} sw={sw} />}
      {species === "panda" && <PandaBody mood={mood} sw={sw} />}
      {species === "duck" && <DuckBody mood={mood} sw={sw} />}
      {species === "bunny" && <BunnyBody mood={mood} sw={sw} />}

      {/* Sleepy z marks */}
      {mood === "sleepy" && (
        <g className="pup-extra" stroke={INK} strokeWidth={1.8}>
          <path d="M92 18h7l-7 7h7" />
          <path d="M103 10h5l-5 5h5" strokeWidth={1.4} />
        </g>
      )}

      {/* Cheer celebration sparkles */}
      {mood === "cheer" && (
        <g className="pup-extra" stroke="var(--c-sun)" strokeWidth={1.8}>
          <path d="M96 26l3-3 M99 33h4 M96 40l3 3" />
          <path d="M22 26l-3-3 M19 33h-4 M22 40l-3 3" />
        </g>
      )}
    </svg>
  );
}

function MiuBody({ mood, sw }: { mood: "happy" | "sleepy" | "cheer"; sw: number }) {
  return (
    <g className="buddy-root">
      {/* Tail */}
      <path d="M80 100 C98 94 102 76 92 68" stroke="var(--c-orange)" strokeWidth={sw + 1.5} />

      {/* Body */}
      <path d="M42 84 C34 96 35 111 48 113 h24 c13-2 14-17 6-29" fill="var(--c-orange-soft)" />
      <path d="M48 113c0-5 6-5 6 0 M66 113c0-5 6-5 6 0" />

      {/* Cheer raised paws or normal chest */}
      {mood === "cheer" ? (
        <g stroke={INK} strokeWidth={sw + 1}>
          <path d="M38 82 Q26 70 34 58" />
          <path d="M82 82 Q94 70 86 58" />
        </g>
      ) : null}

      {/* Head group */}
      <g className="buddy-head">
        {/* Ears */}
        <path d="M35 34 L25 12 L50 24 Z" fill="var(--c-orange-soft)" />
        <path d="M34 29 L28 17 L44 23 Z" fill="var(--c-pink-soft)" stroke="none" />
        <path d="M85 34 L95 12 L70 24 Z" fill="var(--c-orange-soft)" />
        <path d="M86 29 L92 17 L76 23 Z" fill="var(--c-pink-soft)" stroke="none" />

        {/* Head */}
        <circle cx={60} cy={55} r={32} fill="var(--c-orange-soft)" />

        {/* Forehead stripes */}
        <path d="M60 27v6 M54 30v4 M66 30v4" stroke="var(--c-orange)" strokeWidth={sw} />

        {/* Blush cheeks */}
        <circle cx={38} cy={63} r={3.6} fill={BLUSH} stroke="none" />
        <circle cx={82} cy={63} r={3.6} fill={BLUSH} stroke="none" />

        {/* Whiskers */}
        <g stroke={FEATURE} strokeWidth={1.5}>
          <path d="M33 58l-12-2 M32 63h-13 M33 68l-12 2" />
          <path d="M87 58l12-2 M88 63h13 M87 68l12 2" />
        </g>

        {/* Eyes */}
        <BuddyEyes mood={mood} leftCx={46} rightCx={74} cy={52} />

        {/* Nose & mouth */}
        <polygon points="57,59 63,59 60,63" fill={FEATURE} stroke="none" />
        {mood === "cheer" ? (
          <path d="M54 64q6 10 12 0z" fill={BLUSH} stroke={FEATURE} />
        ) : (
          <path d="M54 63.5q3 3 6 0q3 3 6 0" stroke={FEATURE} />
        )}
      </g>
    </g>
  );
}

function PandaBody({ mood, sw }: { mood: "happy" | "sleepy" | "cheer"; sw: number }) {
  return (
    <g className="buddy-root">
      {/* Body */}
      <path d="M42 84 C34 96 35 111 48 113 h24 c13-2 14-17 6-29" fill={FUR} />
      <path d="M37 88 C40 82 50 84 60 84 C70 84 80 82 83 88 C78 100 70 102 60 102 C50 102 42 100 37 88 Z" fill={INK} stroke="none" />
      <path d="M48 113c0-5 6-5 6 0 M66 113c0-5 6-5 6 0" />

      {/* Bamboo stalk */}
      <g>
        <path d="M78 98 L88 68" stroke="var(--c-mint)" strokeWidth={3.4} />
        <path d="M85 78 L93 74 M86 82 L94 86" stroke="var(--c-mint)" strokeWidth={2.2} />
      </g>

      {/* Cheer raised paws */}
      {mood === "cheer" ? (
        <g stroke={INK} strokeWidth={sw + 1}>
          <path d="M38 82 Q26 70 34 58" />
          <path d="M82 82 Q94 70 86 58" />
        </g>
      ) : null}

      {/* Head group */}
      <g className="buddy-head">
        {/* Black round ears */}
        <circle cx={34} cy={27} r={10} fill={INK} stroke={INK} />
        <circle cx={86} cy={27} r={10} fill={INK} stroke={INK} />

        {/* Head */}
        <circle cx={60} cy={55} r={32} fill={FUR} />

        {/* Black eye patches */}
        <ellipse cx={46} cy={51} rx={8.5} ry={11} fill={INK} stroke="none" transform="rotate(-15 46 51)" />
        <ellipse cx={74} cy={51} rx={8.5} ry={11} fill={INK} stroke="none" transform="rotate(15 74 51)" />

        {/* Blush cheeks */}
        <circle cx={35} cy={64} r={3.5} fill={BLUSH} stroke="none" />
        <circle cx={85} cy={64} r={3.5} fill={BLUSH} stroke="none" />

        {/* Eyes inside patches */}
        {mood === "cheer" ? (
          <g stroke={FUR} strokeWidth={2.4}>
            <path d="M41 53q5 -6 10 0" />
            <path d="M69 53q5 -6 10 0" />
          </g>
        ) : mood === "sleepy" ? (
          <g stroke={FUR} strokeWidth={2.4}>
            <path d="M41 51q5 4 10 0" />
            <path d="M69 51q5 4 10 0" />
          </g>
        ) : (
          <g className="buddy-blink">
            <circle cx={47} cy={51} r={3.6} fill={FUR} stroke="none" />
            <circle cx={47} cy={51} r={1.6} fill={FEATURE} stroke="none" />
            <circle cx={73} cy={51} r={3.6} fill={FUR} stroke="none" />
            <circle cx={73} cy={51} r={1.6} fill={FEATURE} stroke="none" />
          </g>
        )}

        {/* Nose & mouth */}
        <ellipse cx={60} cy={62} rx={4.5} ry={3.2} fill={FEATURE} stroke="none" />
        {mood === "cheer" ? (
          <path d="M55 65q5 8 10 0z" fill={BLUSH} stroke={FEATURE} />
        ) : (
          <path d="M55 65.5q5 3 10 0" stroke={FEATURE} />
        )}
      </g>
    </g>
  );
}

function DuckBody({ mood, sw }: { mood: "happy" | "sleepy" | "cheer"; sw: number }) {
  return (
    <g className="buddy-root">
      {/* Body */}
      <path d="M40 82 C30 94 32 110 47 112 h26 c15-2 17-18 7-30" fill="var(--c-sun-soft)" />

      {/* Side wings */}
      {mood === "cheer" ? (
        <g stroke={INK} fill="var(--c-sun-soft)">
          <path d="M38 82 Q24 70 32 58" />
          <path d="M82 82 Q96 70 88 58" />
        </g>
      ) : (
        <g stroke={INK} fill="var(--c-sun-soft)">
          <path d="M38 86 C28 92 30 102 38 100" />
          <path d="M82 86 C92 92 90 102 82 100" />
        </g>
      )}

      {/* Webbed feet */}
      <path d="M44 112h12 M64 112h12" stroke="var(--c-orange)" strokeWidth={sw + 1} />

      {/* Head group */}
      <g className="buddy-head">
        {/* Crest */}
        <path d="M60 24 C56 14 62 10 60 6 C66 12 65 18 60 24" fill="var(--c-sun-soft)" />

        {/* Head */}
        <circle cx={60} cy={53} r={30} fill="var(--c-sun-soft)" />

        {/* Blush cheeks */}
        <circle cx={36} cy={61} r={3.5} fill={BLUSH} stroke="none" />
        <circle cx={84} cy={61} r={3.5} fill={BLUSH} stroke="none" />

        {/* Eyes */}
        <BuddyEyes mood={mood} leftCx={45} rightCx={75} cy={50} />

        {/* Orange duck bill */}
        <path
          d="M46 62 C46 58 74 58 74 62 C76 69 68 73 60 73 C52 73 44 69 46 62 Z"
          fill="var(--c-orange)"
          stroke={INK}
          strokeWidth={sw}
        />
        <ellipse cx={56} cy={63} rx={1} ry={0.8} fill={FEATURE} stroke="none" />
        <ellipse cx={64} cy={63} rx={1} ry={0.8} fill={FEATURE} stroke="none" />
      </g>
    </g>
  );
}

function BunnyBody({ mood, sw }: { mood: "happy" | "sleepy" | "cheer"; sw: number }) {
  return (
    <g className="buddy-root">
      {/* Fluffy tail */}
      <circle cx={30} cy={102} r={7} fill={FUR} stroke={INK} />

      {/* Body */}
      <path d="M42 85 C34 97 35 111 48 113 h24 c13-2 14-16 6-28" fill={FUR} />
      <path d="M48 113c0-5 6-5 6 0 M66 113c0-5 6-5 6 0" />

      {/* Cheer paws */}
      {mood === "cheer" ? (
        <g stroke={INK} strokeWidth={sw + 1}>
          <path d="M38 82 Q26 70 34 58" />
          <path d="M82 82 Q94 70 86 58" />
        </g>
      ) : null}

      {/* Head group */}
      <g className="buddy-head">
        {/* Long bunny ears */}
        <path d="M44 32 C36 10 46 2 52 14 L55 30" fill={FUR} stroke={INK} />
        <path d="M45 28 C40 14 47 8 50 16 L52 27" fill="var(--c-pink-soft)" stroke="none" />
        <path d="M65 30 L68 14 C74 2 84 10 76 32" fill={FUR} stroke={INK} />
        <path d="M68 27 L70 16 C73 8 80 14 75 28" fill="var(--c-pink-soft)" stroke="none" />

        {/* Head */}
        <circle cx={60} cy={57} r={31} fill={FUR} />

        {/* Blush cheeks */}
        <circle cx={37} cy={65} r={3.8} fill={BLUSH} stroke="none" />
        <circle cx={83} cy={65} r={3.8} fill={BLUSH} stroke="none" />

        {/* Eyes */}
        <BuddyEyes mood={mood} leftCx={46} rightCx={74} cy={54} />

        {/* Pink nose & mouth */}
        <polygon points="58,61 62,61 60,63.5" fill="var(--c-pink)" stroke="none" />
        {mood === "cheer" ? (
          <path d="M56 64q4 8 8 0z" fill={BLUSH} stroke={FEATURE} />
        ) : (
          <path d="M56 64.5q4 3 4 0q4 3 4 0" stroke={FEATURE} />
        )}
      </g>
    </g>
  );
}

function BuddyEyes({
  mood,
  leftCx,
  rightCx,
  cy,
}: {
  mood: "happy" | "sleepy" | "cheer";
  leftCx: number;
  rightCx: number;
  cy: number;
}) {
  if (mood === "cheer") {
    return (
      <g stroke={FEATURE} strokeWidth={2.4}>
        <path d={`M${leftCx - 6} ${cy + 2}q6 -8 12 0`} />
        <path d={`M${rightCx - 6} ${cy + 2}q6 -8 12 0`} />
      </g>
    );
  }

  if (mood === "sleepy") {
    return (
      <g stroke={FEATURE} strokeWidth={2.4}>
        <path d={`M${leftCx - 6} ${cy}q6 5 12 0`} />
        <path d={`M${rightCx - 6} ${cy}q6 5 12 0`} />
      </g>
    );
  }

  return (
    <g className="buddy-blink">
      <circle cx={leftCx} cy={cy} r={4.2} fill={FEATURE} stroke="none" />
      <circle cx={rightCx} cy={cy} r={4.2} fill={FEATURE} stroke="none" />
    </g>
  );
}

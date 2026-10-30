import type { JSX } from "react";
import { buddyBySpecies, type BuddySpecies } from "@/lib/bin/buddies";
import { cn } from "@/lib/utils";

const INK = "var(--pup-ink)";

export function Egg({
  species,
  progress = 0,
  ready = false,
  size = 64,
  onTap,
  className,
}: {
  species: BuddySpecies;
  progress?: number;
  ready?: boolean;
  size?: number;
  onTap?: () => void;
  className?: string;
}): JSX.Element {
  const buddy = buddyBySpecies(species);
  const name = buddy?.defaultName ?? "bạn nhỏ";

  const content = (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={(size * 120) / 100}
      aria-hidden="true"
      className={cn("egg shrink-0 overflow-visible", ready && "egg-wobble")}
      fill="none"
      stroke={INK}
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Ground shadow */}
      <ellipse cx={50} cy={114} rx={22} ry={3.5} fill={INK} opacity={0.18} stroke="none" />

      {/* Egg Base Shape */}
      <path
        d="M50 14 C28 14 18 44 18 74 C18 98 32 110 50 110 C68 110 82 98 82 74 C82 44 72 14 50 14 Z"
        fill={
          species === "miu"
            ? "var(--c-orange-soft)"
            : species === "panda"
              ? "var(--c-mint-soft)"
              : species === "duck"
                ? "var(--c-sun-soft)"
                : "var(--c-pink-soft)"
        }
      />

      {/* Species-specific egg decorative patterns */}
      {species === "miu" && (
        <g stroke="none">
          <path d="M42 32 L37 20 L48 27 Z" fill="var(--c-orange)" />
          <path d="M58 32 L63 20 L52 27 Z" fill="var(--c-orange)" />
          <circle cx={50} cy={44} r={3} fill="var(--c-orange)" />
          <circle cx={38} cy={70} r={4} fill="var(--c-orange)" opacity={0.6} />
          <circle cx={62} cy={72} r={4.5} fill="var(--c-orange)" opacity={0.6} />
        </g>
      )}

      {species === "panda" && (
        <g stroke="none" fill="var(--pup-ink)">
          <circle cx={36} cy={30} r={5} />
          <circle cx={64} cy={30} r={5} />
          <ellipse cx={42} cy={46} rx={4.5} ry={6.5} transform="rotate(-15 42 46)" />
          <ellipse cx={58} cy={46} rx={4.5} ry={6.5} transform="rotate(15 58 46)" />
          <circle cx={50} cy={60} r={2.5} />
        </g>
      )}

      {species === "duck" && (
        <g stroke="none" fill="var(--c-orange)">
          <path d="M50 28 C47 36 43 40 50 46 C57 40 53 36 50 28 Z" />
          <ellipse cx={36} cy={54} rx={3.5} ry={4.5} opacity={0.7} />
          <ellipse cx={64} cy={54} rx={3.5} ry={4.5} opacity={0.7} />
          <path d="M44 76q6 3 12 0" stroke="var(--c-orange)" strokeWidth={2.4} fill="none" />
        </g>
      )}

      {species === "bunny" && (
        <g stroke="none">
          {/* Flower pattern */}
          <circle cx={50} cy={38} r={3} fill="var(--c-pink)" />
          <circle cx={45} cy={38} r={2} fill="var(--c-pink)" />
          <circle cx={55} cy={38} r={2} fill="var(--c-pink)" />
          <circle cx={50} cy={33} r={2} fill="var(--c-pink)" />
          <circle cx={50} cy={43} r={2} fill="var(--c-pink)" />
          <circle cx={50} cy={38} r={1.5} fill="var(--pup-fur)" />
          {/* Polka dots */}
          <circle cx={34} cy={58} r={3} fill="var(--c-pink)" opacity={0.7} />
          <circle cx={66} cy={58} r={3} fill="var(--c-pink)" opacity={0.7} />
          <circle cx={50} cy={76} r={2.5} fill="var(--c-pink)" opacity={0.7} />
        </g>
      )}

      {/* Cracks (progress >= 0.5) */}
      {(progress >= 0.5 || ready) && (
        <path
          d="M46 36 L52 44 L47 50 L55 58"
          stroke={INK}
          strokeWidth={2.6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Deep zig-zag crack (progress >= 0.9 or ready) */}
      {(progress >= 0.9 || ready) && (
        <path
          d="M28 64 L38 68 L34 76 L46 78 L54 72 L62 80 L72 74"
          stroke={INK}
          strokeWidth={2.6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );

  if (onTap) {
    return (
      <button
        type="button"
        onClick={onTap}
        aria-label={`Trứng của ${name}, chạm để ấp nở`}
        className={cn(
          "group inline-flex items-center justify-center rounded-2xl border-0 bg-transparent p-0 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={cn("inline-flex items-center justify-center", className)}>{content}</div>;
}

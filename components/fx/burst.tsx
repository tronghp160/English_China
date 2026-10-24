import { cn } from "@/lib/utils";

const PALETTES = {
  success: ["bg-c-mint", "bg-c-sun", "bg-c-blue", "bg-c-pink", "bg-c-mint"],
  sun: ["bg-c-sun", "bg-c-orange", "bg-c-sun", "bg-c-coral", "bg-c-sun"],
  rainbow: ["bg-c-blue", "bg-c-coral", "bg-c-mint", "bg-c-sun", "bg-c-grape", "bg-c-pink"],
  cream: ["bg-c-sun-soft", "bg-c-orange-soft", "bg-c-sun-soft", "bg-surface-3", "bg-c-sun-soft"],
} as const;

export type BurstPalette = keyof typeof PALETTES;

const DOTS = 10;

/**
 * A puff of small dots from the middle of the parent box (put it in a `relative` element). Changing
 * `trigger` replays it; 0 shows nothing, so the first render is quiet. Reduced motion hides it (globals.css).
 */
export function Burst({
  trigger,
  palette = "success",
  radius = 30,
  className,
}: {
  trigger: number;
  palette?: BurstPalette;
  radius?: number;
  className?: string;
}) {
  if (!trigger) return null;
  const colors = PALETTES[palette];
  return (
    <span key={trigger} aria-hidden className={cn("pointer-events-none absolute inset-0 grid place-items-center", className)}>
      {Array.from({ length: DOTS }, (_, i) => {
        const angle = (i / DOTS) * Math.PI * 2 + (i % 2 ? 0.2 : 0);
        const dist = radius * (i % 3 === 0 ? 1.25 : 0.85);
        return (
          <span
            key={i}
            className={cn("burst-dot absolute size-1.5 rounded-full", colors[i % colors.length])}
            style={{ "--bx": `${Math.round(Math.cos(angle) * dist)}px`, "--by": `${Math.round(Math.sin(angle) * dist)}px` } as React.CSSProperties}
          />
        );
      })}
    </span>
  );
}

"use client";

import { useBinHome } from "@/components/mascot/bin-home-provider";
import { cn } from "@/lib/utils";

/**
 * The level under the greeting (REDESIGN_V3 §6.1): "Cấp 4", a thin XP bar and "120/150 XP". A tap opens Bin's
 * corner, where the level is explained; without Bin it is a plain line.
 */
export function LevelBar({
  level,
  xpInLevel,
  xpForNext,
  linked,
  name,
  className,
}: {
  level: number;
  xpInLevel: number;
  xpForNext: number;
  /** Open Bin's corner on tap (false when the mascot is off). */
  linked: boolean;
  /** Bin's name, for the button label */
  name: string;
  className?: string;
}) {
  const home = useBinHome();
  const body = (
    <>
      <span className="rounded-full bg-xp-soft px-2.5 py-0.5 text-sm font-extrabold text-xp-fg">Cấp {level}</span>
      <span
        className="h-2 w-32 overflow-hidden rounded-full bg-surface-3 sm:w-48"
        role="progressbar"
        aria-label="Kinh nghiệm trong cấp này"
        aria-valuemin={0}
        aria-valuemax={xpForNext}
        aria-valuenow={xpInLevel}
      >
        <span className="block h-full rounded-full bg-xp" style={{ width: `${Math.round((xpInLevel / xpForNext) * 100)}%` }} />
      </span>
      <span className="text-sm text-fg-muted tabular-nums">
        {xpInLevel}/{xpForNext} XP
      </span>
    </>
  );
  if (!linked || !home) return <div className={cn("mt-2 flex items-center gap-2.5", className)}>{body}</div>;
  return (
    <button
      type="button"
      onClick={home.open}
      aria-label={`Cấp ${level}, ${xpInLevel} trên ${xpForNext} XP. Mở góc của ${name}`}
      className={cn("mt-2 -ml-1 flex min-h-11 items-center gap-2.5 rounded-full px-1 text-left transition-colors hover:bg-surface-2/60", className)}
    >
      {body}
    </button>
  );
}

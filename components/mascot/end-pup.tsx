"use client";

import { useOptionalMe } from "@/components/app-shell/me-provider";
import { FigureTile, type FigureName } from "@/components/ui/empty-state";
import type { BuddySpecies } from "@/lib/bin/buddies";
import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { Buddy } from "./buddy";
import { Pup } from "./pup";

/**
 * A picture for an end screen or an empty page: the puppy, or, when the mascot is off,
 * a still icon tile (`figure`, the "check" one by default).
 */
export function EndPup({
  mood,
  size = 96,
  figure = "check",
  className,
  buddy: buddyProp,
}: {
  mood: PupMood;
  size?: number;
  figure?: FigureName;
  className?: string;
  buddy?: BuddySpecies | null;
  /** @deprecated the mascot-off fallback is an icon tile now; kept so old call sites compile */
  emoji?: string;
}) {
  const me = useOptionalMe();
  const buddy = buddyProp ?? ((me?.prefs.bin_buddy as BuddySpecies) || null);
  if (me?.prefs.mascot === false) return <FigureTile name={figure} size={size > 72 ? 72 : 48} className={className} />;
  return (
    <div className={cn("relative inline-flex items-end justify-center self-center", className)}>
      <Pup mood={mood} size={size} />
      {buddy && (
        <div className="absolute -left-6 bottom-0 z-10">
          <Buddy species={buddy} mood="cheer" size={Math.round(size * 0.48)} />
        </div>
      )}
    </div>
  );
}

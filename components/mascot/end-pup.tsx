"use client";

import { useOptionalMe } from "@/components/app-shell/me-provider";
import { FigureTile, type FigureName } from "@/components/ui/empty-state";
import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
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
}: {
  mood: PupMood;
  size?: number;
  figure?: FigureName;
  className?: string;
  /** @deprecated the mascot-off fallback is an icon tile now; kept so old call sites compile */
  emoji?: string;
}) {
  const me = useOptionalMe();
  if (me?.prefs.mascot === false) return <FigureTile name={figure} size={size > 72 ? 72 : 48} className={className} />;
  return <Pup mood={mood} size={size} className={cn("self-center", className)} />;
}

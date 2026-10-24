"use client";

import { useOptionalMe } from "@/components/app-shell/me-provider";
import { InkFigure, type InkFigureName } from "@/components/ui/empty-state";
import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { Pup } from "./pup";

/**
 * A picture for an end screen or an empty page: the puppy, or, when the mascot is off,
 * a still ink drawing (`figure`, the "check" page by default).
 */
export function EndPup({
  mood,
  size = 96,
  figure = "check",
  className,
}: {
  mood: PupMood;
  size?: number;
  figure?: InkFigureName;
  className?: string;
  /** @deprecated the mascot-off fallback is an ink drawing now; kept so old call sites compile */
  emoji?: string;
}) {
  const me = useOptionalMe();
  if (me?.prefs.mascot === false) return <InkFigure name={figure} size={size} className={cn("self-center", className)} />;
  return <Pup mood={mood} size={size} className={cn("self-center", className)} />;
}

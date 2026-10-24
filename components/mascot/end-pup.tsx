"use client";

import { useOptionalMe } from "@/components/app-shell/me-provider";
import { InkFigure } from "@/components/ui/empty-state";
import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { Pup } from "./pup";

/** Picture at the top of an end screen: the puppy, or a still ink drawing when the mascot is off. */
export function EndPup({
  mood,
  size = 96,
  className,
}: {
  mood: PupMood;
  size?: number;
  className?: string;
  /** @deprecated the mascot-off fallback is an ink drawing now; kept so old call sites compile */
  emoji?: string;
}) {
  const me = useOptionalMe();
  if (me?.prefs.mascot === false) return <InkFigure name="check" size={size} className={cn("self-center", className)} />;
  return <Pup mood={mood} size={size} className={cn("self-center", className)} />;
}

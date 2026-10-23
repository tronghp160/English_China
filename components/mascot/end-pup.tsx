"use client";

import { useOptionalMe } from "@/components/app-shell/me-provider";
import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { Pup } from "./pup";

/** Big picture at the top of an end screen: the puppy, or the emoji when the mascot is off. */
export function EndPup({ mood, emoji, className }: { mood: PupMood; emoji: string; className?: string }) {
  const me = useOptionalMe();
  if (me?.prefs.mascot === false)
    return (
      <span aria-hidden className={cn("animate-float self-center text-7xl", className)}>
        {emoji}
      </span>
    );
  return <Pup mood={mood} size={112} className={cn("self-center", className)} />;
}

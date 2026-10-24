"use client";

import { useState } from "react";
import { say, type PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { PettablePup } from "./pettable-pup";

/**
 * The puppy and what it says, written in the margin: its name in small type, a short ink stroke
 * leading from its mouth, then the line. No bubble. Tapping the puppy swaps the line in place.
 */
export function MascotSay({
  mood,
  name,
  text,
  size = 72,
  className,
}: {
  mood: PupMood;
  name: string;
  text: string;
  size?: number;
  className?: string;
}) {
  const [pets, setPets] = useState(0);
  return (
    <div className={cn("flex items-end gap-1", className)}>
      <PettablePup mood={mood} name={name} size={size} onPet={setPets} />
      <div className="min-w-0 pb-2">
        <span className="block text-xs text-ink-soft">{name}</span>
        <div className="flex items-start gap-1.5">
          <svg viewBox="0 0 16 14" width={16} height={14} aria-hidden className="mt-1.5 shrink-0 text-ink-violet/40" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M1 12c5 0 7-3 8-6s3-4 6-4" />
          </svg>
          <p
            key={pets}
            aria-live="polite"
            className="animate-in fade-in-0 text-[0.9375rem] leading-snug font-medium text-ink duration-150"
          >
            {pets ? say("pet", { seed: pets - 1, name }) : text}
          </p>
        </div>
      </div>
    </div>
  );
}

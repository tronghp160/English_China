"use client";

import { useState } from "react";
import { say, type PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { PettablePup } from "./pettable-pup";

/** The puppy with a speech bubble on its right. Tapping the puppy makes it answer with a pet line. */
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
    <div className={cn("flex items-end gap-2", className)}>
      <PettablePup mood={mood} name={name} size={size} onPet={setPets} />
      <div
        key={pets}
        aria-live="polite"
        className="relative mb-3 min-w-0 animate-pop-in rounded-card border border-rule bg-surface px-4 py-2.5 text-left shadow-card"
      >
        <span
          aria-hidden
          className="absolute bottom-4 -left-1.5 size-3 rotate-45 border-b border-l border-rule bg-surface"
        />
        <span className="block text-xs font-bold text-ink-soft">{name}</span>
        <span className="block font-semibold text-ink">
          {pets ? say("pet", { seed: pets - 1, name }) : text}
        </span>
      </div>
    </div>
  );
}

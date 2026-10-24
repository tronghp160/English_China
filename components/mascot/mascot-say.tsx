"use client";

import { useState } from "react";
import { say, type PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { PettablePup } from "./pettable-pup";

/**
 * The puppy and what it says, in a chat bubble with a small tail pointing at it (REDESIGN_V2 §5.16).
 * Tapping the puppy swaps the line in place.
 */
export function MascotSay({
  mood,
  name,
  text,
  size = 72,
  className,
  bubbleClassName,
}: {
  mood: PupMood;
  name: string;
  text: string;
  size?: number;
  className?: string;
  bubbleClassName?: string;
}) {
  const [pets, setPets] = useState(0);
  return (
    <div className={cn("flex items-end gap-2", className)}>
      <PettablePup mood={mood} name={name} size={size} onPet={setPets} />
      <div
        className={cn(
          "min-w-0 rounded-lg rounded-bl-[4px] bg-surface px-3.5 py-2.5 shadow-sm dark:border dark:border-border",
          bubbleClassName,
        )}
      >
        <p
          key={pets}
          aria-live="polite"
          className="animate-in fade-in-0 text-[0.9375rem] leading-snug font-medium text-fg duration-150"
        >
          {pets ? say("pet", { seed: pets - 1, name }) : text}
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { say, type LineKey, type PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { useBinHome } from "./bin-home-provider";
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
  const [reaction, setReaction] = useState<{ count: number; line?: LineKey } | null>(null);
  const home = useBinHome();
  return (
    <div className={cn("flex items-end gap-2", className)}>
      <PettablePup mood={mood} name={name} size={size} onPet={(count, line) => setReaction({ count, line })} />
      <div
        className={cn(
          "min-w-0 rounded-lg rounded-bl-[4px] bg-surface px-3.5 py-2.5 shadow-sm dark:border dark:border-border",
          bubbleClassName,
        )}
      >
        <p
          key={reaction?.count ?? 0}
          aria-live="polite"
          className="animate-in fade-in-0 text-[0.9375rem] leading-snug font-medium text-fg duration-150"
        >
          {reaction ? say(reaction.line ?? "pet", { seed: Math.max(0, reaction.count - 1), name }) : text}
        </p>
        {reaction && home && (
          <button
            type="button"
            onClick={home.open}
            className="mt-1.5 min-h-9 rounded-full bg-primary-soft px-3 text-sm font-bold text-primary-fg hover:bg-primary-soft/70"
          >
            Chơi với {name}
          </button>
        )}
      </div>
    </div>
  );
}

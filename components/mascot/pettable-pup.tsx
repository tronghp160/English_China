"use client";

import { useEffect, useRef, useState } from "react";
import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { BOUNCY, Pup } from "./pup";

/** The puppy as a button: a tap shows hearts and a hop for a moment, then it goes back to `mood`. */
export function PettablePup({
  mood,
  name,
  size,
  className,
  onPet,
}: {
  mood: PupMood;
  name: string;
  size: number;
  className?: string;
  onPet?: (count: number) => void;
}) {
  const [pets, setPets] = useState(0);
  const [petting, setPetting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      aria-label={`Xoa đầu ${name}`}
      title={`Xoa đầu ${name}`}
      onClick={() => {
        const next = pets + 1;
        setPets(next);
        setPetting(true);
        onPet?.(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setPetting(false), 1800);
      }}
      className={cn(
        "shrink-0 cursor-pointer rounded-full transition-transform hover:scale-105 active:scale-95",
        className,
      )}
    >
      <Pup
        key={petting ? `pet-${pets}` : "idle"}
        mood={petting ? "love" : mood}
        size={size}
        className={petting || BOUNCY.includes(mood) ? undefined : "animate-bob"}
      />
    </button>
  );
}

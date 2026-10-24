"use client";

import { useEffect, useRef, useState } from "react";
import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { Pup } from "./pup";

/** Three outline hearts that float up once, as the answer to a pat. */
function Hearts() {
  return (
    <svg
      viewBox="0 0 60 40"
      aria-hidden
      className="pointer-events-none absolute -top-5 left-1/2 w-2/3 -translate-x-1/2 overflow-visible"
      fill="none"
      stroke="var(--pup-ink)"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {[
        { x: 12, delay: 0 },
        { x: 30, delay: 0.12 },
        { x: 48, delay: 0.24 },
      ].map((h) => (
        <path
          key={h.x}
          className="pup-rise"
          style={{ animationDelay: `${h.delay}s` }}
          d={`M${h.x} 30c-8-5-9-12-4-14c3-1 4 1 4 2c0-1 1-3 4-2c5 2 4 9-4 14z`}
        />
      ))}
    </svg>
  );
}

/** The puppy as a button: a tap shows hearts rising once and the "love" face for a moment, then it goes back to `mood`. */
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
      className={cn("relative shrink-0 cursor-pointer rounded-full", className)}
    >
      <Pup mood={petting ? "love" : mood} size={size} />
      {petting && <Hearts key={pets} />}
    </button>
  );
}

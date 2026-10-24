"use client";

import { useEffect } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import { EndPup } from "@/components/mascot/end-pup";
import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";

/** Reads the palette from the CSS variables, so confetti follows the theme and no hex lives here. */
function paletteColors() {
  const cs = getComputedStyle(document.documentElement);
  return ["--c-blue", "--c-coral", "--c-mint", "--c-sun", "--c-grape", "--c-pink", "--c-orange", "--c-teal"]
    .map((v) => cs.getPropertyValue(v).trim())
    .filter(Boolean);
}

/**
 * The one celebration of the app (REDESIGN_V2 §6.7): confetti once (about 1.2 s, in the palette, off with
 * reduced motion) and Bin beside the figure. `children` is the figure (a ring, a tile); without any,
 * Bin (or the check tile when Bin is off) is the figure.
 */
export function Celebration({
  mood = "cheer",
  confetti = true,
  size = 96,
  children,
  className,
}: {
  mood?: PupMood;
  confetti?: boolean;
  size?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const me = useOptionalMe();
  const mascot = me?.prefs.mascot !== false;

  useEffect(() => {
    if (!confetti || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    void import("canvas-confetti").then(({ default: fire }) => {
      if (cancelled) return;
      const colors = paletteColors();
      const base = { colors, disableForReducedMotion: true, ticks: 90, gravity: 1.1, scalar: 0.9 };
      void fire({ ...base, particleCount: 60, spread: 70, origin: { x: 0.5, y: 0.25 } });
      window.setTimeout(() => {
        if (!cancelled) void fire({ ...base, particleCount: 30, spread: 100, origin: { x: 0.5, y: 0.3 } });
      }, 250);
    });
    return () => {
      cancelled = true;
    };
  }, [confetti]);

  return (
    <div className={cn("relative mx-auto flex w-fit items-center justify-center", className)}>
      {children}
      {children ? (
        mascot && <EndPup mood={mood} size={Math.round(size * 0.8)} className="absolute -right-9 -bottom-2 self-auto" />
      ) : (
        <EndPup mood={mood} size={size} />
      )}
    </div>
  );
}

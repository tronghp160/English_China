"use client";

import { Flame } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";
import { COMBO_CHIP_FROM, comboLine, isComboHot, isComboMilestone } from "@/lib/combo";
import { cn } from "@/lib/utils";

/**
 * The flame chip of the session bar: shows from the third right answer in a row and pops in on every new
 * number. From combo 10 it turns solid sun and the flame grows (REDESIGN_V3 §3.6).
 */
export function ComboBadge({ combo, className }: { combo: number; className?: string }) {
  if (combo < COMBO_CHIP_FROM) return null;
  const hot = isComboHot(combo);
  return (
    <m.span
      key={combo}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 16 }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-extrabold tabular-nums",
        hot ? "bg-c-sun text-c-sun-on" : "bg-streak-soft text-streak-fg",
        className,
      )}
    >
      <Flame className={cn("fill-c-sun", hot ? "size-5" : "size-4")} aria-hidden />
      <span className="sr-only">Combo </span>×{combo}
    </m.span>
  );
}

/**
 * "Combo ×5! Tuyệt vời": slides in at the milestones for 1.3 s. The box is a polite live region from the
 * start, so a screen reader hears the banner when it appears.
 */
export function ComboBanner({ combo, className }: { combo: number; className?: string }) {
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!isComboMilestone(combo)) return;
    const show = requestAnimationFrame(() => setShown(combo));
    const hide = window.setTimeout(() => setShown(null), 1300);
    return () => {
      cancelAnimationFrame(show);
      window.clearTimeout(hide);
    };
  }, [combo]);

  return (
    <div role="status" aria-live="polite" className={cn("flex justify-center", className)}>
      <AnimatePresence>
        {shown !== null && (
          <m.div
            key={shown}
            initial={{ y: -24, opacity: 0, rotate: -2 }}
            animate={{ y: 0, opacity: 1, rotate: -2 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            className="inline-flex items-center gap-2 rounded-full bg-c-sun px-4 py-2 text-base font-extrabold text-c-sun-on shadow-md"
          >
            <Flame className="size-[1.125rem] fill-white" aria-hidden />
            Combo ×{shown}! {comboLine(shown)}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { m } from "motion/react";
import { cn } from "@/lib/utils";

/** Gives any box a press: it shrinks to 96% under the finger and springs back (REDESIGN_V3 §3.6). */
export function PressScale({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <m.div whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 520, damping: 22 }} className={cn(className)}>
      {children}
    </m.div>
  );
}

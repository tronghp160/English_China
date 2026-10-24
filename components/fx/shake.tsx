"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Shakes its box sideways (240 ms) each time `trigger` changes after the first render: a wrong answer, a form error. */
export function Shake({ trigger, className, children }: { trigger: unknown; className?: string; children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Drop the class for a frame so the animation restarts even when it is still running.
    const id = requestAnimationFrame(() => setOn(true));
    return () => {
      cancelAnimationFrame(id);
      setOn(false);
    };
  }, [trigger]);

  return (
    <div className={cn(on && "animate-shake", className)} onAnimationEnd={() => setOn(false)}>
      {children}
    </div>
  );
}

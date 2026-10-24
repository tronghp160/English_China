"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts up from 0 over 600 ms the first time it appears (REDESIGN_V2 §7).
 * The server render and the final value are the same number, and reduced motion skips the count.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const done = useRef(false);

  useEffect(() => {
    if (done.current || value <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    done.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className={className} aria-label={String(value)}>
      <span aria-hidden>{shown}</span>
    </span>
  );
}

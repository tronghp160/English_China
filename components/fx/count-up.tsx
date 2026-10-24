"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts to its value over `duration` ms (REDESIGN_V3 §3.6): from `from` the first time it
 * appears, from the figure on screen when the value changes later. The server render shows the final number
 * and reduced motion skips the count, so the text is always right.
 */
export function CountUp({
  value,
  from = 0,
  duration = 600,
  format,
  className,
}: {
  value: number;
  /** Where the first count starts. */
  from?: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  const first = useRef(true);

  useEffect(() => {
    const start = first.current ? from : current.current;
    first.current = false;
    if (start === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = value;
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      current.current = Math.round(start + (value - start) * (1 - (1 - t) ** 3));
      setShown(current.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, from, duration]);

  const text = format ?? String;
  return (
    <span className={className} aria-label={text(value)}>
      <span aria-hidden>{text(shown)}</span>
    </span>
  );
}

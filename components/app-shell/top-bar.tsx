"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky header on the paper. The bottom rule only appears once the page has scrolled
 * (an IntersectionObserver watches a 1px sentinel at the top, so no scroll listener runs).
 * Render it inside a `relative` wrapper that starts at the top of the page.
 */
export function TopBar({ children }: { children: React.ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute top-0 left-0 h-px w-full" />
      <header
        className={cn(
          "sticky top-0 z-30 border-b bg-canvas/92 backdrop-blur-sm transition-colors duration-[var(--dur-base)]",
          scrolled ? "border-border" : "border-transparent",
        )}
      >
        {children}
      </header>
    </>
  );
}

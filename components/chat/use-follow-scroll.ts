"use client";

import { useEffect, useRef } from "react";

/** Keeps the newest message in view while the answer streams, unless the reader scrolled up. */
export function useFollowScroll(
  dep: unknown,
  opts: { container?: React.RefObject<HTMLElement | null>; force?: boolean } = {},
): React.RefObject<HTMLDivElement | null> {
  const endRef = useRef<HTMLDivElement>(null);
  const { container, force } = opts;

  useEffect(() => {
    if (container) {
      const el = container.current;
      if (!el) return;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
      if (nearBottom || force) {
        const prefersReduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollTo({
          top: el.scrollHeight,
          behavior: prefersReduced ? "auto" : "smooth",
        });
      }
    } else {
      if (typeof window === "undefined") return;
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 240;
      if (nearBottom || force) {
        endRef.current?.scrollIntoView({ block: "end" });
      }
    }
  }, [dep, container, force]);

  return endRef;
}
